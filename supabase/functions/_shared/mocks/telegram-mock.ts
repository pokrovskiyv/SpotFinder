// Mock for Telegram Bot API

export interface TelegramMockResponse {
  ok: boolean;
  result?: any;
  error_code?: number;
  description?: string;
}

export interface TelegramMockRequest {
  method: string;
  params?: Record<string, any>;
}

/**
 * Mock Telegram Bot API client for testing
 */
export class TelegramMock {
  private responses: Map<string, TelegramMockResponse> = new Map();
  private errors: Map<string, Error> = new Map();
  private requestLog: Array<{ request: TelegramMockRequest; response: TelegramMockResponse | Error }> = [];
  private sentMessages: Array<{ chat_id: number; text: string; reply_markup?: any }> = [];

  /**
   * Set mock response for a specific method
   */
  setMockResponse(method: string, response: TelegramMockResponse): void {
    this.responses.set(method, response);
  }

  /**
   * Set mock error for a specific method
   */
  setMockError(method: string, error: Error): void {
    this.errors.set(method, error);
  }

  /**
   * Clear all mocks
   */
  clearMocks(): void {
    this.responses.clear();
    this.errors.clear();
    this.requestLog = [];
    this.sentMessages = [];
  }

  /**
   * Get request log for verification
   */
  getRequestLog(): Array<{ request: TelegramMockRequest; response: TelegramMockResponse | Error }> {
    return [...this.requestLog];
  }

  /**
   * Get sent messages for verification
   */
  getSentMessages(): Array<{ chat_id: number; text: string; reply_markup?: any }> {
    return [...this.sentMessages];
  }

  /**
   * Mock sendMessage method
   */
  async sendMessage(chatId: number, text: string, options: any = {}): Promise<TelegramMockResponse> {
    const request: TelegramMockRequest = {
      method: 'sendMessage',
      params: { chat_id: chatId, text, ...options }
    };

    // Log the sent message
    this.sentMessages.push({
      chat_id: chatId,
      text,
      reply_markup: options.reply_markup
    });

    return this.mockRequest(request);
  }

  /**
   * Mock sendLocation method
   */
  async sendLocation(chatId: number, latitude: number, longitude: number, options: any = {}): Promise<TelegramMockResponse> {
    const request: TelegramMockRequest = {
      method: 'sendLocation',
      params: { chat_id: chatId, latitude, longitude, ...options }
    };

    return this.mockRequest(request);
  }

  /**
   * Mock answerCallbackQuery method
   */
  async answerCallbackQuery(callbackQueryId: string, options: any = {}): Promise<TelegramMockResponse> {
    const request: TelegramMockRequest = {
      method: 'answerCallbackQuery',
      params: { callback_query_id: callbackQueryId, ...options }
    };

    return this.mockRequest(request);
  }

  /**
   * Mock editMessageText method
   */
  async editMessageText(chatId: number, messageId: number, text: string, options: any = {}): Promise<TelegramMockResponse> {
    const request: TelegramMockRequest = {
      method: 'editMessageText',
      params: { chat_id: chatId, message_id: messageId, text, ...options }
    };

    return this.mockRequest(request);
  }

  /**
   * Mock setWebhook method
   */
  async setWebhook(url: string, options: any = {}): Promise<TelegramMockResponse> {
    const request: TelegramMockRequest = {
      method: 'setWebhook',
      params: { url, ...options }
    };

    return this.mockRequest(request);
  }

  /**
   * Mock deleteWebhook method
   */
  async deleteWebhook(): Promise<TelegramMockResponse> {
    const request: TelegramMockRequest = {
      method: 'deleteWebhook',
      params: {}
    };

    return this.mockRequest(request);
  }

  /**
   * Mock getWebhookInfo method
   */
  async getWebhookInfo(): Promise<TelegramMockResponse> {
    const request: TelegramMockRequest = {
      method: 'getWebhookInfo',
      params: {}
    };

    return this.mockRequest(request);
  }

  /**
   * Mock setMyCommands method
   */
  async setMyCommands(commands: Array<{ command: string; description: string }>): Promise<TelegramMockResponse> {
    const request: TelegramMockRequest = {
      method: 'setMyCommands',
      params: { commands }
    };

    return this.mockRequest(request);
  }

