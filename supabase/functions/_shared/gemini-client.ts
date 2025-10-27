// Gemini API Client - handles communication with Google Gemini API

import { GeminiRequest, GeminiResponse, Location, PlaceResult, PlaceReview } from './types.ts';
import { GEMINI_API_BASE, GEMINI_MODEL, DEFAULT_SEARCH_RADIUS, MAX_SEARCH_RADIUS, SEARCH_RADIUS_STEPS, MIN_RESULTS_THRESHOLD } from './constants.ts';
import { getTimeContext } from './utils.ts';
import { buildContextualPrompt } from './prompts/system-prompts.ts';
import { calculateDistance, filterAndSort, deduplicatePlaces } from './geo-utils.ts';

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

      return text;
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }

  /**
   * Parse Gemini response and extract places
   */
  private parseResponse(geminiText: string, request: GeminiRequest): GeminiResponse {
    // For now, we'll use a simplified approach
    // In production, you'd want to call Google Places API separately
    // based on what Gemini suggests
    
    return {
      text: geminiText,
      places: [], // Will be populated by searchPlaces method
      intent: this.extractIntent(geminiText),
    };
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
          
          return { ...place, distance };
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
      distance: calculateDistance(location, {
        lat: place.geometry.location.lat,
        lon: place.geometry.location.lng,
      }),
      geometry: place.geometry, // Store for distance calculation later
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
      geometry: place.geometry, // Store for distance calculation
    }));
  }

  /**
   * Get place details by Place ID
   */
  async getPlaceDetails(placeId: string, includeReviews = false): Promise<PlaceResult> {
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
      throw new Error('Failed to get place details');
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Place details error: ${data.status}`);
    }

    const place = data.result;
    const result: PlaceResult = {
      place_id: placeId,
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      price_level: place.price_level,
      is_open: place.opening_hours?.open_now,
    };

    // Process reviews if requested
    if (includeReviews && place.reviews) {
      result.reviews = await this.processReviews(place.reviews);
    }

    // Process photos (limit to 5)
    if (place.photos) {
      result.photos = place.photos.slice(0, 5).map((photo: any) => ({
        photo_reference: photo.photo_reference,
        width: photo.width,
        height: photo.height,
      }));
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

