// Gemini API Client - handles communication with Google Gemini API

import { GeminiRequest, GeminiResponse, Location, PlaceResult, PlaceReview, GroundingMetadata, GroundingChunk, QuotaExceededError } from './types.ts';
import { GEMINI_API_BASE, GEMINI_MODEL, DEFAULT_SEARCH_RADIUS, MAX_SEARCH_RADIUS, MAPS_API_BASE, MIN_RESULTS_THRESHOLD, SEARCH_RADIUS_STEPS } from './constants.ts';
import { getTimeContext } from './utils.ts';
import { buildContextualPrompt } from './prompts/system-prompts.ts';
import { calculateDistance, filterAndSort, deduplicatePlaces } from './geo-utils.ts';
import { PlaceCacheManager } from './place-cache-manager.ts';
import { ApiCostTracker } from './api-cost-tracker.ts';

export class GeminiClient {
  private apiKey: string;
  private mapsApiKey: string;
  private cacheManager: PlaceCacheManager | null = null;
  private costTracker: ApiCostTracker | null = null;

  constructor(geminiApiKey: string, mapsApiKey: string, supabaseUrl?: string, supabaseKey?: string) {
    this.apiKey = geminiApiKey;
    this.mapsApiKey = mapsApiKey;
    
    // Initialize cache manager and cost tracker if Supabase credentials provided
    if (supabaseUrl && supabaseKey) {
      this.cacheManager = new PlaceCacheManager(supabaseUrl, supabaseKey);
      this.costTracker = new ApiCostTracker(supabaseUrl, supabaseKey);
      console.log('GeminiClient: Cache manager and cost tracker initialized');
    }
  }

  /**
   * Main search method - sends grounded request to Gemini
   */
  async search(request: GeminiRequest): Promise<GeminiResponse> {
    const userId = request.userId || 0;
    
    // If cost tracking enabled, check quotas and cache
    if (this.costTracker && this.cacheManager) {
      // 1. Check quota limits
      const quotaStatus = await this.costTracker.canMakeApiCall(userId, 'gemini');
      
      // 2. If quota exceeded, try to return from cache
      if (!quotaStatus.canProceed) {
        console.warn(`Quota exceeded for user ${userId}, checking cache...`);
        const cached = await this.cacheManager.getCachedSearchResults(request.query, request.location);
        
        if (cached) {
          await this.costTracker.logApiCall(userId, 'gemini', 'search', 0, true, true);
          throw new QuotaExceededError(
            quotaStatus.globalLimitReached ? 'global' : 'user',
            true
          );
        }
        
        // No cache available
        await this.costTracker.logApiCall(userId, 'gemini', 'search', 0, false, true);
        throw new QuotaExceededError(
          quotaStatus.globalLimitReached ? 'global' : 'user',
          false
        );
      }
      
      // 3. Check cache first (even if quota OK, to save costs)
      const cached = await this.cacheManager.getCachedSearchResults(request.query, request.location);
      if (cached) {
        console.log(`✓ Using cached search result for query: ${request.query}`);
        await this.costTracker.logApiCall(userId, 'gemini', 'search', 0, true, false);
        return cached;
      }
    }
    
    // 4. Make real API call
    const prompt = this.buildPrompt(request);
    
    try {
      const response = await this.callGeminiAPI(prompt, request.location);
      const result = this.parseResponse(response, request);
      
      // 5. Log and cache the result
      if (this.costTracker) {
        const cost = this.costTracker.estimateCost('search');
        await this.costTracker.logApiCall(userId, 'gemini', 'search', cost, false, false);
      }
      
      if (this.cacheManager) {
        await this.cacheManager.cacheSearchResults(request.query, request.location, result);
      }
      
      return result;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('Failed to get AI response');
    }
  }

