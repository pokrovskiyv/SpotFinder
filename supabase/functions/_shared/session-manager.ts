// Session Manager - manages user sessions and state

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DBSession, Location, PlaceResult, ConversationState } from './types.ts';
import { isLocationValid } from './utils.ts';

export class SessionManager {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get or create session for user
   */
  async getOrCreateSession(userId: number): Promise<DBSession> {
    // Try to get existing session
    const { data: existing, error: fetchError } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing && !fetchError) {
      return existing as DBSession;
    }

    // Create new session
    const newSession: Partial<DBSession> = {
      user_id: userId,
      conversation_state: 'awaiting_location',
    };

    const { data: created, error: createError } = await this.supabase
      .from('sessions')
      .insert(newSession)
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create session: ${createError.message}`);
    }

    return created as DBSession;
  }

  /**
   * Get session by user ID
   */
  async getSession(userId: number): Promise<DBSession | null> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data as DBSession;
  }

  /**
   * Update location in session
   */
  async updateLocation(userId: number, location: Location): Promise<void> {
    const { error } = await this.supabase
      .from('sessions')
      .update({
        current_location_lat: location.lat,
        current_location_lon: location.lon,
        location_timestamp: new Date().toISOString(),
        conversation_state: 'default',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update location: ${error.message}`);
    }
  }

  /**
   * Get valid location from session (returns null if expired)
   */
  async getValidLocation(userId: number): Promise<Location | null> {
    const session = await this.getSession(userId);
    
    if (!session || !session.current_location_lat || !session.current_location_lon) {
      return null;
    }

    // Check if location is still valid
    if (!isLocationValid(session.location_timestamp)) {
      return null;
    }

    return {
      lat: session.current_location_lat,
      lon: session.current_location_lon,
    };
  }

  /**
   * Update conversation state
   */
  async updateState(userId: number, state: ConversationState): Promise<void> {
    const { error } = await this.supabase
      .from('sessions')
      .update({
        conversation_state: state,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update state: ${error.message}`);
    }
  }

  /**
   * Save search results and query to session
   */
  async saveSearchContext(
    userId: number,
    query: string,
    results: PlaceResult[],
    geminiResponseText?: string
  ): Promise<string | null> {
    // Update session
    const { error: sessionError } = await this.supabase
      .from('sessions')
      .update({
        last_query: query,
        last_results: results,
        conversation_state: 'awaiting_followup',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (sessionError) {
      throw new Error(`Failed to save search context: ${sessionError.message}`);
    }

    // Save to search history and return search_id
    return await this.saveSearchHistory(userId, query, results, geminiResponseText);
  }

  /**
   * Save search to history table
   */
  async saveSearchHistory(
    userId: number,
    query: string,
    results: PlaceResult[],
    geminiResponseText?: string
  ): Promise<string | null> {
    // Get current location from session
    const session = await this.getSession(userId);
    if (!session) {
      console.error('No session found for user:', userId);
      return null;
    }

    // Extract place IDs from results
    const placeIds = results
      .map(r => r.place_id)
      .filter((id): id is string => id !== undefined && id !== null);

    const { data, error } = await this.supabase
      .from('search_history')
      .insert({
        user_id: userId,
        query_text: query,
        location_lat: session.current_location_lat,
        location_lon: session.current_location_lon,
        gemini_response_text: geminiResponseText || null,
        returned_place_ids: placeIds.length > 0 ? placeIds : null,
        results_count: results.length,
        top_result: results.length > 0 ? results[0] : null,
      })
      .select('search_id')
      .single();

    if (error) {
      console.error('Failed to save search history:', error);
      // Don't throw - this is not critical
      return null;
    }

    return data?.search_id || null;
  }

  /**
   * Get last search results from session
   */
  async getLastResults(userId: number): Promise<PlaceResult[] | null> {
    const session = await this.getSession(userId);
    return session?.last_results || null;
  }

  /**
   * Clear session (logout/reset)
   */
  async clearSession(userId: number): Promise<void> {
    const { error } = await this.supabase
      .from('sessions')
      .update({
        current_location_lat: null,
        current_location_lon: null,
        location_timestamp: null,
        last_query: null,
        last_results: null,
        conversation_state: 'default',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to clear session: ${error.message}`);
    }
  }

  /**
   * Check if user needs to share location
   */
  async needsLocation(userId: number): Promise<boolean> {
    const location = await this.getValidLocation(userId);
    return location === null;
  }
}

