// Unit tests for utils.ts

import { assertEquals, assertThrows } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  isLocationValid,
  calculateDistance,
  formatDistance,
  extractOrdinal,
  isFollowUpQuestion,
  generateGeoHash,
  truncateText,
  safeJSONParse,
  sleep,
  getTimeContext,
  validateEnv
} from './utils.ts';
import { TestDataFactory } from './test-utils.ts';

Deno.test('isLocationValid - valid recent location', () => {
  const recentTimestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
  assertEquals(isLocationValid(recentTimestamp), true);
});

Deno.test('isLocationValid - expired location', () => {
  const expiredTimestamp = new Date(Date.now() - 25 * 60 * 1000).toISOString(); // 25 minutes ago
  assertEquals(isLocationValid(expiredTimestamp), false);
});

Deno.test('isLocationValid - null timestamp', () => {
  assertEquals(isLocationValid(null), false);
});

Deno.test('isLocationValid - invalid timestamp', () => {
  assertEquals(isLocationValid('invalid-date'), false);
});

Deno.test('calculateDistance - same location', () => {
  const location = TestDataFactory.createLocation();
  const distance = calculateDistance(location, location);
  assertEquals(distance, 0);
});

Deno.test('calculateDistance - Moscow to St Petersburg', () => {
  const moscow = { lat: 55.7558, lon: 37.6176 };
  const spb = { lat: 59.9311, lon: 30.3609 };
  const distance = calculateDistance(moscow, spb);
  
  // Distance should be approximately 635 km
  assertEquals(Math.round(distance / 1000), 635);
});

Deno.test('calculateDistance - short distance', () => {
  const point1 = { lat: 55.7558, lon: 37.6176 };
  const point2 = { lat: 55.7568, lon: 37.6186 }; // ~100m away
  const distance = calculateDistance(point1, point2);
  
  // Should be approximately 100 meters
  assertEquals(Math.round(distance), 100);
});

Deno.test('formatDistance - meters', () => {
  assertEquals(formatDistance(500), '500 м');
  assertEquals(formatDistance(999), '999 м');
});

Deno.test('formatDistance - kilometers', () => {
  assertEquals(formatDistance(1000), '1.0 км');
  assertEquals(formatDistance(1500), '1.5 км');
  assertEquals(formatDistance(2500), '2.5 км');
});

Deno.test('extractOrdinal - Russian ordinals', () => {
  assertEquals(extractOrdinal('первый'), 1);
  assertEquals(extractOrdinal('второй'), 2);
  assertEquals(extractOrdinal('третий'), 3);
  assertEquals(extractOrdinal('четвертый'), 4);
  assertEquals(extractOrdinal('пятый'), 5);
});

Deno.test('extractOrdinal - Russian ordinals with cases', () => {
  assertEquals(extractOrdinal('первая'), 1);
  assertEquals(extractOrdinal('второго'), 2);
  assertEquals(extractOrdinal('третьего'), 3);
  assertEquals(extractOrdinal('четвертой'), 4);
  assertEquals(extractOrdinal('пятой'), 5);
});

Deno.test('extractOrdinal - numeric ordinals', () => {
  assertEquals(extractOrdinal('1'), 1);
  assertEquals(extractOrdinal('2'), 2);
  assertEquals(extractOrdinal('3'), 3);
  assertEquals(extractOrdinal('4'), 4);
  assertEquals(extractOrdinal('5'), 5);
});

Deno.test('extractOrdinal - case insensitive', () => {
  assertEquals(extractOrdinal('ПЕРВЫЙ'), 1);
  assertEquals(extractOrdinal('Второй'), 2);
  assertEquals(extractOrdinal('тРЕТИЙ'), 3);
});

Deno.test('extractOrdinal - no ordinal found', () => {
  assertEquals(extractOrdinal('кафе'), null);
  assertEquals(extractOrdinal('ресторан'), null);
  assertEquals(extractOrdinal(''), null);
});

