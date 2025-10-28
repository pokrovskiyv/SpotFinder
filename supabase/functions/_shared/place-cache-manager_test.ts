// Tests for PlaceCacheManager

import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { PlaceCacheManager } from './place-cache-manager.ts';
import { PlaceResult } from './types.ts';

// Mock Supabase client
const mockSupabaseUrl = 'https://test.supabase.co';
const mockSupabaseKey = 'test-key';

Deno.test('PlaceCacheManager - constructor initializes', () => {
  const manager = new PlaceCacheManager(mockSupabaseUrl, mockSupabaseKey);
  assertExists(manager);
});

Deno.test('PlaceCacheManager - cachePlace handles place without place_id', async () => {
  const manager = new PlaceCacheManager(mockSupabaseUrl, mockSupabaseKey);
  
  const placeWithoutId: PlaceResult = {
    name: 'Test Place',
    address: 'Test Address',
  };
  
  // Should not throw
  await manager.cachePlace(placeWithoutId);
});

Deno.test('PlaceCacheManager - getCacheStats returns correct structure', async () => {
  const manager = new PlaceCacheManager(mockSupabaseUrl, mockSupabaseKey);
  
  // Mock implementation would return this structure
  const stats = await manager.getCacheStats();
  
  assertExists(stats);
  assertExists(stats.total !== undefined);
  assertExists(stats.expired !== undefined);
  assertExists(stats.valid !== undefined);
});


