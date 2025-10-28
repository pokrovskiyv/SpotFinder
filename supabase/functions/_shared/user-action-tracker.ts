// User Action Tracker - tracks user actions for analytics

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DBUserAction } from './types.ts';

export type ActionType = 'view_reviews' | 'view_route' | 'click_maps' | 'select_place' | 'donation';

export class UserActionTracker {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Track a user action
   */
  async trackAction(
    userId: number,
    actionType: ActionType,
    metadata?: {
      placeId?: string;
      searchId?: string;
      [key: string]: any;
    }
  ): Promise<void> {
    try {
      const actionData = {
        user_id: userId,
        action_type: actionType,
        place_id: metadata?.placeId || null,
        search_id: metadata?.searchId || null,
        metadata: metadata || null,
      };

      const { error } = await this.supabase
        .from('user_actions')
        .insert(actionData);

      if (error) {
        console.error('Failed to track action:', error);
      } else {
        console.log(`Tracked action: ${actionType} for user ${userId}`);
      }
    } catch (error) {
      console.error('Error tracking action:', error);
      // Don't throw - tracking is not critical
    }
  }

  /**
   * Get recent actions for a user
   */
  async getRecentActions(userId: number, limit: number = 10): Promise<DBUserAction[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_actions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get recent actions:', error);
        return [];
      }

      return (data as DBUserAction[]) || [];
    } catch (error) {
      console.error('Error getting recent actions:', error);
      return [];
    }
  }

  /**
   * Get popular places for a user (most viewed/selected)
   */
  async getPopularPlaces(userId: number, limit: number = 5): Promise<{ place_id: string; count: number }[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_actions')
        .select('place_id')
        .eq('user_id', userId)
        .in('action_type', ['view_reviews', 'select_place'])
        .not('place_id', 'is', null);

      if (error) {
        console.error('Failed to get popular places:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Count occurrences of each place_id
      const placeCounts = new Map<string, number>();
      data.forEach((action: any) => {
        if (action.place_id) {
          const count = placeCounts.get(action.place_id) || 0;
          placeCounts.set(action.place_id, count + 1);
        }
      });

      // Convert to array and sort by count
      const sortedPlaces = Array.from(placeCounts.entries())
        .map(([place_id, count]) => ({ place_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return sortedPlaces;
    } catch (error) {
      console.error('Error getting popular places:', error);
      return [];
    }
  }

  /**
   * Get action counts by type for a user
   */
  async getActionCounts(userId: number): Promise<Record<ActionType, number>> {
    try {
      const { data, error } = await this.supabase
        .from('user_actions')
        .select('action_type')
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to get action counts:', error);
        return {
          view_reviews: 0,
          view_route: 0,
          click_maps: 0,
          select_place: 0,
          donation: 0,
        };
      }

      // Count actions by type
      const counts: Record<string, number> = {};
      data?.forEach((action: any) => {
        counts[action.action_type] = (counts[action.action_type] || 0) + 1;
      });

      return {
        view_reviews: counts.view_reviews || 0,
        view_route: counts.view_route || 0,
        click_maps: counts.click_maps || 0,
        select_place: counts.select_place || 0,
        donation: counts.donation || 0,
      };
    } catch (error) {
      console.error('Error getting action counts:', error);
      return {
        view_reviews: 0,
        view_route: 0,
        click_maps: 0,
        select_place: 0,
        donation: 0,
      };
    }
  }

  /**
   * Update search_history with selected place
   */
  async updateSearchWithSelection(userId: number, placeId: string): Promise<void> {
    try {
      // Find the most recent search for this user
      const { data: recentSearch, error: searchError } = await this.supabase
        .from('search_history')
        .select('search_id')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (searchError || !recentSearch) {
        console.warn('No recent search found to update with selection');
        return;
      }

      // Update the search with selected place
      const { error: updateError } = await this.supabase
        .from('search_history')
        .update({ selected_place_id: placeId })
        .eq('search_id', recentSearch.search_id);

      if (updateError) {
        console.error('Failed to update search with selection:', updateError);
      } else {
        console.log(`Updated search ${recentSearch.search_id} with selected place ${placeId}`);
      }
    } catch (error) {
      console.error('Error updating search with selection:', error);
    }
  }
}


