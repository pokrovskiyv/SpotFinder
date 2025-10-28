// Gemini API Client - handles communication with Google Gemini API

import { GeminiRequest, GeminiResponse, Location, PlaceResult, PlaceReview, GroundingMetadata, GroundingChunk } from './types.ts';
import { GEMINI_API_BASE, GEMINI_MODEL, DEFAULT_SEARCH_RADIUS, MAX_SEARCH_RADIUS } from './constants.ts';
import { getTimeContext } from './utils.ts';
import { buildContextualPrompt } from './prompts/system-prompts.ts';
import { calculateDistance } from './geo-utils.ts';

export class GeminiClient {
  private apiKey: string;
  private mapsApiKey: string;

  constructor(geminiApiKey: string, mapsApiKey: string) {
    this.apiKey = geminiApiKey;
    this.mapsApiKey = mapsApiKey;
  }

  /**
   * Main search method - sends grounded request to Gemini
   */
  async search(request: GeminiRequest): Promise<GeminiResponse> {
    const prompt = this.buildPrompt(request);
    
    try {
      const response = await this.callGeminiAPI(prompt, request.location);
      return this.parseResponse(response, request);
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

    // Build contextual prompt using improved prompt system
    let systemPrompt = buildContextualPrompt(
      query,
      timeContext,
      urgency,
      hasContext
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
      // Enable Google Maps grounding (supported in gemini-2.0-flash-lite)
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
      const text = parsed.text;
      const groundingMetadata: GroundingMetadata = parsed.groundingMetadata || {};
      
      // Extract places from grounding chunks
      const places: PlaceResult[] = [];
      
      if (groundingMetadata.groundingChunks && groundingMetadata.groundingChunks.length > 0) {
        for (const chunk of groundingMetadata.groundingChunks) {
          if (chunk.maps) {
            console.log('Processing grounding chunk:', JSON.stringify(chunk.maps));
            
            // Extract place ID from different possible formats
            let placeId = chunk.maps.placeId;
            
            // Try to extract from URI
            if (!placeId && chunk.maps.uri) {
              // Format 1: https://www.google.com/maps/place/?q=place_id:ChIJ...
              const placeIdMatch1 = chunk.maps.uri.match(/place_id[:=]([A-Za-z0-9_-]+)/);
              // Format 2: https://maps.google.com/?cid=12345
              const placeIdMatch2 = chunk.maps.uri.match(/cid=([0-9]+)/);
              // Format 3: Direct place ID in URL
              const placeIdMatch3 = chunk.maps.uri.match(/ChIJ[A-Za-z0-9_-]+/);
              
              placeId = placeIdMatch1?.[1] || placeIdMatch2?.[1] || placeIdMatch3?.[0];
            }
            
            // Create place result with Maps URI for fallback
            if (chunk.maps.title) {
              const place: PlaceResult = {
                place_id: placeId || `maps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: chunk.maps.title,
                address: chunk.maps.address,
                // Store Maps URI for navigation fallback
                maps_uri: chunk.maps.uri,
              };
              
              console.log(`Extracted place: ${place.name}, place_id: ${place.place_id}, uri: ${place.maps_uri}`);
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
      };
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      // Fallback to old approach
      return {
        text: geminiResponseStr,
        places: [],
        intent: this.extractIntent(geminiResponseStr),
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
    initialRadius = DEFAULT_SEARCH_RADIUS
  ): Promise<PlaceResult[]> {
    // Try Nearby Search first (strict radius)
    try {
      const nearbyResults = await this.nearbySearch(query, location, initialRadius);
      if (nearbyResults.length >= MIN_RESULTS_THRESHOLD) {
        console.log(`Found ${nearbyResults.length} places with Nearby Search`);
        return filterAndSort(nearbyResults, location, MAX_SEARCH_RADIUS).slice(0, 5);
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
        
        if (filtered.length >= 5) {
          console.log(`Found ${filtered.length} places with Text Search at radius ${radius}m`);
          return filtered.slice(0, 5);
        }
      } catch (error) {
        console.log(`Text Search failed for radius ${radius}:`, error);
      }
    }

    // Return what we found, strictly filtered and deduplicated
    const deduplicated = deduplicatePlaces(allResults);
    const filtered = filterAndSort(deduplicated, location, MAX_SEARCH_RADIUS);
    console.log(`Returning ${filtered.length} filtered and deduplicated results`);
    return filtered.slice(0, 5);
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
    
    const url = `https://maps.googleapis.com/maps/api/place/details/json`;
    
    const fields = includeReviews 
      ? 'name,formatted_address,rating,price_level,opening_hours,geometry,formatted_phone_number,reviews,photos'
      : 'name,formatted_address,rating,price_level,opening_hours,geometry,formatted_phone_number';
    
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
}

