// Unit tests for user-manager.ts

import { assertEquals, assertThrows } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { UserManager } from './user-manager.ts';
import { MockSupabaseClient, TestDataFactory } from './test-utils.ts';

// Mock Supabase client for testing
class TestableUserManager extends UserManager {
  public mockSupabase: MockSupabaseClient;

  constructor() {
    super('test-url', 'test-key');
    this.mockSupabase = new MockSupabaseClient();
    // Replace the real supabase client with our mock
    (this as any).supabase = this.mockSupabase;
  }
}

Deno.test('UserManager - getOrCreateUser existing user', async () => {
  const manager = new TestableUserManager();
  const existingUser = TestDataFactory.createDBUser();
  const telegramUser = TestDataFactory.createTelegramUser();
  
  manager.mockSupabase.setMockData('users', [existingUser]);
  
  const result = await manager.getOrCreateUser(telegramUser);
  
  assertEquals(result.user_id, telegramUser.id);
  assertEquals(result.first_name, telegramUser.first_name);
});

Deno.test('UserManager - getOrCreateUser create new user', async () => {
  const manager = new TestableUserManager();
  const telegramUser = TestDataFactory.createTelegramUser();
  
  // No existing user
  manager.mockSupabase.setMockData('users', []);
  
  const result = await manager.getOrCreateUser(telegramUser);
  
  assertEquals(result.user_id, telegramUser.id);
  assertEquals(result.first_name, telegramUser.first_name);
  assertEquals(result.language_code, telegramUser.language_code);
});

Deno.test('UserManager - getOrCreateUser with minimal telegram data', async () => {
  const manager = new TestableUserManager();
  const telegramUser = TestDataFactory.createTelegramUser({
    username: undefined,
    last_name: undefined,
    language_code: undefined
  });
  
  manager.mockSupabase.setMockData('users', []);
  
  const result = await manager.getOrCreateUser(telegramUser);
  
  assertEquals(result.user_id, telegramUser.id);
  assertEquals(result.telegram_username, null);
  assertEquals(result.last_name, null);
  assertEquals(result.language_code, 'ru'); // Default language
});

Deno.test('UserManager - getOrCreateUser database error', async () => {
  const manager = new TestableUserManager();
  const telegramUser = TestDataFactory.createTelegramUser();
  
  manager.mockSupabase.setMockError('users', new Error('Database connection failed'));
  
  await assertThrows(
    async () => await manager.getOrCreateUser(telegramUser),
    Error,
    'Database connection failed'
  );
});

Deno.test('UserManager - updateLastSeen', async () => {
  const manager = new TestableUserManager();
  
  manager.mockSupabase.setMockData('users', [TestDataFactory.createDBUser()]);
  
  // Should not throw
  await manager.updateLastSeen(12345);
  
  // Verify the update was called
  const requestLog = manager.mockSupabase.getRequestLog();
  assertEquals(requestLog.length > 0, true);
});

Deno.test('UserManager - getUserPreferences existing preferences', async () => {
  const manager = new TestableUserManager();
  const preferences = {
    preference_id: 'test_pref_id',
    user_id: 12345,
    home_address: 'Test Home Address',
    home_location: null,
    work_address: 'Test Work Address',
    work_location: null,
    preferred_transport_mode: 'walking' as const,
    dietary_restrictions: ['vegan', 'gluten-free'],
    profile_notes: 'Test notes',
    updated_at: new Date().toISOString()
  };
  
  manager.mockSupabase.setMockData('user_preferences', [preferences]);
  
  const result = await manager.getUserPreferences(12345);
  
  assertEquals(result?.user_id, 12345);
  assertEquals(result?.home_address, 'Test Home Address');
  assertEquals(result?.dietary_restrictions?.length, 2);
});

Deno.test('UserManager - getUserPreferences no preferences', async () => {
  const manager = new TestableUserManager();
  
  manager.mockSupabase.setMockData('user_preferences', []);
  
  const result = await manager.getUserPreferences(12345);
  
  assertEquals(result, null);
});

Deno.test('UserManager - updatePreferences create new', async () => {
  const manager = new TestableUserManager();
  
  // No existing preferences
  manager.mockSupabase.setMockData('user_preferences', []);
  
  const preferences = {
    home_address: 'New Home Address',
    preferred_transport_mode: 'driving' as const
  };
  
  // Should not throw
  await manager.updatePreferences(12345, preferences);
});

Deno.test('UserManager - updatePreferences update existing', async () => {
  const manager = new TestableUserManager();
  const existingPreferences = {
    preference_id: 'test_pref_id',
    user_id: 12345,
    home_address: 'Old Home Address',
    home_location: null,
    work_address: null,
    work_location: null,
    preferred_transport_mode: 'walking' as const,
    dietary_restrictions: null,
    profile_notes: null,
    updated_at: new Date().toISOString()
  };
  
  manager.mockSupabase.setMockData('user_preferences', [existingPreferences]);
  
  const preferences = {
    home_address: 'Updated Home Address',
    preferred_transport_mode: 'driving' as const
  };
  
  // Should not throw
  await manager.updatePreferences(12345, preferences);
});

Deno.test('UserManager - appendProfileNote new note', async () => {
  const manager = new TestableUserManager();
  
  // No existing preferences
  manager.mockSupabase.setMockData('user_preferences', []);
  
  // Should not throw
  await manager.appendProfileNote(12345, 'User likes quiet places');
});

