// Test utilities and mock factories for SpotFinder tests

import { 
  TelegramUpdate, 
  TelegramMessage, 
  TelegramUser, 
  PlaceResult, 
  Location,
  DBSession,
  DBUser,
  ConversationState 
} from './types.ts';

/**
 * Mock factories for creating test data
 */
export class TestDataFactory {
  
  /**
   * Create a mock Telegram user
   */
  static createTelegramUser(overrides: Partial<TelegramUser> = {}): TelegramUser {
    return {
      id: 12345,
      is_bot: false,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      language_code: 'ru',
      ...overrides
    };
  }

  /**
   * Create a mock Telegram message
   */
  static createTelegramMessage(overrides: Partial<TelegramMessage> = {}): TelegramMessage {
    return {
      message_id: 1,
      from: this.createTelegramUser(),
      chat: {
        id: 12345,
        type: 'private'
      },
      date: Date.now(),
      text: 'Test message',
      ...overrides
    };
  }

  /**
   * Create a mock Telegram update
   */
  static createTelegramUpdate(overrides: Partial<TelegramUpdate> = {}): TelegramUpdate {
    return {
      update_id: 1,
      message: this.createTelegramMessage(),
      ...overrides
    };
  }

  /**
   * Create a mock location message
   */
  static createLocationMessage(location: Location): TelegramMessage {
    return this.createTelegramMessage({
      text: undefined,
      location: {
        latitude: location.lat,
        longitude: location.lon
      }
    });
  }

  /**
   * Create a mock place result
   */
  static createPlaceResult(overrides: Partial<PlaceResult> = {}): PlaceResult {
    return {
      place_id: 'test_place_id',
      name: 'Test Place',
      address: 'Test Address, 123',
      rating: 4.5,
      price_level: 2,
      distance: 500,
      is_open: true,
      ...overrides
    };
  }

  /**
   * Create multiple mock place results
   */
  static createPlaceResults(count: number): PlaceResult[] {
    return Array.from({ length: count }, (_, i) => 
      this.createPlaceResult({
        place_id: `place_${i + 1}`,
        name: `Place ${i + 1}`,
        address: `Address ${i + 1}`,
        rating: 4.0 + (i * 0.1),
        distance: 100 + (i * 200)
      })
    );
  }

  /**
   * Create a mock DB user
   */
  static createDBUser(overrides: Partial<DBUser> = {}): DBUser {
    return {
      user_id: 12345,
      telegram_username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      language_code: 'ru',
      created_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create a mock DB session
   */
  static createDBSession(overrides: Partial<DBSession> = {}): DBSession {
    return {
      session_id: 'test_session_id',
      user_id: 12345,
      current_location_lat: 55.7558,
      current_location_lon: 37.6176,
      location_timestamp: new Date().toISOString(),
      last_query: 'test query',
      last_results: this.createPlaceResults(3),
      conversation_state: 'default',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create a mock location
   */
  static createLocation(overrides: Partial<Location> = {}): Location {
    return {
      lat: 55.7558,
      lon: 37.6176,
      ...overrides
    };
  }
}

/**
 * Mock Supabase client for testing
 */
export class MockSupabaseClient {
  private data: Map<string, any[]> = new Map();
  private errors: Map<string, Error> = new Map();

  /**
   * Set mock data for a table
   */
  setMockData(table: string, data: any[]): void {
    this.data.set(table, data);
  }

  /**
   * Set mock error for a table operation
   */
  setMockError(table: string, error: Error): void {
    this.errors.set(table, error);
  }

  /**
   * Clear all mock data
   */
  clearMocks(): void {
    this.data.clear();
    this.errors.clear();
  }

  /**
   * Mock select operation
   */
  from(table: string) {
    return {
      select: (columns: string = '*') => ({
        eq: (column: string, value: any) => ({
          single: () => this.mockSingle(table, column, value),
          maybeSingle: () => this.mockMaybeSingle(table, column, value)
        }),
        order: (column: string, options?: any) => ({
          limit: (count: number) => this.mockSelect(table)
        }),
        limit: (count: number) => this.mockSelect(table)
      }),
      insert: (data: any) => ({
        select: () => this.mockInsert(table, data)
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: () => this.mockUpdate(table, data, column, value)
        })
      }),
      upsert: (data: any) => ({
        select: () => this.mockUpsert(table, data)
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          select: () => this.mockDelete(table, column, value)
        })
      })
    };
  }

  private mockSingle(table: string, column: string, value: any) {
    if (this.errors.has(table)) {
      throw this.errors.get(table)!;
    }
    const data = this.data.get(table) || [];
    const result = data.find(item => item[column] === value);
    if (!result) {
      throw new Error(`No data found for ${table}.${column} = ${value}`);
    }
    return Promise.resolve({ data: result, error: null });
  }

