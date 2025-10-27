// Mock for Google Maps Places API

export interface MapsMockResponse {
  results?: Array<{
    place_id: string;
    name: string;
    formatted_address: string;
    rating?: number;
    price_level?: number;
    opening_hours?: {
      open_now: boolean;
    };
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    types: string[];
  }>;
  status: string;
  error_message?: string;
}

export interface MapsMockRequest {
  method: string;
  params: Record<string, any>;
}

/**
 * Mock Google Maps Places API client for testing
 */
export class MapsMock {
  private responses: Map<string, MapsMockResponse> = new Map();
  private errors: Map<string, Error> = new Map();
  private requestLog: Array<{ request: MapsMockRequest; response: MapsMockResponse | Error }> = [];

  /**
   * Set mock response for a specific request pattern
   */
  setMockResponse(requestPattern: string, response: MapsMockResponse): void {
    this.responses.set(requestPattern, response);
  }

  /**
   * Set mock error for a specific request pattern
   */
  setMockError(requestPattern: string, error: Error): void {
    this.errors.set(requestPattern, error);
  }

  /**
   * Clear all mocks
   */
  clearMocks(): void {
    this.responses.clear();
    this.errors.clear();
    this.requestLog = [];
  }

  /**
   * Get request log for verification
   */
  getRequestLog(): Array<{ request: MapsMockRequest; response: MapsMockResponse | Error }> {
    return [...this.requestLog];
  }

  /**
   * Mock text search
   */
  async textSearch(query: string, location?: string, radius?: number): Promise<MapsMockResponse> {
    const request: MapsMockRequest = {
      method: 'textSearch',
      params: { query, location, radius }
    };

    return this.mockRequest(request);
  }

  /**
   * Mock nearby search
   */
  async nearbySearch(location: string, radius: number, type?: string): Promise<MapsMockResponse> {
    const request: MapsMockRequest = {
      method: 'nearbySearch',
      params: { location, radius, type }
    };

    return this.mockRequest(request);
  }

  /**
   * Mock place details
   */
  async placeDetails(placeId: string, fields?: string[]): Promise<MapsMockResponse> {
    const request: MapsMockRequest = {
      method: 'placeDetails',
      params: { place_id: placeId, fields }
    };

    return this.mockRequest(request);
  }

  /**
   * Generic request handler
   */
  private async mockRequest(request: MapsMockRequest): Promise<MapsMockResponse> {
    const requestKey = this.generateRequestKey(request);
    
    // Log the request
    let response: MapsMockResponse | Error;
    
    if (this.errors.has(requestKey)) {
      response = this.errors.get(requestKey)!;
      this.requestLog.push({ request, response });
      throw response;
    }

    if (this.responses.has(requestKey)) {
      response = this.responses.get(requestKey)!;
    } else {
      // Default response based on request method
      response = this.generateDefaultResponse(request);
    }

    this.requestLog.push({ request, response });
    return response;
  }

  /**
   * Generate a key for request matching
   */
  private generateRequestKey(request: MapsMockRequest): string {
    const method = request.method;
    const params = request.params;
    
    if (method === 'textSearch') {
      return `text_${params.query}_${params.location || 'no_location'}`;
    } else if (method === 'nearbySearch') {
      return `nearby_${params.type || 'all'}_${params.location}`;
    } else if (method === 'placeDetails') {
      return `details_${params.place_id}`;
    }
    
    return `${method}_${JSON.stringify(params)}`;
  }

  /**
   * Generate default response based on request method
   */
  private generateDefaultResponse(request: MapsMockRequest): MapsMockResponse {
    const method = request.method;
    const params = request.params;

    if (method === 'textSearch') {
      return MapsMockResponses.restaurantSearch();
    } else if (method === 'nearbySearch') {
      return MapsMockResponses.nearbySearch();
    } else if (method === 'placeDetails') {
      return MapsMockResponses.placeDetails();
    }

    return MapsMockResponses.success();
  }
}

/**
 * Predefined mock responses for common Maps API operations
 */
export class MapsMockResponses {
  /**
   * Successful restaurant search
   */
  static restaurantSearch(): MapsMockResponse {
    return {
      results: [
        {
          place_id: 'restaurant_1',
          name: 'Test Restaurant 1',
          formatted_address: 'Test Street 1, Moscow',
          rating: 4.5,
          price_level: 2,
          opening_hours: { open_now: true },
          geometry: {
            location: { lat: 55.7558, lng: 37.6176 }
          },
          types: ['restaurant', 'food', 'establishment']
        },
        {
          place_id: 'restaurant_2',
          name: 'Test Restaurant 2',
          formatted_address: 'Test Street 2, Moscow',
          rating: 4.2,
          price_level: 3,
          opening_hours: { open_now: false },
          geometry: {
            location: { lat: 55.7658, lng: 37.6276 }
          },
          types: ['restaurant', 'food', 'establishment']
        }
      ],
      status: 'OK'
    };
  }