Deno.test('isFollowUpQuestion - possessive patterns', () => {
  assertEquals(isFollowUpQuestion('у него есть парковка?'), true);
  assertEquals(isFollowUpQuestion('у первого рейтинг?'), true);
  assertEquals(isFollowUpQuestion('у второго адрес?'), true);
  assertEquals(isFollowUpQuestion('у третьего часы работы?'), true);
});

Deno.test('isFollowUpQuestion - ordinal patterns', () => {
  assertEquals(isFollowUpQuestion('первый далеко?'), true);
  assertEquals(isFollowUpQuestion('второй дорогой?'), true);
  assertEquals(isFollowUpQuestion('третий открыт?'), true);
  assertEquals(isFollowUpQuestion('четвертый хороший?'), true);
  assertEquals(isFollowUpQuestion('пятый подходит?'), true);
});

Deno.test('isFollowUpQuestion - demonstrative patterns', () => {
  assertEquals(isFollowUpQuestion('этот ресторан'), true);
  assertEquals(isFollowUpQuestion('тот кафе'), true);
  assertEquals(isFollowUpQuestion('там есть'), true);
});

Deno.test('isFollowUpQuestion - directional patterns', () => {
  assertEquals(isFollowUpQuestion('туда идти'), true);
  assertEquals(isFollowUpQuestion('сюда прийти'), true);
});

Deno.test('isFollowUpQuestion - not follow-up', () => {
  assertEquals(isFollowUpQuestion('найди кафе'), false);
  assertEquals(isFollowUpQuestion('где аптека?'), false);
  assertEquals(isFollowUpQuestion('хочу поесть'), false);
});

Deno.test('generateGeoHash - basic functionality', () => {
  const location = { lat: 55.7558, lon: 37.6176 };
  const hash = generateGeoHash(location);
  assertEquals(hash, '55.756,37.618');
});

Deno.test('generateGeoHash - precision', () => {
  const location1 = { lat: 55.7558, lon: 37.6176 };
  const location2 = { lat: 55.7559, lon: 37.6177 }; // ~100m difference
  const hash1 = generateGeoHash(location1);
  const hash2 = generateGeoHash(location2);
  
  // Should be different hashes
  assertEquals(hash1 !== hash2, true);
});

Deno.test('generateGeoHash - same rounded coordinates', () => {
  const location1 = { lat: 55.7558, lon: 37.6176 };
  const location2 = { lat: 55.75585, lon: 37.61765 }; // Same when rounded to 3 decimals
  const hash1 = generateGeoHash(location1);
  const hash2 = generateGeoHash(location2);
  
  assertEquals(hash1, hash2);
});

Deno.test('truncateText - no truncation needed', () => {
  const text = 'Short text';
  const result = truncateText(text, 20);
  assertEquals(result, 'Short text');
});

Deno.test('truncateText - truncation needed', () => {
  const text = 'This is a very long text that needs to be truncated';
  const result = truncateText(text, 20);
  assertEquals(result, 'This is a very lo...');
  assertEquals(result.length, 20);
});

Deno.test('truncateText - exact length', () => {
  const text = 'Exactly twenty chars';
  const result = truncateText(text, 20);
  assertEquals(result, 'Exactly twenty chars');
});

Deno.test('safeJSONParse - valid JSON', () => {
  const json = '{"key": "value", "number": 123}';
  const result = safeJSONParse(json, {});
  assertEquals(result, { key: 'value', number: 123 });
});

Deno.test('safeJSONParse - invalid JSON', () => {
  const json = 'invalid json';
  const fallback = { default: true };
  const result = safeJSONParse(json, fallback);
  assertEquals(result, fallback);
});

Deno.test('safeJSONParse - empty string', () => {
  const json = '';
  const fallback = { empty: true };
  const result = safeJSONParse(json, fallback);
  assertEquals(result, fallback);
});

