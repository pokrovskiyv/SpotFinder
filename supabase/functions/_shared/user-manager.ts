// User Manager - manages user data in database

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DBUser, DBUserPreferences, TelegramUser } from './types.ts';

export class UserManager {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get or create user from Telegram data
   */
  async getOrCreateUser(telegramUser: TelegramUser): Promise<DBUser> {
    // Try to get existing user
    const { data: existing, error: fetchError } = await this.supabase
      .from('users')
      .select('*')
      .eq('user_id', telegramUser.id)
      .single();

    if (existing && !fetchError) {
      // Update last_seen
      await this.updateLastSeen(telegramUser.id);
      return existing as DBUser;
    }

    // Create new user
    const newUser: Partial<DBUser> = {
      user_id: telegramUser.id,
      telegram_username: telegramUser.username || null,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name || null,
      language_code: telegramUser.language_code || 'ru',
    };

    const { data: created, error: createError } = await this.supabase
      .from('users')
      .insert(newUser)
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    return created as DBUser;
  }

  /**
   * Update last_seen timestamp
   */
  async updateLastSeen(userId: number): Promise<void> {
    await this.supabase
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: number): Promise<DBUserPreferences | null> {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as DBUserPreferences;
  }

  /**
   * Create or update user preferences
   */
  async updatePreferences(
    userId: number,
    preferences: Partial<DBUserPreferences>
  ): Promise<void> {
    // Check if preferences exist
    const existing = await this.getUserPreferences(userId);

    if (existing) {
      // Update existing
      await this.supabase
        .from('user_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } else {
      // Create new
      await this.supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          ...preferences,
        });
    }
  }

  /**
   * Append to profile notes (for learning user preferences)
   */
  async appendProfileNote(userId: number, note: string): Promise<void> {
    const prefs = await this.getUserPreferences(userId);
    const currentNotes = prefs?.profile_notes || '';
    
    const newNotes = currentNotes
      ? `${currentNotes}; ${note}`
      : note;

    await this.updatePreferences(userId, {
      profile_notes: newNotes,
    });
  }
}

