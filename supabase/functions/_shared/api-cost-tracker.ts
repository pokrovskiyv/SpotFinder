// API Cost Tracker - monitors and limits API usage

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DBApiCostMetric, QuotaStatus } from './types.ts';
import { API_COST_LIMITS } from './constants.ts';

export type ApiProvider = 'gemini' | 'google_maps';
export type ApiType = 'search' | 'details' | 'geocode' | 'translate' | 'nearby' | 'textsearch';

export class ApiCostTracker {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Check if a user can make an API call (checks both global and user limits)
   */
  async canMakeApiCall(userId: number, apiProvider: ApiProvider): Promise<QuotaStatus> {
    try {
      // Check global limit first
      const globalStatus = await this.checkGlobalLimit(apiProvider);
      if (globalStatus.globalLimitReached) {
        return globalStatus;
      }

      // Check user limit
      const userStatus = await this.checkUserLimit(userId, apiProvider);
      return userStatus;
    } catch (error) {
      console.error('Error checking API quota:', error);
      // On error, allow the call (fail-open)
      return {
        canProceed: true,
        globalLimitReached: false,
        userLimitReached: false,
      };
    }
  }

  /**
   * Check global daily limit for an API provider
   */
  async checkGlobalLimit(apiProvider: ApiProvider): Promise<QuotaStatus> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { count, error } = await this.supabase
        .from('api_cost_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('api_provider', apiProvider)
        .eq('date', today)
        .eq('from_cache', false); // Only count real API calls

      if (error) {
        console.error('Error checking global limit:', error);
        return { canProceed: true, globalLimitReached: false, userLimitReached: false };
      }

      const limit = apiProvider === 'gemini' 
        ? API_COST_LIMITS.GLOBAL.GEMINI_CALLS_PER_DAY
        : API_COST_LIMITS.GLOBAL.MAPS_CALLS_PER_DAY;

      const callsToday = count || 0;
      const limitReached = callsToday >= limit;

      return {
        canProceed: !limitReached,
        globalLimitReached: limitReached,
        userLimitReached: false,
        remainingCalls: Math.max(0, limit - callsToday),
      };
    } catch (error) {
      console.error('Error in checkGlobalLimit:', error);
      return { canProceed: true, globalLimitReached: false, userLimitReached: false };
    }
  }

  /**
   * Check user daily limit for an API provider
   */
  async checkUserLimit(userId: number, apiProvider: ApiProvider): Promise<QuotaStatus> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { count, error } = await this.supabase
        .from('api_cost_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('api_provider', apiProvider)
        .eq('date', today)
        .eq('from_cache', false); // Only count real API calls

      if (error) {
        console.error('Error checking user limit:', error);
        return { canProceed: true, globalLimitReached: false, userLimitReached: false };
      }

      const limit = apiProvider === 'gemini'
        ? API_COST_LIMITS.PER_USER.GEMINI_CALLS_PER_DAY
        : API_COST_LIMITS.PER_USER.MAPS_CALLS_PER_DAY;

      const callsToday = count || 0;
      const limitReached = callsToday >= limit;

      return {
        canProceed: !limitReached,
        globalLimitReached: false,
        userLimitReached: limitReached,
        remainingCalls: Math.max(0, limit - callsToday),
      };
    } catch (error) {
      console.error('Error in checkUserLimit:', error);
      return { canProceed: true, globalLimitReached: false, userLimitReached: false };
    }
  }

  /**
   * Log an API call with cost estimate
   */
  async logApiCall(
    userId: number,
    apiProvider: ApiProvider,
    apiType: ApiType,
    cost: number,
    fromCache: boolean,
    quotaExceeded = false
  ): Promise<void> {
    try {
      const now = new Date();
      const metricData = {
        user_id: userId,
        api_provider: apiProvider,
        api_type: apiType,
        tokens_estimated: this.estimateTokens(apiType),
        cost_usd: cost,
        from_cache: fromCache,
        quota_exceeded: quotaExceeded,
        timestamp: now.toISOString(),
        date: now.toISOString().split('T')[0],
      };

      const { error } = await this.supabase
        .from('api_cost_metrics')
        .insert(metricData);

      if (error) {
        console.error('Failed to log API call:', error);
      } else {
        console.log(`Logged ${apiProvider}/${apiType} call for user ${userId} (cached: ${fromCache}, cost: $${cost})`);
      }
    } catch (error) {
      console.error('Error logging API call:', error);
      // Don't throw - logging is not critical
    }
  }

  /**
   * Estimate cost for an API type
   */
  estimateCost(apiType: ApiType): number {
    switch (apiType) {
      case 'search':
        return API_COST_LIMITS.COSTS_USD.GEMINI_SEARCH;
      case 'translate':
        return API_COST_LIMITS.COSTS_USD.GEMINI_TRANSLATE;
      case 'details':
        return API_COST_LIMITS.COSTS_USD.MAPS_DETAILS;
      case 'geocode':
        return API_COST_LIMITS.COSTS_USD.MAPS_GEOCODE;
      case 'nearby':
      case 'textsearch':
        return API_COST_LIMITS.COSTS_USD.MAPS_PLACES;
      default:
        return 0;
    }
  }

  /**
   * Estimate tokens for an API type (rough estimate)
   */
  private estimateTokens(apiType: ApiType): number {
    switch (apiType) {
      case 'search':
        return 500; // Average tokens for search
      case 'translate':
        return 200;
      case 'details':
      case 'geocode':
      case 'nearby':
      case 'textsearch':
        return 0; // Maps API doesn't use tokens
      default:
        return 0;
    }
  }

  /**
   * Get daily statistics
   */
  async getDailyStats(date?: string): Promise<{
    total_calls: number;
    gemini_calls: number;
    maps_calls: number;
    total_cost: number;
    cached_calls: number;
  }> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('api_cost_metrics')
        .select('api_provider, cost_usd, from_cache')
        .eq('date', targetDate);

      if (error || !data) {
        console.error('Error getting daily stats:', error);
        return { total_calls: 0, gemini_calls: 0, maps_calls: 0, total_cost: 0, cached_calls: 0 };
      }

      const stats = {
        total_calls: data.length,
        gemini_calls: data.filter(m => m.api_provider === 'gemini').length,
        maps_calls: data.filter(m => m.api_provider === 'google_maps').length,
        total_cost: data.reduce((sum, m) => sum + (m.cost_usd || 0), 0),
        cached_calls: data.filter(m => m.from_cache).length,
      };

      return stats;
    } catch (error) {
      console.error('Error in getDailyStats:', error);
      return { total_calls: 0, gemini_calls: 0, maps_calls: 0, total_cost: 0, cached_calls: 0 };
    }
  }

  /**
   * Get daily statistics for a specific user
   */
  async getUserDailyStats(userId: number, date?: string): Promise<{
    total_calls: number;
    gemini_calls: number;
    maps_calls: number;
    cached_calls: number;
  }> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('api_cost_metrics')
        .select('api_provider, from_cache')
        .eq('user_id', userId)
        .eq('date', targetDate);

      if (error || !data) {
        console.error('Error getting user daily stats:', error);
        return { total_calls: 0, gemini_calls: 0, maps_calls: 0, cached_calls: 0 };
      }

      const stats = {
        total_calls: data.length,
        gemini_calls: data.filter(m => m.api_provider === 'gemini').length,
        maps_calls: data.filter(m => m.api_provider === 'google_maps').length,
        cached_calls: data.filter(m => m.from_cache).length,
      };

      return stats;
    } catch (error) {
      console.error('Error in getUserDailyStats:', error);
      return { total_calls: 0, gemini_calls: 0, maps_calls: 0, cached_calls: 0 };
    }
  }
}