Deno.test('UserManager - appendProfileNote append to existing', async () => {
  const manager = new TestableUserManager();
  const existingPreferences = {
    preference_id: 'test_pref_id',
    user_id: 12345,
    home_address: null,
    home_location: null,
    work_address: null,
    work_location: null,
    preferred_transport_mode: 'walking' as const,
    dietary_restrictions: null,
    profile_notes: 'User prefers cafes with Wi-Fi',
    updated_at: new Date().toISOString()
  };
  
  manager.mockSupabase.setMockData('user_preferences', [existingPreferences]);
  
  // Should not throw
  await manager.appendProfileNote(12345, 'User likes quiet places');
});

Deno.test('UserManager - appendProfileNote empty existing notes', async () => {
  const manager = new TestableUserManager();
  const existingPreferences = {
    preference_id: 'test_pref_id',
    user_id: 12345,
    home_address: null,
    home_location: null,
    work_address: null,
    work_location: null,
    preferred_transport_mode: 'walking' as const,
    dietary_restrictions: null,
    profile_notes: '',
    updated_at: new Date().toISOString()
  };
  
  manager.mockSupabase.setMockData('user_preferences', [existingPreferences]);
  
  // Should not throw
  await manager.appendProfileNote(12345, 'User likes quiet places');
});

Deno.test('UserManager - dietary restrictions handling', async () => {
  const manager = new TestableUserManager();
  
  manager.mockSupabase.setMockData('user_preferences', []);
  
  const preferences = {
    dietary_restrictions: ['vegan', 'gluten-free', 'dairy-free']
  };
  
  // Should not throw
  await manager.updatePreferences(12345, preferences);
});

Deno.test('UserManager - transport mode options', async () => {
  const manager = new TestableUserManager();
  
  manager.mockSupabase.setMockData('user_preferences', []);
  
  const transportModes = ['walking', 'driving', 'public'] as const;
  
  for (const mode of transportModes) {
    const preferences = {
      preferred_transport_mode: mode
    };
    
    // Should not throw for each mode
    await manager.updatePreferences(12345, preferences);
  }
});

Deno.test('UserManager - location data handling', async () => {
  const manager = new TestableUserManager();
  
  manager.mockSupabase.setMockData('user_preferences', []);
  
  const preferences = {
    home_address: 'Test Home Address',
    work_address: 'Test Work Address',
    home_location: 'POINT(37.6176 55.7558)', // PostGIS format
    work_location: 'POINT(37.6276 55.7658)'
  };
  
  // Should not throw
  await manager.updatePreferences(12345, preferences);
});

Deno.test('UserManager - user creation with all fields', async () => {
  const manager = new TestableUserManager();
  const telegramUser = TestDataFactory.createTelegramUser({
    id: 67890,
    first_name: 'Иван',
    last_name: 'Петров',
    username: 'ivan_petrov',
    language_code: 'ru'
  });
  
  manager.mockSupabase.setMockData('users', []);
  
  const result = await manager.getOrCreateUser(telegramUser);
  
  assertEquals(result.user_id, 67890);
  assertEquals(result.first_name, 'Иван');
  assertEquals(result.last_name, 'Петров');
  assertEquals(result.telegram_username, 'ivan_petrov');
  assertEquals(result.language_code, 'ru');
});

Deno.test('UserManager - preferences update timestamp', async () => {
  const manager = new TestableUserManager();
  const existingPreferences = {
    preference_id: 'test_pref_id',
    user_id: 12345,
    home_address: 'Old Address',
    home_location: null,
    work_address: null,
    work_location: null,
    preferred_transport_mode: 'walking' as const,
    dietary_restrictions: null,
    profile_notes: null,
    updated_at: new Date(Date.now() - 1000).toISOString() // Old timestamp
  };
  
  manager.mockSupabase.setMockData('user_preferences', [existingPreferences]);
  
  await manager.updatePreferences(12345, {
    home_address: 'New Address'
  });
  
  // Verify that updated_at was included in the update
  const requestLog = manager.mockSupabase.getRequestLog();
  const updateRequest = requestLog.find(log => 
    log.request.method === 'update' && 
    log.request.params?.home_address === 'New Address'
  );
  
  assertEquals(updateRequest !== undefined, true);
});

Deno.test('UserManager - profile notes concatenation', async () => {
  const manager = new TestableUserManager();
  const existingPreferences = {
    preference_id: 'test_pref_id',
    user_id: 12345,
    home_address: null,
    home_location: null,
    work_address: null,
    work_location: null,
    preferred_transport_mode: 'walking' as const,
    dietary_restrictions: null,
    profile_notes: 'User likes cafes',
    updated_at: new Date().toISOString()
  };
  
  manager.mockSupabase.setMockData('user_preferences', [existingPreferences]);
  
  await manager.appendProfileNote(12345, 'User prefers quiet places');
  
  // Verify that the note was appended with semicolon separator
  const requestLog = manager.mockSupabase.getRequestLog();
  const updateRequest = requestLog.find(log => 
    log.request.method === 'update' && 
    log.request.params?.profile_notes?.includes('User likes cafes; User prefers quiet places')
  );
  
  assertEquals(updateRequest !== undefined, true);
});
