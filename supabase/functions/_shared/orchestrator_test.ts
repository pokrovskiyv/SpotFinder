// Integration tests for orchestrator.ts

import { assertEquals, assertThrows } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { Orchestrator } from './orchestrator.ts';
import { 
  MockSupabaseClient, 
  TestDataFactory, 
  TestEnvironment 
} from './test-utils.ts';
import { 
  GeminiMock, 
  GeminiMockResponses 
} from './mocks/gemini-mock.ts';
import { 
  TelegramMock, 
  TelegramMockResponses,
  TelegramUpdateFactory 
} from './mocks/telegram-mock.ts';
import { 
  MapsMock, 
  MapsMockResponses 
} from './mocks/maps-mock.ts';

// Testable orchestrator with mocked dependencies
class TestableOrchestrator extends Orchestrator {
  public mockSupabase: MockSupabaseClient;
  public mockGemini: GeminiMock;
  public mockTelegram: TelegramMock;
  public mockMaps: MapsMock;

  constructor() {
    super('test-url', 'test-key', 'test-token', 'test-gemini', 'test-maps');
    
    this.mockSupabase = new MockSupabaseClient();
    this.mockGemini = new GeminiMock();
    this.mockTelegram = new TelegramMock();
    this.mockMaps = new MapsMock();
    
    // Replace dependencies with mocks
    (this as any).sessionManager.supabase = this.mockSupabase;
    (this as any).userManager.supabase = this.mockSupabase;
    (this as any).geminiClient = this.mockGemini;
    (this as any).telegramClient = this.mockTelegram;
    (this as any).mapsClient = this.mockMaps;
  }
}

Deno.test('Orchestrator - processUpdate /start command', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createStartCommand();
  
  // Mock successful responses
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  // Should not throw
  await orchestrator.processUpdate(update);
  
  // Verify welcome message was sent
  const sentMessages = orchestrator.mockTelegram.getSentMessages();
  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0].text.includes('Привет'), true);
});

Deno.test('Orchestrator - processUpdate /help command', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createHelpCommand();
  
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  const sentMessages = orchestrator.mockTelegram.getSentMessages();
  assertEquals(sentMessages.length, 1);
});

Deno.test('Orchestrator - processUpdate /location command', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createLocationCommand();
  
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  const sentMessages = orchestrator.mockTelegram.getSentMessages();
  assertEquals(sentMessages.length, 1);
});

Deno.test('Orchestrator - processUpdate location sharing', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createLocationMessage(55.7558, 37.6176);
  
  // Mock database operations
  orchestrator.mockSupabase.setMockData('users', []);
  orchestrator.mockSupabase.setMockData('sessions', []);
  
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  const sentMessages = orchestrator.mockTelegram.getSentMessages();
  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0].text.includes('получил'), true);
});

Deno.test('Orchestrator - processUpdate text query with location', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createTextMessage('найди кафе');
  
  // Mock database operations
  orchestrator.mockSupabase.setMockData('users', []);
  const session = TestDataFactory.createDBSession({
    current_location_lat: 55.7558,
    current_location_lon: 37.6176,
    location_timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  });
  orchestrator.mockSupabase.setMockData('sessions', [session]);
  
  // Mock AI and Maps responses
  orchestrator.mockGemini.setMockResponse('restaurant_search', GeminiMockResponses.restaurantSearch());
  orchestrator.mockMaps.setMockResponse('text_restaurant_current', MapsMockResponses.restaurantSearch());
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  const sentMessages = orchestrator.mockTelegram.getSentMessages();
  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0].text.includes('нашел'), true);
});

Deno.test('Orchestrator - processUpdate text query without location', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createTextMessage('найди кафе');
  
  // Mock database operations
  orchestrator.mockSupabase.setMockData('users', []);
  const session = TestDataFactory.createDBSession({
    current_location_lat: null,
    current_location_lon: null,
    location_timestamp: null
  });
  orchestrator.mockSupabase.setMockData('sessions', [session]);
  
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  const sentMessages = orchestrator.mockTelegram.getSentMessages();
  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0].text.includes('геолокацию'), true);
});

Deno.test('Orchestrator - processUpdate follow-up question', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createTextMessage('у первого есть парковка?');
  
  // Mock database operations
  orchestrator.mockSupabase.setMockData('users', []);
  const places = TestDataFactory.createPlaceResults(3);
  const session = TestDataFactory.createDBSession({
    current_location_lat: 55.7558,
    current_location_lon: 37.6176,
    location_timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    last_results: places,
    conversation_state: 'awaiting_followup'
  });
  orchestrator.mockSupabase.setMockData('sessions', [session]);
  
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  const sentMessages = orchestrator.mockTelegram.getSentMessages();
  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0].text.includes('парковк'), true);
});

Deno.test('Orchestrator - processUpdate callback query', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createCallbackQuery('info_0_test_place_id');
  
  // Mock database operations
  orchestrator.mockSupabase.setMockData('users', []);
  const places = TestDataFactory.createPlaceResults(3);
  const session = TestDataFactory.createDBSession({
    last_results: places
  });
  orchestrator.mockSupabase.setMockData('sessions', [session]);
  
  orchestrator.mockTelegram.setMockResponse('answerCallbackQuery', TelegramMockResponses.callbackAnswered());
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  const sentMessages = orchestrator.mockTelegram.getSentMessages();
  assertEquals(sentMessages.length, 1);
});

