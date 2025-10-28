// Place Cache Manager - manages place data caching for API optimization

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DBPlaceCache, PlaceResult } from './types.ts';

export class PlaceCacheManager {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get cached place by place_id
   */
  async getCachedPlace(placeId: string): Promise<PlaceResult | null> {
    try {
      const { data, error } = await this.supabase
        .from('places_cache')
        .select('*')
        .eq('place_id', placeId)
        .single();

      if (error || !data) {
        return null;
      }

      const cached = data as DBPlaceCache;

      // Check if cache is still valid
      const expiresAt = new Date(cached.cache_expires_at);
      if (expiresAt < new Date()) {
        console.log(`Cache expired for place ${placeId}`);
        return null;
      }

      // Return cached place data
      return cached.google_data_jsonb;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  /**
   * Check if place cache is valid
   */
  async isPlaceCacheValid(placeId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('places_cache')
        .select('cache_expires_at')
        .eq('place_id', placeId)
        .single();

      if (error || !data) {
        return false;
      }

      const expiresAt = new Date(data.cache_expires_at);
      return expiresAt > new Date();
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }

  /**
   * Cache place details
   */
  async cachePlace(place: PlaceResult): Promise<void> {
    if (!place.place_id) {
      console.warn('Cannot cache place without place_id');
      return;
    }

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      // Extract location coordinates for PostGIS
      const location = place.geometry?.location
        ? `POINT(${place.geometry.location.lng} ${place.geometry.location.lat})`
        : null;

      const cacheData = {
        place_id: place.place_id,
        name: place.name || 'Без названия',
        address: place.address || null,
        location: location,
        google_data_jsonb: place,
        last_fetched_at: now.toISOString(),
        cache_expires_at: expiresAt.toISOString(),
      };

      // Upsert (insert or update)
      const { error } = await this.supabase
        .from('places_cache')
        .upsert(cacheData, {
          onConflict: 'place_id',
        });

      if (error) {
        console.error('Failed to cache place:', error);
      } else {
        console.log(`Cached place ${place.place_id} until ${expiresAt.toISOString()}`);
      }
    } catch (error) {
      console.error('Error caching place:', error);
      // Don't throw - caching is not critical
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanExpiredCache(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('places_cache')
        .delete()
        .lt('cache_expires_at', new Date().toISOString())
        .select('place_id');

      if (error) {
        console.error('Failed to clean expired cache:', error);
        return 0;
      }

      const deletedCount = data?.length || 0;
      if (deletedCount > 0) {
        console.log(`Cleaned ${deletedCount} expired cache entries`);
      }
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ total: number; expired: number; valid: number }> {
    try {
      const now = new Date().toISOString();

      // Total entries
      const { count: total, error: totalError } = await this.supabase
        .from('places_cache')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        console.error('Error getting total count:', totalError);
        return { total: 0, expired: 0, valid: 0 };
      }

      // Expired entries
      const { count: expired, error: expiredError } = await this.supabase
        .from('places_cache')
        .select('*', { count: 'exact', head: true })
        .lt('cache_expires_at', now);

      if (expiredError) {
        console.error('Error getting expired count:', expiredError);
        return { total: total || 0, expired: 0, valid: total || 0 };
      }

      return {
        total: total || 0,
        expired: expired || 0,
        valid: (total || 0) - (expired || 0),
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { total: 0, expired: 0, valid: 0 };
    }
  }
}


