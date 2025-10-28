// Tests for UserActionTracker

import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { UserActionTracker } from './user-action-tracker.ts';

// Mock Supabase client
const mockSupabaseUrl = 'https://test.supabase.co';
const mockSupabaseKey = 'test-key';

Deno.test('UserActionTracker - constructor initializes', () => {
  const tracker = new UserActionTracker(mockSupabaseUrl, mockSupabaseKey);
  assertExists(tracker);
});

Deno.test('UserActionTracker - trackAction handles all action types', async () => {
  const tracker = new UserActionTracker(mockSupabaseUrl, mockSupabaseKey);
  
  const userId = 12345;
  const actionTypes: Array<'view_reviews' | 'view_route' | 'click_maps' | 'select_place' | 'donation'> = [
    'view_reviews',
    'view_route',
    'click_maps',
    'select_place',
    'donation',
  ];
  
  // Should not throw for any action type
  for (const actionType of actionTypes) {
    await tracker.trackAction(userId, actionType, {
      placeId: 'test-place-id',
    });
  }
});

Deno.test('UserActionTracker - getActionCounts returns correct structure', async () => {
  const tracker = new UserActionTracker(mockSupabaseUrl, mockSupabaseKey);
  
  const userId = 12345;
  const counts = await tracker.getActionCounts(userId);
  
  assertExists(counts);
  assertExists(counts.view_reviews !== undefined);
  assertExists(counts.view_route !== undefined);
  assertExists(counts.click_maps !== undefined);
  assertExists(counts.select_place !== undefined);
  assertExists(counts.donation !== undefined);
});

Deno.test('UserActionTracker - getRecentActions accepts limit parameter', async () => {
  const tracker = new UserActionTracker(mockSupabaseUrl, mockSupabaseKey);
  
  const userId = 12345;
  
  // Should not throw with different limits
  await tracker.getRecentActions(userId, 5);
  await tracker.getRecentActions(userId, 10);
  await tracker.getRecentActions(userId, 20);
});

Deno.test('UserActionTracker - getPopularPlaces accepts limit parameter', async () => {
  const tracker = new UserActionTracker(mockSupabaseUrl, mockSupabaseKey);
  
  const userId = 12345;
  
  // Should not throw with different limits
  await tracker.getPopularPlaces(userId, 3);
  await tracker.getPopularPlaces(userId, 5);
  await tracker.getPopularPlaces(userId, 10);
});


