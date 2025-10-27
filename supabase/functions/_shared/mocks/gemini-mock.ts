// Mock for Google Gemini API

export interface GeminiMockResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
  }>;
}

export interface GeminiMockRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  tools?: Array<{
    function_declarations: Array<{
      name: string;
      description: string;
      parameters: any;
    }>;
  }>;
}

/**
 * Mock Gemini API client for testing
 */
export class GeminiMock {
  private responses: Map<string, GeminiMockResponse> = new Map();
  private errors: Map<string, Error> = new Map();
  private requestLog: Array<{ request: GeminiMockRequest; response: GeminiMockResponse | Error }> = [];

  /**
   * Set mock response for a specific request pattern
   */
  setMockResponse(requestPattern: string, response: GeminiMockResponse): void {
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
  getRequestLog(): Array<{ request: GeminiMockRequest; response: GeminiMockResponse | Error }> {
    return [...this.requestLog];
  }

  /**
   * Mock generateContent method
   */
  async generateContent(request: GeminiMockRequest): Promise<GeminiMockResponse> {
    const requestKey = this.generateRequestKey(request);
    
    // Log the request
    let response: GeminiMockResponse | Error;
    
    if (this.errors.has(requestKey)) {
      response = this.errors.get(requestKey)!;
      this.requestLog.push({ request, response });
      throw response;
    }

    if (this.responses.has(requestKey)) {
      response = this.responses.get(requestKey)!;
    } else {
      // Default response based on request content
      response = this.generateDefaultResponse(request);
    }

    this.requestLog.push({ request, response });
    return response;
  }

  /**
   * Generate a key for request matching
   */
  private generateRequestKey(request: GeminiMockRequest): string {
    const content = request.contents[0]?.parts[0]?.text || '';
    const tools = request.tools?.map(t => t.function_declarations.map(f => f.name).join(',')) || [];
    
    // Create a simple key based on content and tools
    return `${content.substring(0, 50)}_${tools.join('_')}`;
  }

  /**
   * Generate default response based on request content
   */
  private generateDefaultResponse(request: GeminiMockRequest): GeminiMockResponse {
    const content = request.contents[0]?.parts[0]?.text || '';
    
    // Default responses for common patterns
    if (content.includes('найди') || content.includes('поиск')) {
      return {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                intent: 'search',
                category: 'restaurant',
                query: 'кафе',
                location: 'current'
              })
            }]
          },
          finishReason: 'STOP'
        }]
      };
    }

    if (content.includes('первый') || content.includes('второй')) {
      return {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                intent: 'followup',
                reference: 'first',
                question: 'rating'
              })
            }]
          },
          finishReason: 'STOP'
        }]
      };
    }

    if (content.includes('/start')) {
      return {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                intent: 'welcome',
                action: 'request_location'
              })
            }]
          },
          finishReason: 'STOP'
        }]
      };
    }

    // Default fallback
    return {
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              intent: 'unknown',
              message: 'Не понял запрос'
            })
          }]
        },
        finishReason: 'STOP'
      }]
    };
  }
}

/**
 * Predefined mock responses for common scenarios
 */
export class GeminiMockResponses {
  /**
   * Mock response for restaurant search
   */
  static restaurantSearch(): GeminiMockResponse {
    return {
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              intent: 'search',
              category: 'restaurant',
              query: 'ресторан',
              location: 'current',
              radius: 1000
            })
          }]
        },
        finishReason: 'STOP'
      }]
    };
  }

  /**
   * Mock response for pharmacy search
   */
  static pharmacySearch(): GeminiMockResponse {
    return {
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              intent: 'search',
              category: 'pharmacy',
              query: 'аптека',
              location: 'current',
              radius: 500,
              urgent: true
            })
          }]
        },
        finishReason: 'STOP'
      }]
    };
  }

  /**
   * Mock response for follow-up question
   */
  static followUpQuestion(): GeminiMockResponse {
    return {
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              intent: 'followup',
              reference: 'first',
              question: 'rating',
              context: 'previous_search'
            })
          }]
        },
        finishReason: 'STOP'
      }]
    };
  }

  /**
   * Mock response for location request
   */
  static locationRequest(): GeminiMockResponse {
    return {
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              intent: 'location_request',
              message: 'Поделитесь вашей геолокацией для поиска мест поблизости'
            })
          }]
        },
        finishReason: 'STOP'
      }]
    };
  }

  /**
   * Mock error response
   */
  static errorResponse(): Error {
    return new Error('Gemini API error: Rate limit exceeded');
  }

  /**
   * Mock response for ambiguous query
   */
  static ambiguousQuery(): GeminiMockResponse {
    return {
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              intent: 'clarification',
              message: 'Уточните, что именно вы ищете?',
              suggestions: ['кафе', 'ресторан', 'аптека', 'банк']
            })
          }]
        },
        finishReason: 'STOP'
      }]
    };
  }
}