  private mockMaybeSingle(table: string, column: string, value: any) {
    if (this.errors.has(table)) {
      throw this.errors.get(table)!;
    }
    const data = this.data.get(table) || [];
    const result = data.find(item => item[column] === value);
    return Promise.resolve({ data: result || null, error: null });
  }

  private mockSelect(table: string) {
    if (this.errors.has(table)) {
      throw this.errors.get(table)!;
    }
    const data = this.data.get(table) || [];
    return Promise.resolve({ data, error: null });
  }

  private mockInsert(table: string, data: any) {
    if (this.errors.has(table)) {
      throw this.errors.get(table)!;
    }
    const existingData = this.data.get(table) || [];
    const newItem = { ...data, id: Date.now() };
    existingData.push(newItem);
    this.data.set(table, existingData);
    return Promise.resolve({ data: [newItem], error: null });
  }

  private mockUpdate(table: string, data: any, column: string, value: any) {
    if (this.errors.has(table)) {
      throw this.errors.get(table)!;
    }
    const existingData = this.data.get(table) || [];
    const index = existingData.findIndex(item => item[column] === value);
    if (index !== -1) {
      existingData[index] = { ...existingData[index], ...data };
      this.data.set(table, existingData);
      return Promise.resolve({ data: [existingData[index]], error: null });
    }
    return Promise.resolve({ data: [], error: null });
  }

  private mockUpsert(table: string, data: any) {
    if (this.errors.has(table)) {
      throw this.errors.get(table)!;
    }
    const existingData = this.data.get(table) || [];
    const existingIndex = existingData.findIndex(item => item.id === data.id);
    if (existingIndex !== -1) {
      existingData[existingIndex] = { ...existingData[existingIndex], ...data };
    } else {
      existingData.push({ ...data, id: data.id || Date.now() });
    }
    this.data.set(table, existingData);
    return Promise.resolve({ data: [existingData[existingIndex] || existingData[existingData.length - 1]], error: null });
  }

  private mockDelete(table: string, column: string, value: any) {
    if (this.errors.has(table)) {
      throw this.errors.get(table)!;
    }
    const existingData = this.data.get(table) || [];
    const index = existingData.findIndex(item => item[column] === value);
    if (index !== -1) {
      const deletedItem = existingData.splice(index, 1)[0];
      this.data.set(table, existingData);
      return Promise.resolve({ data: [deletedItem], error: null });
    }
    return Promise.resolve({ data: [], error: null });
  }
}

/**
 * Test environment setup utilities
 */
export class TestEnvironment {
  private static mockEnv: Record<string, string> = {};

  /**
   * Set up test environment variables
   */
  static setupTestEnv(): void {
    this.mockEnv = {
      TELEGRAM_BOT_TOKEN: 'test_bot_token',
      GEMINI_API_KEY: 'test_gemini_key',
      GOOGLE_MAPS_API_KEY: 'test_maps_key',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test_service_key'
    };
  }

  /**
   * Get test environment variables
   */
  static getTestEnv(): Record<string, string> {
    return { ...this.mockEnv };
  }

  /**
   * Clear test environment
   */
  static clearTestEnv(): void {
    this.mockEnv = {};
  }
}

/**
 * Assertion helpers for testing
 */
export class TestAssertions {
  /**
   * Assert that a location is valid
   */
  static assertValidLocation(location: Location): void {
    if (typeof location.lat !== 'number' || typeof location.lon !== 'number') {
      throw new Error('Location must have numeric lat and lon');
    }
    if (location.lat < -90 || location.lat > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    if (location.lon < -180 || location.lon > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
  }

  /**
   * Assert that a place result is valid
   */
  static assertValidPlaceResult(place: PlaceResult): void {
    if (!place.place_id || !place.name) {
      throw new Error('Place must have place_id and name');
    }
    if (place.rating && (place.rating < 0 || place.rating > 5)) {
      throw new Error('Rating must be between 0 and 5');
    }
    if (place.price_level && (place.price_level < 0 || place.price_level > 4)) {
      throw new Error('Price level must be between 0 and 4');
    }
  }

  /**
   * Assert that a Telegram message is valid
   */
  static assertValidTelegramMessage(message: TelegramMessage): void {
    if (!message.message_id || !message.from || !message.chat) {
      throw new Error('Telegram message must have message_id, from, and chat');
    }
    if (!message.from.id || !message.from.first_name) {
      throw new Error('Telegram user must have id and first_name');
    }
  }
}