Deno.test('sleep - basic functionality', async () => {
  const start = Date.now();
  await sleep(10); // Sleep for 10ms
  const end = Date.now();
  
  // Should sleep for at least 10ms
  assertEquals(end - start >= 10, true);
});

Deno.test('getTimeContext - morning', () => {
  // Mock Date to test specific hours
  const originalDate = Date;
  globalThis.Date = class extends Date {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(2024, 0, 1, 8, 0, 0); // 8 AM
      } else {
        super(...args);
      }
    }
  } as any;
  
  const context = getTimeContext();
  assertEquals(context, 'утро');
  
  // Restore original Date
  globalThis.Date = originalDate;
});

Deno.test('getTimeContext - afternoon', () => {
  const originalDate = Date;
  globalThis.Date = class extends Date {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(2024, 0, 1, 14, 0, 0); // 2 PM
      } else {
        super(...args);
      }
    }
  } as any;
  
  const context = getTimeContext();
  assertEquals(context, 'день');
  
  globalThis.Date = originalDate;
});

Deno.test('getTimeContext - evening', () => {
  const originalDate = Date;
  globalThis.Date = class extends Date {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(2024, 0, 1, 20, 0, 0); // 8 PM
      } else {
        super(...args);
      }
    }
  } as any;
  
  const context = getTimeContext();
  assertEquals(context, 'вечер');
  
  globalThis.Date = originalDate;
});

Deno.test('getTimeContext - night', () => {
  const originalDate = Date;
  globalThis.Date = class extends Date {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(2024, 0, 1, 2, 0, 0); // 2 AM
      } else {
        super(...args);
      }
    }
  } as any;
  
  const context = getTimeContext();
  assertEquals(context, 'ночь');
  
  globalThis.Date = originalDate;
});

Deno.test('validateEnv - all required variables present', () => {
  const env = {
    TELEGRAM_BOT_TOKEN: 'test_token',
    GEMINI_API_KEY: 'test_key',
    GOOGLE_MAPS_API_KEY: 'test_maps_key',
    SUPABASE_URL: 'test_url',
    SUPABASE_SERVICE_ROLE_KEY: 'test_key'
  };
  
  const required = ['TELEGRAM_BOT_TOKEN', 'GEMINI_API_KEY'];
  
  // Should not throw
  validateEnv(env, required);
});

Deno.test('validateEnv - missing required variables', () => {
  const env = {
    TELEGRAM_BOT_TOKEN: 'test_token',
    // Missing GEMINI_API_KEY
  };
  
  const required = ['TELEGRAM_BOT_TOKEN', 'GEMINI_API_KEY'];
  
  assertThrows(
    () => validateEnv(env, required),
    Error,
    'Missing required environment variables: GEMINI_API_KEY'
  );
});

Deno.test('validateEnv - multiple missing variables', () => {
  const env = {
    TELEGRAM_BOT_TOKEN: 'test_token',
    // Missing others
  };
  
  const required = ['TELEGRAM_BOT_TOKEN', 'GEMINI_API_KEY', 'GOOGLE_MAPS_API_KEY'];
  
  assertThrows(
    () => validateEnv(env, required),
    Error,
    'Missing required environment variables: GEMINI_API_KEY, GOOGLE_MAPS_API_KEY'
  );
});

Deno.test('validateEnv - undefined values', () => {
  const env = {
    TELEGRAM_BOT_TOKEN: 'test_token',
    GEMINI_API_KEY: undefined,
    GOOGLE_MAPS_API_KEY: ''
  };
  
  const required = ['TELEGRAM_BOT_TOKEN', 'GEMINI_API_KEY', 'GOOGLE_MAPS_API_KEY'];
  
  assertThrows(
    () => validateEnv(env, required),
    Error,
    'Missing required environment variables: GEMINI_API_KEY, GOOGLE_MAPS_API_KEY'
  );
});
