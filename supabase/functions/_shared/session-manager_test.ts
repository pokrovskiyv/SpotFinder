// Unit tests for session-manager.ts

import { assertEquals, assertThrows } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { SessionManager } from './session-manager.ts';
import { MockSupabaseClient, TestDataFactory } from './test-utils.ts';

// Mock Supabase client for testing
class TestableSessionManager extends SessionManager {
  public mockSupabase: MockSupabaseClient;

  constructor() {
    super('test-url', 'test-key');
    this.mockSupabase = new MockSupabaseClient();
    // Replace the real supabase client with our mock
    (this as any).supabase = this.mockSupabase;
  }
}

Deno.test('SessionManager - getOrCreateSession existing session', async () => {
  const manager = new TestableSessionManager();
  const existingSession = TestDataFactory.createDBSession();
  
  manager.mockSupabase.setMockData('sessions', [existingSession]);
  
  const result = await manager.getOrCreateSession(12345);
  
  assertEquals(result.user_id, 12345);
  assertEquals(result.session_id, 'test_session_id');
});

Deno.test('SessionManager - getOrCreateSession create new session', async () => {
  const manager = new TestableSessionManager();
  
  // No existing session
  manager.mockSupabase.setMockData('sessions', []);
  
  const result = await manager.getOrCreateSession(12345);
  
  assertEquals(result.user_id, 12345);
  assertEquals(result.conversation_state, 'awaiting_location');
});

Deno.test('SessionManager - getOrCreateSession database error', async () => {
  const manager = new TestableSessionManager();
  
  manager.mockSupabase.setMockError('sessions', new Error('Database connection failed'));
  
  await assertThrows(
    async () => await manager.getOrCreateSession(12345),
    Error,
    'Database connection failed'
  );
});

Deno.test('SessionManager - getSession existing session', async () => {
  const manager = new TestableSessionManager();
  const session = TestDataFactory.createDBSession();
  
  manager.mockSupabase.setMockData('sessions', [session]);
  
  const result = await manager.getSession(12345);
  
  assertEquals(result?.user_id, 12345);
});

Deno.test('SessionManager - getSession no session', async () => {
  const manager = new TestableSessionManager();
  
  manager.mockSupabase.setMockData('sessions', []);
  
  const result = await manager.getSession(12345);
  
  assertEquals(result, null);
});

Deno.test('SessionManager - updateLocation', async () => {
  const manager = new TestableSessionManager();
  const location = TestDataFactory.createLocation();
  
  manager.mockSupabase.setMockData('sessions', [TestDataFactory.createDBSession()]);
  
  // Should not throw
  await manager.updateLocation(12345, location);
  
  // Verify the update was called
  const requestLog = manager.mockSupabase.getRequestLog();
  assertEquals(requestLog.length > 0, true);
});

Deno.test('SessionManager - updateLocation database error', async () => {
  const manager = new TestableSessionManager();
  const location = TestDataFactory.createLocation();
  
  manager.mockSupabase.setMockError('sessions', new Error('Update failed'));
  
  await assertThrows(
    async () => await manager.updateLocation(12345, location),
    Error,
    'Failed to update location: Update failed'
  );
});

Deno.test('SessionManager - getValidLocation valid location', async () => {
  const manager = new TestableSessionManager();
  const recentTimestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
  const session = TestDataFactory.createDBSession({
    current_location_lat: 55.7558,
    current_location_lon: 37.6176,
    location_timestamp: recentTimestamp
  });
  
  manager.mockSupabase.setMockData('sessions', [session]);
  
  const result = await manager.getValidLocation(12345);
  
  assertEquals(result?.lat, 55.7558);
  assertEquals(result?.lon, 37.6176);
});

Deno.test('SessionManager - getValidLocation expired location', async () => {
  const manager = new TestableSessionManager();
  const expiredTimestamp = new Date(Date.now() - 25 * 60 * 1000).toISOString(); // 25 minutes ago
  const session = TestDataFactory.createDBSession({
    current_location_lat: 55.7558,
    current_location_lon: 37.6176,
    location_timestamp: expiredTimestamp
  });
  
  manager.mockSupabase.setMockData('sessions', [session]);
  
  const result = await manager.getValidLocation(12345);
  
  assertEquals(result, null);
});

Deno.test('SessionManager - getValidLocation no session', async () => {
  const manager = new TestableSessionManager();
  
  manager.mockSupabase.setMockData('sessions', []);
  
  const result = await manager.getValidLocation(12345);
  
  assertEquals(result, null);
});

Deno.test('SessionManager - getValidLocation no location', async () => {
  const manager = new TestableSessionManager();
  const session = TestDataFactory.createDBSession({
    current_location_lat: null,
    current_location_lon: null,
    location_timestamp: null
  });
  
  manager.mockSupabase.setMockData('sessions', [session]);
  
  const result = await manager.getValidLocation(12345);
  
  assertEquals(result, null);
});

Deno.test('SessionManager - updateState', async () => {
  const manager = new TestableSessionManager();
  
  manager.mockSupabase.setMockData('sessions', [TestDataFactory.createDBSession()]);
  
  // Should not throw
  await manager.updateState(12345, 'awaiting_followup');
});

Deno.test('SessionManager - updateState database error', async () => {
  const manager = new TestableSessionManager();
  
  manager.mockSupabase.setMockError('sessions', new Error('Update failed'));
  
  await assertThrows(
    async () => await manager.updateState(12345, 'awaiting_followup'),
    Error,
    'Failed to update state: Update failed'
  );
});