  /**
   * Generic request handler
   */
  private async mockRequest(request: TelegramMockRequest): Promise<TelegramMockResponse> {
    const method = request.method;
    
    // Log the request
    let response: TelegramMockResponse | Error;
    
    if (this.errors.has(method)) {
      response = this.errors.get(method)!;
      this.requestLog.push({ request, response });
      throw response;
    }

    if (this.responses.has(method)) {
      response = this.responses.get(method)!;
    } else {
      // Default successful response
      response = {
        ok: true,
        result: {
          message_id: Date.now(),
          date: Math.floor(Date.now() / 1000),
          chat: { id: request.params?.chat_id || 0, type: 'private' },
          text: request.params?.text || '',
          ...request.params
        }
      };
    }

    this.requestLog.push({ request, response });
    return response;
  }
}

/**
 * Predefined mock responses for common Telegram operations
 */
export class TelegramMockResponses {
  /**
   * Successful message sent response
   */
  static messageSent(): TelegramMockResponse {
    return {
      ok: true,
      result: {
        message_id: 123,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 12345, type: 'private' },
        text: 'Test message'
      }
    };
  }

  /**
   * Successful callback query answer
   */
  static callbackAnswered(): TelegramMockResponse {
    return {
      ok: true,
      result: true
    };
  }

  /**
   * Successful webhook set
   */
  static webhookSet(): TelegramMockResponse {
    return {
      ok: true,
      result: true,
      description: 'Webhook was set'
    };
  }

  /**
   * Successful webhook deleted
   */
  static webhookDeleted(): TelegramMockResponse {
    return {
      ok: true,
      result: true,
      description: 'Webhook was deleted'
    };
  }

  /**
   * Webhook info response
   */
  static webhookInfo(): TelegramMockResponse {
    return {
      ok: true,
      result: {
        url: 'https://test.supabase.co/functions/v1/telegram-webhook',
        has_custom_certificate: false,
        pending_update_count: 0,
        max_connections: 40,
        ip_address: '127.0.0.1'
      }
    };
  }

  /**
   * Commands set successfully
   */
  static commandsSet(): TelegramMockResponse {
    return {
      ok: true,
      result: true
    };
  }

  /**
   * Error response
   */
  static errorResponse(): TelegramMockResponse {
    return {
      ok: false,
      error_code: 400,
      description: 'Bad Request: chat not found'
    };
  }

  /**
   * Rate limit error
   */
  static rateLimitError(): Error {
    return new Error('Telegram API error: Too Many Requests');
  }

  /**
   * Network error
   */
  static networkError(): Error {
    return new Error('Network error: Connection timeout');
  }
}

/**
 * Factory for creating Telegram updates for testing
 */
export class TelegramUpdateFactory {
  /**
   * Create a text message update
   */
  static createTextMessage(text: string, chatId: number = 12345): any {
    return {
      update_id: Date.now(),
      message: {
        message_id: Date.now(),
        from: {
          id: chatId,
          is_bot: false,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'ru'
        },
        chat: {
          id: chatId,
          type: 'private'
        },
        date: Math.floor(Date.now() / 1000),
        text: text
      }
    };
  }

  /**
   * Create a location message update
   */
  static createLocationMessage(latitude: number, longitude: number, chatId: number = 12345): any {
    return {
      update_id: Date.now(),
      message: {
        message_id: Date.now(),
        from: {
          id: chatId,
          is_bot: false,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'ru'
        },
        chat: {
          id: chatId,
          type: 'private'
        },
        date: Math.floor(Date.now() / 1000),
        location: {
          latitude: latitude,
          longitude: longitude
        }
      }
    };
  }

  /**
   * Create a callback query update
   */
  static createCallbackQuery(data: string, chatId: number = 12345): any {
    return {
      update_id: Date.now(),
      callback_query: {
        id: 'test_callback_id',
        from: {
          id: chatId,
          is_bot: false,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'ru'
        },
        message: {
          message_id: Date.now(),
          from: {
            id: 123456789,
            is_bot: true,
            first_name: 'SpotFinder',
            username: 'spotfinder_bot'
          },
          chat: {
            id: chatId,
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: 'Test message'
        },
        data: data
      }
    };
  }

  /**
   * Create a /start command update
   */
  static createStartCommand(chatId: number = 12345): any {
    return this.createTextMessage('/start', chatId);
  }

  /**
   * Create a /help command update
   */
  static createHelpCommand(chatId: number = 12345): any {
    return this.createTextMessage('/help', chatId);
  }

  /**
   * Create a /location command update
   */
  static createLocationCommand(chatId: number = 12345): any {
    return this.createTextMessage('/location', chatId);
  }
}
