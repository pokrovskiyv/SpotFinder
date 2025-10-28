// Shown Places Manager - manages history of shown places to avoid repetition

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DBUserShownPlace } from './types.ts';

export class ShownPlacesManager {
  private supabase: SupabaseClient;
  private readonly HISTORY_RETENTION_DAYS = 7; // Keep history for 7 days

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Add a place to user's shown history
   */
  async addShownPlace(
    userId: number,
    placeId: string,
    placeName: string,
    query: string
  ): Promise<void> {
    try {
      // Use upsert to handle duplicate entries (update shown_at timestamp)
      const { error } = await this.supabase
        .from('user_shown_places')
        .upsert({
          user_id: userId,
          place_id: placeId,
          place_name: placeName,
          search_query: query,
          shown_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,place_id',
        });

      if (error) {
        console.error('Failed to add shown place:', error);
        // Don't throw - this is not critical
      }
    } catch (error) {
      console.error('Error in addShownPlace:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Get list of place IDs shown to user in the last N days
   */
  async getShownPlaces(userId: number, days: number = 7): Promise<string[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('user_shown_places')
        .select('place_id')
        .eq('user_id', userId)
        .gte('shown_at', cutoffDate.toISOString());

      if (error) {
        console.error('Failed to get shown places:', error);
        return [];
      }

      return data?.map(row => row.place_id) || [];
    } catch (error) {
      console.error('Error in getShownPlaces:', error);
      return [];
    }
  }

  /**
   * Clear user's shown places history
   */
  async clearHistory(userId: number): Promise<void> {
    const { error } = await this.supabase
      .from('user_shown_places')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to clear history: ${error.message}`);
    }
  }

  /**
   * Cleanup old records (older than HISTORY_RETENTION_DAYS)
   * Should be called periodically by a cron job
   */
  async cleanupOldRecords(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.HISTORY_RETENTION_DAYS);

      const { error } = await this.supabase
        .from('user_shown_places')
        .delete()
        .lt('shown_at', cutoffDate.toISOString());

      if (error) {
        console.error('Failed to cleanup old records:', error);
      } else {
        console.log('Successfully cleaned up old shown places records');
      }
    } catch (error) {
      console.error('Error in cleanupOldRecords:', error);
    }
  }
}