  /**
   * Build system prompt with context
   */
  private buildPrompt(request: GeminiRequest): string {
    const timeContext = getTimeContext();
    const { query, context } = request;

    // Determine urgency level
    const urgency = this.detectUrgency(query);

    // Check if has conversation context
    const hasContext = !!(context?.last_query && context?.last_results);

    // Check if this is a route request
    const isRouteRequest = !!(request as any).isRouteRequest || false;

    // Build contextual prompt using improved prompt system
    // Gemini will handle intent recognition through improved prompts
    let systemPrompt = buildContextualPrompt(
      query,
      timeContext,
      urgency,
      hasContext,
      isRouteRequest
    );

    // Add previous conversation context if available
    if (hasContext) {
      systemPrompt += `\n\nПРЕДЫДУЩИЙ КОНТЕКСТ:`;
      systemPrompt += `\n- Запрос: "${context!.last_query}"`;
      systemPrompt += `\n- Найдено мест: ${context!.last_results!.length}`;
      
      // Add details about previous results
      context!.last_results!.forEach((place, index) => {
        systemPrompt += `\n  ${index + 1}. ${place.name}${place.rating ? ` (⭐${place.rating})` : ''}`;
      });
    }

    // Add user preferences if available
    if (context?.user_preferences) {
      const prefs = context.user_preferences;
      systemPrompt += `\n\nПРЕДПОЧТЕНИЯ ПОЛЬЗОВАТЕЛЯ:`;
      
      if (prefs.dietary_restrictions && prefs.dietary_restrictions.length > 0) {
        systemPrompt += `\n- Диета: ${prefs.dietary_restrictions.join(', ')}`;
      }
      if (prefs.preferred_transport_mode) {
        systemPrompt += `\n- Транспорт: ${prefs.preferred_transport_mode}`;
      }
      if (prefs.profile_notes) {
        systemPrompt += `\n- Заметки: ${prefs.profile_notes}`;
      }
    }

    return systemPrompt;
  }

