// Place Cache Manager - manages place data caching for API optimization

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DBPlaceCache, PlaceResult, Location, GeminiResponse } from './types.ts';

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

  /**
   * Generate MD5-like hash for query (simple hash for demo)
   */
  private generateQueryHash(query: string): string {
    // Simple hash function (for production, use crypto library)
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Generate hash for location (rounded to 0.01 degrees for caching nearby searches)
   */
  private generateLocationHash(lat: number, lon: number): string {
    const roundedLat = Math.round(lat * 100) / 100;
    const roundedLon = Math.round(lon * 100) / 100;
    return `${roundedLat},${roundedLon}`;
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(query: string, location: Location): Promise<GeminiResponse | null> {
    try {
      const queryHash = this.generateQueryHash(query.toLowerCase().trim());
      const locationHash = this.generateLocationHash(location.lat, location.lon);

      const { data, error } = await this.supabase
        .from('search_results_cache')
        .select('*')
        .eq('query_hash', queryHash)
        .eq('location_hash', locationHash)
        .single();

      if (error || !data) {
        return null;
      }

      // Check if cache is still valid
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        console.log(`Search cache expired for query: ${query}`);
        return null;
      }

      console.log(`✓ Search cache hit for query: ${query}`);
      return data.results as GeminiResponse;
    } catch (error) {
      console.error('Error reading search cache:', error);
      return null;
    }
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(query: string, location: Location, results: GeminiResponse): Promise<void> {
    try {
      const queryHash = this.generateQueryHash(query.toLowerCase().trim());
      const locationHash = this.generateLocationHash(location.lat, location.lon);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours

      const cacheData = {
        query_hash: queryHash,
        location_hash: locationHash,
        results: results,
        cached_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      };

      const { error } = await this.supabase
        .from('search_results_cache')
        .upsert(cacheData, {
          onConflict: 'query_hash,location_hash',
        });

      if (error) {
        console.error('Failed to cache search results:', error);
      } else {
        console.log(`✓ Cached search results for query: ${query} until ${expiresAt.toISOString()}`);
      }
    } catch (error) {
      console.error('Error caching search results:', error);
      // Don't throw - caching is not critical
    }
  }

  /**
   * Get cached geocoding result for a city
   */
  async getCachedGeocode(cityName: string): Promise<Location | null> {
    try {
      const normalizedName = cityName.toLowerCase().trim();

      const { data, error } = await this.supabase
        .from('geocoding_cache')
        .select('*')
        .eq('city_name', normalizedName)
        .single();

      if (error || !data) {
        return null;
      }

      console.log(`✓ Geocoding cache hit for city: ${cityName}`);
      return {
        lat: data.latitude,
        lon: data.longitude,
      };
    } catch (error) {
      console.error('Error reading geocoding cache:', error);
      return null;
    }
  }

  /**
   * Cache geocoding result for a city (long-term)
   */
  async cacheGeocode(cityName: string, location: Location): Promise<void> {
    try {
      const normalizedName = cityName.toLowerCase().trim();
      const now = new Date();

      const cacheData = {
        city_name: normalizedName,
        latitude: location.lat,
        longitude: location.lon,
        cached_at: now.toISOString(),
      };

      const { error } = await this.supabase
        .from('geocoding_cache')
        .upsert(cacheData, {
          onConflict: 'city_name',
        });

      if (error) {
        console.error('Failed to cache geocoding:', error);
      } else {
        console.log(`✓ Cached geocoding for city: ${cityName}`);
      }
    } catch (error) {
      console.error('Error caching geocoding:', error);
      // Don't throw - caching is not critical
    }
  }
}