  /**
   * Successful pharmacy search
   */
  static pharmacySearch(): MapsMockResponse {
    return {
      results: [
        {
          place_id: 'pharmacy_1',
          name: 'Test Pharmacy 1',
          formatted_address: 'Pharmacy Street 1, Moscow',
          rating: 4.8,
          opening_hours: { open_now: true },
          geometry: {
            location: { lat: 55.7558, lng: 37.6176 }
          },
          types: ['pharmacy', 'health', 'establishment']
        }
      ],
      status: 'OK'
    };
  }

  /**
   * Successful nearby search
   */
  static nearbySearch(): MapsMockResponse {
    return {
      results: [
        {
          place_id: 'nearby_1',
          name: 'Nearby Place 1',
          formatted_address: 'Nearby Street 1, Moscow',
          rating: 4.0,
          price_level: 1,
          opening_hours: { open_now: true },
          geometry: {
            location: { lat: 55.7558, lng: 37.6176 }
          },
          types: ['restaurant', 'food', 'establishment']
        },
        {
          place_id: 'nearby_2',
          name: 'Nearby Place 2',
          formatted_address: 'Nearby Street 2, Moscow',
          rating: 3.8,
          price_level: 2,
          opening_hours: { open_now: false },
          geometry: {
            location: { lat: 55.7658, lng: 37.6276 }
          },
          types: ['cafe', 'food', 'establishment']
        }
      ],
      status: 'OK'
    };
  }

  /**
   * Successful place details
   */
  static placeDetails(): MapsMockResponse {
    return {
      results: [
        {
          place_id: 'detailed_place',
          name: 'Detailed Place',
          formatted_address: 'Detailed Address, Moscow',
          rating: 4.7,
          price_level: 3,
          opening_hours: { open_now: true },
          geometry: {
            location: { lat: 55.7558, lng: 37.6176 }
          },
          types: ['restaurant', 'food', 'establishment']
        }
      ],
      status: 'OK'
    };
  }

  /**
   * Empty results
   */
  static emptyResults(): MapsMockResponse {
    return {
      results: [],
      status: 'ZERO_RESULTS'
    };
  }

  /**
   * Generic success response
   */
  static success(): MapsMockResponse {
    return {
      results: [
        {
          place_id: 'generic_place',
          name: 'Generic Place',
          formatted_address: 'Generic Address',
          rating: 4.0,
          geometry: {
            location: { lat: 55.7558, lng: 37.6176 }
          },
          types: ['establishment']
        }
      ],
      status: 'OK'
    };
  }

  /**
   * Error response
   */
  static errorResponse(): MapsMockResponse {
    return {
      status: 'REQUEST_DENIED',
      error_message: 'The provided API key is invalid.'
    };
  }

  /**
   * Rate limit error
   */
  static rateLimitError(): Error {
    return new Error('Maps API error: OVER_QUERY_LIMIT');
  }

  /**
   * Network error
   */
  static networkError(): Error {
    return new Error('Network error: Connection timeout');
  }

  /**
   * Invalid request error
   */
  static invalidRequestError(): MapsMockResponse {
    return {
      status: 'INVALID_REQUEST',
      error_message: 'Invalid request. Missing required parameter.'
    };
  }
}

/**
 * Factory for creating test place data
 */
export class MapsTestDataFactory {
  /**
   * Create a test place result
   */
  static createPlaceResult(overrides: any = {}): any {
    return {
      place_id: 'test_place_id',
      name: 'Test Place',
      formatted_address: 'Test Address, Moscow',
      rating: 4.5,
      price_level: 2,
      opening_hours: { open_now: true },
      geometry: {
        location: { lat: 55.7558, lng: 37.6176 }
      },
      types: ['restaurant', 'food', 'establishment'],
      ...overrides
    };
  }

  /**
   * Create multiple test place results
   */
  static createPlaceResults(count: number): any[] {
    return Array.from({ length: count }, (_, i) => 
      this.createPlaceResult({
        place_id: `place_${i + 1}`,
        name: `Place ${i + 1}`,
        formatted_address: `Address ${i + 1}, Moscow`,
        rating: 4.0 + (i * 0.1),
        geometry: {
          location: { 
            lat: 55.7558 + (i * 0.01), 
            lng: 37.6176 + (i * 0.01) 
          }
        }
      })
    );
  }

  /**
   * Create a restaurant place result
   */
  static createRestaurant(overrides: any = {}): any {
    return this.createPlaceResult({
      name: 'Test Restaurant',
      types: ['restaurant', 'food', 'establishment'],
      ...overrides
    });
  }

  /**
   * Create a pharmacy place result
   */
  static createPharmacy(overrides: any = {}): any {
    return this.createPlaceResult({
      name: 'Test Pharmacy',
      types: ['pharmacy', 'health', 'establishment'],
      ...overrides
    });
  }

  /**
   * Create a cafe place result
   */
  static createCafe(overrides: any = {}): any {
    return this.createPlaceResult({
      name: 'Test Cafe',
      types: ['cafe', 'food', 'establishment'],
      ...overrides
    });
  }
}