  /**
   * Detect urgency level from query
   */
  private detectUrgency(query: string): 'high' | 'medium' | 'low' {
    const lowerQuery = query.toLowerCase();

    // High urgency keywords
    const urgentKeywords = [
      'срочно', 'быстро', 'сейчас', 'прямо сейчас',
      'заболел', 'болит', 'плохо',
      'аптек', 'лекарств',
      'банкомат', 'деньги', 'снять',
      'туалет',
    ];

    if (urgentKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'high';
    }

    // Low urgency (exploratory) keywords
    const exploratoryKeywords = [
      'что тут', 'покажи', 'есть ли',
      'интересн', 'погулять', 'посмотреть',
      'можно', 'вариант',
    ];

    if (exploratoryKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Call Gemini API
   */
  private async callGeminiAPI(prompt: string, location: Location): Promise<string> {
    const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${this.apiKey}`;

    // Build request with Google Maps grounding
    const payload = {
      contents: [{
        parts: [{
          text: prompt,
        }],
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      // Enable Google Maps grounding (supported in gemini-2.5-flash-lite)
      tools: [{ googleMaps: {} }],
      // Provide user location context for better results
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: location.lat,
            longitude: location.lon,
          },
        },
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Extract text from response
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.error('No text in Gemini response:', data);
        throw new Error('No text in Gemini response');
      }

      // Return both text and grounding metadata
      return JSON.stringify({
        text,
        groundingMetadata: data.candidates?.[0]?.groundingMetadata || null,
      });
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }

  /**
   * Parse Gemini response and extract places from Maps Grounding
   */
  private parseResponse(geminiResponseStr: string, request: GeminiRequest): GeminiResponse {
    try {
      // Parse the JSON response containing text and grounding metadata
      const parsed = JSON.parse(geminiResponseStr);
      let text = parsed.text;
      const groundingMetadata: GroundingMetadata = parsed.groundingMetadata || {};
      
      // Extract city from Gemini's response
      let extractedCity: string | null = null;
      const cityMatch = text.match(/^CITY:\s*(.+)$/m);
      
      if (cityMatch) {
        const cityValue = cityMatch[1].trim();
        extractedCity = cityValue === 'NONE' ? null : cityValue;
        
        // Remove CITY line from text
        text = text.replace(/^CITY:\s*.+\n*/m, '').trim();
        
        console.log(`Gemini extracted city: "${extractedCity}"`);
      }
      
      // Extract places from grounding chunks
      const places: PlaceResult[] = [];
      
      if (groundingMetadata.groundingChunks && groundingMetadata.groundingChunks.length > 0) {
        for (const chunk of groundingMetadata.groundingChunks) {
          if (chunk.maps) {
            console.log('Processing grounding chunk:', JSON.stringify(chunk.maps));
            
            // Extract place ID from different possible formats
            let placeId = chunk.maps.placeId;
            
            // Helper function to validate place_id
            const isValidPlaceId = (id: string | undefined): boolean => {
              if (!id) return false;
              // Reject temporary fake IDs created by our code
              if (id.startsWith('maps_')) return false;
              // Google Place ID should be at least 20 characters
              // Usually starts with ChIJ and is 23-27 characters long
              return id.length >= 20 && /^[A-Za-z0-9_-]+$/.test(id);
            };
            
            // Try to extract from URI if placeId is missing or invalid
            if (!isValidPlaceId(placeId) && chunk.maps.uri) {
              // Format 1: https://www.google.com/maps/place/?q=place_id:ChIJ...
              // Extract with length validation - stop at query params, slashes, or end of string
              const placeIdMatch1 = chunk.maps.uri.match(/place_id[:=]([A-Za-z0-9_-]{20,})(?:[&?/\s]|$)/);
              // Format 2: https://maps.google.com/?cid=12345
              const placeIdMatch2 = chunk.maps.uri.match(/cid=([0-9]+)/);
              // Format 3: Direct place ID in URL (ChIJ followed by alphanumeric characters)
              const placeIdMatch3 = chunk.maps.uri.match(/ChIJ[A-Za-z0-9_-]{19,}(?:[&?/\s]|$)/);
              
              const extractedId = placeIdMatch1?.[1] || placeIdMatch2?.[1] || placeIdMatch3?.[0];
              
              if (isValidPlaceId(extractedId)) {
                placeId = extractedId;
              }
            }
            
            // Validate final placeId before using
            const validPlaceId = isValidPlaceId(placeId) ? placeId : undefined;
            
            // Create place result with Maps URI for fallback
            // Don't create fake place_id - will use coordinates instead if needed
            if (chunk.maps.title) {
              const place: PlaceResult = {
                place_id: validPlaceId, // undefined if not valid - will use coordinates
                name: chunk.maps.title,
                address: chunk.maps.address,
                // Store Maps URI for navigation fallback
                maps_uri: chunk.maps.uri,
              };
              
              // Enhanced logging for debugging
              console.log(`Extracted place: ${place.name}`);
              console.log(`  - place_id: ${place.place_id || 'undefined (will use coordinates)'}`);
              console.log(`  - place_id valid: ${!!validPlaceId}`);
              console.log(`  - Original URI: ${chunk.maps.uri}`);
              console.log(`  - Address: ${place.address || 'N/A'}`);
              
              places.push(place);
            }
          }
        }
      }
      
      // Sort by confidence score or keep original order from Grounding
      // (Grounding already provides relevant results in order)
      
      // Limit to top 5 places
      const topPlaces = places.slice(0, 5);
      
      return {
        text,
        places: topPlaces,
        intent: this.extractIntent(text),
        groundingMetadata,
        extractedCity,
      };
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      // Fallback to old approach
      return {
        text: geminiResponseStr,
        places: [],
        intent: this.extractIntent(geminiResponseStr),
        extractedCity: null,
      };
    }
  }

  /**
   * Extract intent from Gemini response
   */
  private extractIntent(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('аптек') || lowerText.includes('лекарств')) {
      return 'pharmacy';
    }
    if (lowerText.includes('кафе') || lowerText.includes('ресторан') || lowerText.includes('еда')) {
      return 'food';
    }
    if (lowerText.includes('банкомат') || lowerText.includes('банк')) {
      return 'atm';
    }
    if (lowerText.includes('магазин') || lowerText.includes('купить')) {
      return 'store';
    }
    
    return 'general';
  }

  /**
   * Smart search places with adaptive radius and geographic filtering
   * Uses combination of Nearby Search and Text Search for optimal results
   */
  async searchPlaces(
    query: string,
    location: Location,
    initialRadius = DEFAULT_SEARCH_RADIUS,
    maxResults = 20, // Increased from 5 to 20 for caching
    excludePlaceIds: string[] = [] // Place IDs to exclude from results
  ): Promise<PlaceResult[]> {
    // Try Nearby Search first (strict radius)
    try {
      const nearbyResults = await this.nearbySearch(query, location, initialRadius);
      if (nearbyResults.length >= MIN_RESULTS_THRESHOLD) {
        console.log(`Found ${nearbyResults.length} places with Nearby Search`);
        const filtered = filterAndSort(nearbyResults, location, MAX_SEARCH_RADIUS);
        // Exclude already shown places
        const notShown = filtered.filter(p => p.place_id && !excludePlaceIds.includes(p.place_id));
        return notShown.slice(0, maxResults);
      }
    } catch (error) {
      console.log('Nearby Search failed, falling back to Text Search:', error);
    }

    // Fallback to Text Search with expanding radius
    let allResults: PlaceResult[] = [];
    
    for (const radius of SEARCH_RADIUS_STEPS) {
      try {
        const textResults = await this.textSearch(query, location, radius);
        
        // Calculate distances for all results
        const resultsWithDistance = textResults.map(place => {
          let distance = place.distance;
          
          // Calculate distance if not already set
          if (distance === undefined && place.geometry?.location) {
            distance = calculateDistance(location, {
              lat: place.geometry.location.lat,
              lon: place.geometry.location.lng,
            });
          }
          
          // Ensure geometry is preserved
          return { ...place, distance, geometry: place.geometry };
        });
        
        allResults = [...allResults, ...resultsWithDistance];
        
        // Deduplicate before filtering
        allResults = deduplicatePlaces(allResults);
        
        // Filter strictly by MAX_SEARCH_RADIUS
        const filtered = filterAndSort(allResults, location, MAX_SEARCH_RADIUS);
        
        // Exclude already shown places
        const notShown = filtered.filter(p => p.place_id && !excludePlaceIds.includes(p.place_id));
        
        if (notShown.length >= maxResults) {
          console.log(`Found ${notShown.length} places with Text Search at radius ${radius}m`);
          return notShown.slice(0, maxResults);
        }
      } catch (error) {
        console.log(`Text Search failed for radius ${radius}:`, error);
      }
    }

    // Return what we found, strictly filtered and deduplicated
    const deduplicated = deduplicatePlaces(allResults);
    const filtered = filterAndSort(deduplicated, location, MAX_SEARCH_RADIUS);
    // Exclude already shown places
    const notShown = filtered.filter(p => p.place_id && !excludePlaceIds.includes(p.place_id));
    console.log(`Returning ${notShown.length} filtered and deduplicated results (excluded ${excludePlaceIds.length} shown places)`);
    return notShown.slice(0, maxResults);
  }

  /**
   * Nearby Search - strict radius-based search
   */
  private async nearbySearch(
    query: string,
    location: Location,
    radius: number
  ): Promise<PlaceResult[]> {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    
    const params = new URLSearchParams({
      location: `${location.lat},${location.lon}`,
      radius: radius.toString(),
      keyword: query,
      language: 'ru',
      key: this.mapsApiKey,
    });

    const response = await fetch(`${url}?${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to search nearby places');
    }

    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Nearby Search API error:', data);
      throw new Error(`Nearby Search API error: ${data.status}`);
    }

    // Transform results with distance
    return (data.results || []).map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      price_level: place.price_level,
      is_open: place.opening_hours?.open_now,
      geometry: place.geometry, // Store geometry for directions
      types: place.types || [],
      distance: calculateDistance(location, {
        lat: place.geometry.location.lat,
        lon: place.geometry.location.lng,
      }),
    }));
  }

  /**
   * Text Search - flexible search by text
   */
  private async textSearch(
    query: string,
    location: Location,
    radius: number
  ): Promise<PlaceResult[]> {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
    
    const params = new URLSearchParams({
      query,
      location: `${location.lat},${location.lon}`,
      radius: radius.toString(),
      language: 'ru',
      key: this.mapsApiKey,
    });

    const response = await fetch(`${url}?${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to search places');
    }

    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Text Search API error:', data);
      throw new Error(`Text Search API error: ${data.status}`);
    }

    // Transform results
    return (data.results || []).map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      price_level: place.price_level,
      is_open: place.opening_hours?.open_now,
      geometry: place.geometry, // Store geometry for directions
      types: place.types || [],
    }));
  }

  /**
   * Extract coordinates from Google Maps URI
   * Supports formats: 
   * - https://www.google.com/maps/place/?q=place_id:...
   * - https://maps.google.com/?q=lat,lng
   * - https://www.google.com/maps/@lat,lng,zoom
   */
  private extractCoordsFromUri(mapsUri: string): Location | null {
    try {
      // Format 1: @lat,lng,zoom
      const coordsMatch1 = mapsUri.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordsMatch1) {
        return { lat: parseFloat(coordsMatch1[1]), lon: parseFloat(coordsMatch1[2]) };
      }
      
      // Format 2: ?q=lat,lng
      const coordsMatch2 = mapsUri.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordsMatch2) {
        return { lat: parseFloat(coordsMatch2[1]), lon: parseFloat(coordsMatch2[2]) };
      }
      
      console.log(`Could not extract coordinates from URI: ${mapsUri}`);
      return null;
    } catch (error) {
      console.error('Error extracting coordinates from URI:', error);
      return null;
    }
  }

  /**
   * Simplified text search for place_id resolution (single result)
   */
  private async textSearchSimple(query: string): Promise<PlaceResult[]> {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
    
    const params = new URLSearchParams({
      query,
      language: 'ru',
      key: this.mapsApiKey,
    });

    const response = await fetch(`${url}?${params}`);
    
    if (!response.ok) {
      console.error('Text search simple failed:', response.status);
      return [];
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.log('Text search simple returned:', data.status);
      return [];
    }

    return (data.results || []).slice(0, 1).map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      geometry: place.geometry,
    }));
  }

  /**
   * Simplified nearby search for place_id resolution by name and location
   */
  private async nearbySearchSimple(name: string, location: Location): Promise<PlaceResult[]> {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    
    const params = new URLSearchParams({
      location: `${location.lat},${location.lon}`,
      radius: '100', // Very tight radius since we have exact coords
      keyword: name,
      language: 'ru',
      key: this.mapsApiKey,
    });

    const response = await fetch(`${url}?${params}`);
    
    if (!response.ok) {
      console.error('Nearby search simple failed:', response.status);
      return [];
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.log('Nearby search simple returned:', data.status);
      return [];
    }

    return (data.results || []).slice(0, 1).map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      geometry: place.geometry,
    }));
  }

  /**
   * Try to resolve valid place_id from Grounding data
   * Uses Text Search and Nearby Search to find the actual place
   */
  async resolvePlaceId(name: string, address?: string, mapsUri?: string): Promise<string | null> {
    console.log(`Resolving place_id for: "${name}", address: "${address}", uri: "${mapsUri}"`);
    
    // 1. Try Text Search by name and address
    if (name && address) {
      const query = `${name} ${address}`;
      console.log(`Trying Text Search with query: "${query}"`);
      
      try {
        const textResults = await this.textSearchSimple(query);
        if (textResults[0]?.place_id) {
          console.log(`✓ Found place_id via Text Search: ${textResults[0].place_id}`);
          return textResults[0].place_id;
        }
      } catch (error) {
        console.error('Text Search failed:', error);
      }
    }
    
    // 2. Try to extract coordinates from maps_uri and use Nearby Search
    if (mapsUri) {
      const coords = this.extractCoordsFromUri(mapsUri);
      if (coords) {
        console.log(`Extracted coords from URI: ${coords.lat}, ${coords.lon}`);
        console.log(`Trying Nearby Search with name: "${name}"`);
        
        try {
          const nearbyResults = await this.nearbySearchSimple(name, coords);
          if (nearbyResults[0]?.place_id) {
            console.log(`✓ Found place_id via Nearby Search: ${nearbyResults[0].place_id}`);
            return nearbyResults[0].place_id;
          }
        } catch (error) {
          console.error('Nearby Search failed:', error);
        }
      }
    }
    
    // 3. Last resort: try Text Search with just the name
    if (name) {
      console.log(`Last resort: Text Search with name only: "${name}"`);
      
      try {
        const textResults = await this.textSearchSimple(name);
        if (textResults[0]?.place_id) {
          console.log(`✓ Found place_id via Text Search (name only): ${textResults[0].place_id}`);
          return textResults[0].place_id;
        }
      } catch (error) {
        console.error('Text Search (name only) failed:', error);
      }
    }
    
    console.log(`✗ Could not resolve place_id for "${name}"`);
    return null;
  }

  /**
   * Get place details by Place ID
   */
  async getPlaceDetails(placeId: string, includeReviews = false): Promise<PlaceResult> {
    console.log(`getPlaceDetails: placeId=${placeId}, includeReviews=${includeReviews}`);
    
    // Try to get from cache first (only for non-review requests)
    if (!includeReviews && this.cacheManager) {
      const cached = await this.cacheManager.getCachedPlace(placeId);
      if (cached) {
        console.log(`✓ Using cached data for place ${placeId}`);
        return cached;
      }
    }
    
    const url = `https://maps.googleapis.com/maps/api/place/details/json`;
    
    const fields = includeReviews 
      ? 'name,formatted_address,rating,price_level,opening_hours,geometry,formatted_phone_number,reviews,photos,types'
      : 'name,formatted_address,rating,price_level,opening_hours,geometry,formatted_phone_number,types';
    
    const params = new URLSearchParams({
      place_id: placeId,
      fields,
      language: 'ru',
      key: this.mapsApiKey,
    });

    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Places API HTTP error (${response.status}):`, errorText);
      throw new Error(`Places API HTTP error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Places API response status:', data.status);

    // Обработка различных статусов
    if (data.status === 'INVALID_REQUEST') {
      console.error('INVALID_REQUEST - trying without reviews/photos');
      
      // Если запрос с отзывами не работает, попробуем без них
      if (includeReviews) {
        console.log('Retrying without reviews/photos...');
        return await this.getPlaceDetails(placeId, false);
      }
      
      throw new Error(`Place details error: ${data.status}`);
    }

    if (data.status === 'NOT_FOUND') {
      throw new Error('Место не найдено или удалено');
    }

    if (data.status !== 'OK') {
      console.error('Places API error:', data);
      throw new Error(`Place details error: ${data.status}`);
    }

    const place = data.result;
    
    if (!place) {
      throw new Error('No place data in response');
    }

    // Build result
    const result: PlaceResult = {
      place_id: placeId,
      name: place.name || 'Без названия',
      address: place.formatted_address,
      rating: place.rating,
      price_level: place.price_level,
      is_open: place.opening_hours?.open_now,
      geometry: place.geometry ? {
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        }
      } : undefined,
      types: place.types || [],
    };

    // Process reviews if requested AND available
    if (includeReviews) {
      if (place.reviews && Array.isArray(place.reviews) && place.reviews.length > 0) {
        console.log(`Processing ${place.reviews.length} reviews...`);
        try {
          result.reviews = await this.processReviews(place.reviews);
          console.log(`Processed ${result.reviews.length} reviews`);
        } catch (reviewError) {
          console.error('Failed to process reviews:', reviewError);
          result.reviews = [];
        }
      } else {
        console.log('No reviews available from API');
        result.reviews = [];
      }
      
      // Process photos
      if (place.photos && Array.isArray(place.photos) && place.photos.length > 0) {
        console.log(`Processing ${place.photos.length} photos...`);
        result.photos = place.photos.slice(0, 5).map((photo: any) => ({
          photo_reference: photo.photo_reference,
          width: photo.width,
          height: photo.height,
        }));
      } else {
        console.log('No photos available from API');
        result.photos = [];
      }
    }

    // Cache the result (only for non-review requests to keep cache clean)
    if (!includeReviews && this.cacheManager) {
      await this.cacheManager.cachePlace(result);
    }

    return result;
  }

  /**
   * Process reviews: categorize by sentiment and translate to Russian
   */
  private async processReviews(reviews: any[]): Promise<PlaceReview[]> {
    // Categorize reviews by sentiment based on rating
    const categorized: {
      negative: PlaceReview[];
      neutral: PlaceReview[];
      positive: PlaceReview[];
    } = {
      negative: [],
      neutral: [],
      positive: [],
    };

    for (const review of reviews) {
      if (!review.text) continue;

      const rating = review.rating;
      let sentiment: 'positive' | 'negative' | 'neutral';
      
      if (rating <= 2) {
        sentiment = 'negative';
      } else if (rating === 3) {
        sentiment = 'neutral';
      } else {
        sentiment = 'positive';
      }

      categorized[sentiment].push({
        author_name: review.author_name,
        rating: rating,
        text: review.text,
        time: review.time,
        sentiment,
      });
    }

    // Select up to 2 negative, 2 positive, 1 neutral
    const selected: PlaceReview[] = [];
    
    selected.push(...categorized.negative.slice(0, 2));
    selected.push(...categorized.positive.slice(0, 2));
    selected.push(...categorized.neutral.slice(0, 1));

    // Translate reviews to Russian using Gemini
    const translated = await Promise.all(
      selected.map(async (review) => {
        try {
          const translatedText = await this.translateText(review.text);
          return { ...review, translated_text: translatedText };
        } catch (error) {
          console.error('Translation failed for review:', error);
          return review;
        }
      })
    );

    return translated.slice(0, 5); // Max 5 reviews
  }

  /**
   * Translate text to Russian using Gemini
   */
  private async translateText(text: string): Promise<string> {
    const prompt = `Переведи на русский язык следующий отзыв о заведении, сохраняя смысл и тон:\n\n"${text}"`;
    
    const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || text;
  }

  /**
   * Get photo URL from photo reference
   */
  getPhotoUrl(photoReference: string, maxWidth = 800): string {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${this.mapsApiKey}`;
  }

  /**
   * Geocode city name to coordinates using Google Maps Geocoding API
   * Returns location (lat/lon) or null if city not found
   * Universal approach: works for cities worldwide, not just Russia
   */
  async geocodeCity(cityName: string, userId = 0): Promise<Location | null> {
    // Check cache first (geocoding cache is long-term)
    if (this.cacheManager) {
      const cached = await this.cacheManager.getCachedGeocode(cityName);
      if (cached) {
        console.log(`✓ Using cached geocoding for city: ${cityName}`);
        if (this.costTracker) {
          await this.costTracker.logApiCall(userId, 'google_maps', 'geocode', 0, true, false);
        }
        return cached;
      }
    }
    
    // Check quota if tracking enabled
    if (this.costTracker) {
      const quotaStatus = await this.costTracker.canMakeApiCall(userId, 'google_maps');
      if (!quotaStatus.canProceed) {
        console.warn(`Quota exceeded for geocoding, user ${userId}`);
        // For geocoding, we don't throw error - just return null
        await this.costTracker.logApiCall(userId, 'google_maps', 'geocode', 0, false, true);
        return null;
      }
    }
    
    try {
      // Step 1: Try without country restriction first (для международных городов)
      console.log(`Geocoding city (universal): "${cityName}"`);
      
      const universalUrl = `${MAPS_API_BASE}/geocode/json?address=${encodeURIComponent(cityName)}&key=${this.mapsApiKey}&language=ru`;
      
      const response1 = await fetch(universalUrl);
      
      if (response1.ok) {
        const data1 = await response1.json();
        
        if (data1.status === 'OK' && data1.results && data1.results.length > 0) {
          // Filter for city/locality results if possible
          const cityResults = data1.results.filter((r: any) => 
            r.types.some((t: string) => ['locality', 'administrative_area_level_1', 'political'].includes(t))
          );
          
          const bestResult = cityResults.length > 0 ? cityResults[0] : data1.results[0];
          const location = bestResult.geometry.location;
          
          console.log(`City geocoded successfully (universal): "${cityName}" -> ${location.lat}, ${location.lng}`);
          const result = {
            lat: location.lat,
            lon: location.lng,
          };
          
          // Log and cache the result
          if (this.costTracker) {
            const cost = this.costTracker.estimateCost('geocode');
            await this.costTracker.logApiCall(userId, 'google_maps', 'geocode', cost, false, false);
          }
          if (this.cacheManager) {
            await this.cacheManager.cacheGeocode(cityName, result);
          }
          
          return result;
        }
      }
      
      // Step 2: If not found, and looks like Russian city, try with "Россия"
      if (this.looksLikeRussianCity(cityName)) {
        console.log(`Trying with Russia restriction: "${cityName}"`);
        const russianQuery = encodeURIComponent(`${cityName}, Россия`);
        const russianUrl = `${MAPS_API_BASE}/geocode/json?address=${russianQuery}&key=${this.mapsApiKey}&language=ru`;
        
        const response2 = await fetch(russianUrl);
        
        if (response2.ok) {
          const data2 = await response2.json();
          
          if (data2.status === 'OK' && data2.results && data2.results.length > 0) {
            const location = data2.results[0].geometry.location;
            console.log(`City geocoded with Russia: "${cityName}" -> ${location.lat}, ${location.lng}`);
            const result = {
              lat: location.lat,
              lon: location.lng,
            };
            
            // Log and cache the result
            if (this.costTracker) {
              const cost = this.costTracker.estimateCost('geocode');
              await this.costTracker.logApiCall(userId, 'google_maps', 'geocode', cost, false, false);
            }
            if (this.cacheManager) {
              await this.cacheManager.cacheGeocode(cityName, result);
            }
            
            return result;
          }
        }
      }
      
      console.warn(`City not found: "${cityName}"`);
      return null;
    } catch (error) {
      console.error(`Geocoding error for "${cityName}":`, error);
      return null;
    }
  }

  /**
   * Check if city name looks like Russian (uses Cyrillic)
   */
  private looksLikeRussianCity(cityName: string): boolean {
    return /[а-яА-ЯёЁ]/.test(cityName);
  }

  /**
   * Fallback search using Google Places API Nearby Search
   * Used when Gemini doesn't return any places
   */
  async searchNearbyPlaces(
    location: Location,
    query: string,
    maxResults: number = 5,
    radius: number = 5000
  ): Promise<PlaceResult[]> {
    try {
      // Determine place type from query
      const type = this.inferPlaceType(query);
      
      const url = `${MAPS_API_BASE}/place/nearbysearch/json?` +
        `location=${location.lat},${location.lon}` +
        `&radius=${radius}` +
        (type ? `&type=${type}` : '') +
        `&key=${this.mapsApiKey}` +
        `&language=ru`;
      
      console.log(`Fallback to Places API: type=${type}, radius=${radius}m`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Places API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.log(`Places API returned no results: ${data.status}`);
        return [];
      }
      
      // Convert to PlaceResult format
      const places: PlaceResult[] = data.results.slice(0, maxResults).map((result: any) => ({
        place_id: result.place_id,
        name: result.name,
        address: result.vicinity,
        rating: result.rating,
        is_open: result.opening_hours?.open_now,
        geometry: {
          location: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
          },
        },
        types: result.types || [],
        distance: this.calculateDistanceInternal(location, {
          lat: result.geometry.location.lat,
          lon: result.geometry.location.lng,
        }),
      }));
      
      console.log(`Places API found ${places.length} places`);
      return places;
      
    } catch (error) {
      console.error('Places API fallback failed:', error);
      return [];
    }
  }

  /**
   * Infer Google Places type from user query
   */
  private inferPlaceType(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    
    // Food & Drinks
    if (/кафе|coffee|кофе/.test(lowerQuery)) return 'cafe';
    if (/ресторан|restaurant|поесть|еда/.test(lowerQuery)) return 'restaurant';
    if (/бар|pub|паб/.test(lowerQuery)) return 'bar';
    
    // Shopping
    if (/магазин|shop|store/.test(lowerQuery)) return 'store';
    if (/супермаркет|supermarket/.test(lowerQuery)) return 'supermarket';
    
    // Health
    if (/аптек|pharmacy/.test(lowerQuery)) return 'pharmacy';
    if (/больниц|hospital/.test(lowerQuery)) return 'hospital';
    
    // Finance
    if (/банк|bank|атм|atm|банкомат/.test(lowerQuery)) return 'bank';
    
    // Entertainment & Tourism
    if (/парк|park|погулять/.test(lowerQuery)) return 'park';
    if (/музей|museum/.test(lowerQuery)) return 'museum';
    if (/кино|cinema|movie/.test(lowerQuery)) return 'movie_theater';
    
    // For route/sightseeing queries, prioritize tourist attractions
    if (/маршрут|что посмотреть|достопримечательност|tourist|туристическ|интересные места/.test(lowerQuery)) return 'tourist_attraction';
    
    return null; // No specific type, search all
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistanceInternal(point1: Location, point2: Location): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lon - point1.lon) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }
}