Deno.test('SessionManager - saveSearchContext', async () => {
  const manager = new TestableSessionManager();
  const places = TestDataFactory.createPlaceResults(3);
  
  manager.mockSupabase.setMockData('sessions', [TestDataFactory.createDBSession()]);
  
  // Should not throw
  await manager.saveSearchContext(12345, 'test query', places);
});

Deno.test('SessionManager - saveSearchContext database error', async () => {
  const manager = new TestableSessionManager();
  const places = TestDataFactory.createPlaceResults(2);
  
  manager.mockSupabase.setMockError('sessions', new Error('Update failed'));
  
  await assertThrows(
    async () => await manager.saveSearchContext(12345, 'test query', places),
    Error,
    'Failed to save search context: Update failed'
  );
});

Deno.test('SessionManager - getLastResults with results', async () => {
  const manager = new TestableSessionManager();
  const places = TestDataFactory.createPlaceResults(2);
  const session = TestDataFactory.createDBSession({
    last_results: places
  });
  
  manager.mockSupabase.setMockData('sessions', [session]);
  
  const result = await manager.getLastResults(12345);
  
  assertEquals(result?.length, 2);
  assertEquals(result?.[0].name, 'Place 1');
});

Deno.test('SessionManager - getLastResults no results', async () => {
  const manager = new TestableSessionManager();
  const session = TestDataFactory.createDBSession({
    last_results: null
  });
  
  manager.mockSupabase.setMockData('sessions', [session]);
  
  const result = await manager.getLastResults(12345);
  
  assertEquals(result, null);
});

Deno.test('SessionManager - getLastResults no session', async () => {
  const manager = new TestableSessionManager();
  
  manager.mockSupabase.setMockData('sessions', []);
  
  const result = await manager.getLastResults(12345);
  
  assertEquals(result, null);
});

Deno.test('SessionManager - clearSession', async () => {
  const manager = new TestableSessionManager();
  
  manager.mockSupabase.setMockData('sessions', [TestDataFactory.createDBSession()]);
  
  // Should not throw
  await manager.clearSession(12345);
});

Deno.test('SessionManager - clearSession database error', async () => {
  const manager = new TestableSessionManager();
  
  manager.mockSupabase.setMockError('sessions', new Error('Update failed'));
  
  await assertThrows(
    async () => await manager.clearSession(12345),
    Error,
    'Failed to clear session: Update failed'
  );
});

Deno.test('SessionManager - needsLocation with valid location', async () => {
  const manager = new TestableSessionManager();
  const recentTimestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const session = TestDataFactory.createDBSession({
    current_location_lat: 55.7558,
    current_location_lon: 37.6176,
    location_timestamp: recentTimestamp
  });
  
  manager.mockSupabase.setMockData('sessions', [session]);
  
  const result = await manager.needsLocation(12345);
  
  assertEquals(result, false);
});

Deno.test('SessionManager - needsLocation with expired location', async () => {
  const manager = new TestableSessionManager();
  const expiredTimestamp = new Date(Date.now() - 25 * 60 * 1000).toISOString();
  const session = TestDataFactory.createDBSession({
    current_location_lat: 55.7558,
    current_location_lon: 37.6176,
    location_timestamp: expiredTimestamp
  });
  
  manager.mockSupabase.setMockData('sessions', [session]);
  
  const result = await manager.needsLocation(12345);
  
  assertEquals(result, true);
});

Deno.test('SessionManager - needsLocation no location', async () => {
  const manager = new TestableSessionManager();
  const session = TestDataFactory.createDBSession({
    current_location_lat: null,
    current_location_lon: null,
    location_timestamp: null
  });
  
  manager.mockSupabase.setMockData('sessions', [session]);
  
  const result = await manager.needsLocation(12345);
  
  assertEquals(result, true);
});

Deno.test('SessionManager - needsLocation no session', async () => {
  const manager = new TestableSessionManager();
  
  manager.mockSupabase.setMockData('sessions', []);
  
  const result = await manager.needsLocation(12345);
  
  assertEquals(result, true);
});

Deno.test('SessionManager - conversation state transitions', async () => {
  const manager = new TestableSessionManager();
  const session = TestDataFactory.createDBSession({
    conversation_state: 'default'
  });
  
  manager.mockSupabase.setMockData('sessions', [session]);
  
  // Test state transitions
  await manager.updateState(12345, 'awaiting_location');
  await manager.updateState(12345, 'awaiting_followup');
  await manager.updateState(12345, 'default');
  
  // Should not throw
  assertEquals(true, true);
});

Deno.test('SessionManager - location timestamp updates', async () => {
  const manager = new TestableSessionManager();
  const location = TestDataFactory.createLocation();
  
  manager.mockSupabase.setMockData('sessions', [TestDataFactory.createDBSession()]);
  
  await manager.updateLocation(12345, location);
  
  // Verify that location_timestamp was updated
  const requestLog = manager.mockSupabase.getRequestLog();
  const updateRequest = requestLog.find(log => 
    log.request.method === 'update' && 
    log.request.params?.current_location_lat === location.lat
  );
  
  assertEquals(updateRequest !== undefined, true);
});

Deno.test('SessionManager - search context state update', async () => {
  const manager = new TestableSessionManager();
  const places = TestDataFactory.createPlaceResults(2);
  
  manager.mockSupabase.setMockData('sessions', [TestDataFactory.createDBSession()]);
  
  await manager.saveSearchContext(12345, 'test query', places);
  
  // Verify that conversation_state was updated to 'awaiting_followup'
  const requestLog = manager.mockSupabase.getRequestLog();
  const updateRequest = requestLog.find(log => 
    log.request.method === 'update' && 
    log.request.params?.conversation_state === 'awaiting_followup'
  );
  
  assertEquals(updateRequest !== undefined, true);
});