Deno.test('Orchestrator - processUpdate error handling', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createTextMessage('test query');
  
  // Mock database error
  orchestrator.mockSupabase.setMockError('users', new Error('Database error'));
  
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  // Should send error message to user
  const sentMessages = orchestrator.mockTelegram.getSentMessages();
  assertEquals(sentMessages.length, 1);
});

Deno.test('Orchestrator - processUpdate AI error fallback', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createTextMessage('найди кафе');
  
  // Mock database operations
  orchestrator.mockSupabase.setMockData('users', []);
  const session = TestDataFactory.createDBSession({
    current_location_lat: 55.7558,
    current_location_lon: 37.6176,
    location_timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  });
  orchestrator.mockSupabase.setMockData('sessions', [session]);
  
  // Mock AI error
  orchestrator.mockGemini.setMockError('restaurant_search', new Error('AI service unavailable'));
  orchestrator.mockMaps.setMockResponse('nearby_restaurant_current', MapsMockResponses.restaurantSearch());
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  const sentMessages = orchestrator.mockTelegram.getSentMessages();
  assertEquals(sentMessages.length, 1);
});

Deno.test('Orchestrator - processUpdate Maps error handling', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createTextMessage('найди кафе');
  
  // Mock database operations
  orchestrator.mockSupabase.setMockData('users', []);
  const session = TestDataFactory.createDBSession({
    current_location_lat: 55.7558,
    current_location_lon: 37.6176,
    location_timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  });
  orchestrator.mockSupabase.setMockData('sessions', [session]);
  
  // Mock AI success but Maps error
  orchestrator.mockGemini.setMockResponse('restaurant_search', GeminiMockResponses.restaurantSearch());
  orchestrator.mockMaps.setMockError('text_restaurant_current', new Error('Maps API error'));
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  const sentMessages = orchestrator.mockTelegram.getSentMessages();
  assertEquals(sentMessages.length, 1);
});

Deno.test('Orchestrator - processUpdate empty search results', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createTextMessage('найди несуществующее место');
  
  // Mock database operations
  orchestrator.mockSupabase.setMockData('users', []);
  const session = TestDataFactory.createDBSession({
    current_location_lat: 55.7558,
    current_location_lon: 37.6176,
    location_timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  });
  orchestrator.mockSupabase.setMockData('sessions', [session]);
  
  // Mock AI success but empty Maps results
  orchestrator.mockGemini.setMockResponse('search_query', GeminiMockResponses.restaurantSearch());
  orchestrator.mockMaps.setMockResponse('text_query_current', MapsMockResponses.emptyResults());
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  const sentMessages = orchestrator.mockTelegram.getSentMessages();
  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0].text.includes('ничего не нашел'), true);
});

Deno.test('Orchestrator - processUpdate ambiguous query', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createTextMessage('что-то непонятное');
  
  // Mock database operations
  orchestrator.mockSupabase.setMockData('users', []);
  const session = TestDataFactory.createDBSession({
    current_location_lat: 55.7558,
    current_location_lon: 37.6176,
    location_timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  });
  orchestrator.mockSupabase.setMockData('sessions', [session]);
  
  // Mock AI ambiguous response
  orchestrator.mockGemini.setMockResponse('ambiguous_query', GeminiMockResponses.ambiguousQuery());
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  const sentMessages = orchestrator.mockTelegram.getSentMessages();
  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0].text.includes('Уточните'), true);
});

Deno.test('Orchestrator - processUpdate expired location', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createTextMessage('найди кафе');
  
  // Mock database operations
  orchestrator.mockSupabase.setMockData('users', []);
  const expiredTimestamp = new Date(Date.now() - 25 * 60 * 1000).toISOString(); // 25 minutes ago
  const session = TestDataFactory.createDBSession({
    current_location_lat: 55.7558,
    current_location_lon: 37.6176,
    location_timestamp: expiredTimestamp
  });
  orchestrator.mockSupabase.setMockData('sessions', [session]);
  
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  const sentMessages = orchestrator.mockTelegram.getSentMessages();
  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0].text.includes('геолокацию'), true);
});

Deno.test('Orchestrator - processUpdate unknown command', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createTextMessage('/unknown');
  
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  const sentMessages = orchestrator.mockTelegram.getSentMessages();
  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0].text.includes('Неизвестная команда'), true);
});

Deno.test('Orchestrator - processUpdate user creation', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createStartCommand();
  
  // Mock empty users table (new user)
  orchestrator.mockSupabase.setMockData('users', []);
  orchestrator.mockSupabase.setMockData('sessions', []);
  
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  // Verify user was created
  const requestLog = orchestrator.mockSupabase.getRequestLog();
  const insertRequest = requestLog.find(log => 
    log.request.method === 'insert' && 
    log.request.params?.user_id === update.message.from.id
  );
  
  assertEquals(insertRequest !== undefined, true);
});

Deno.test('Orchestrator - processUpdate session creation', async () => {
  const orchestrator = new TestableOrchestrator();
  const update = TelegramUpdateFactory.createStartCommand();
  
  // Mock empty sessions table (new session)
  orchestrator.mockSupabase.setMockData('users', [TestDataFactory.createDBUser()]);
  orchestrator.mockSupabase.setMockData('sessions', []);
  
  orchestrator.mockTelegram.setMockResponse('sendMessage', TelegramMockResponses.messageSent());
  
  await orchestrator.processUpdate(update);
  
  // Verify session was created
  const requestLog = orchestrator.mockSupabase.getRequestLog();
  const insertRequest = requestLog.find(log => 
    log.request.method === 'insert' && 
    log.request.params?.user_id === update.message.from.id
  );
  
  assertEquals(insertRequest !== undefined, true);
});
