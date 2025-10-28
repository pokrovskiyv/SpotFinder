// Donation Manager - handles Telegram Stars donation storage and retrieval

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { DBDonation } from './types.ts';

export class DonationManager {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    console.log('DonationManager: Initialized');
  }

  /**
   * Create a new donation record
   */
  async createDonation(
    userId: number,
    amount: number,
    telegramChargeId: string
  ): Promise<DBDonation> {
    console.log(`Creating donation: userId=${userId}, amount=${amount} Stars`);

    const { data, error } = await this.supabase
      .from('donations')
      .insert({
        user_id: userId,
        amount_stars: amount,
        telegram_payment_charge_id: telegramChargeId,
        status: 'completed',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating donation:', error);
      throw new Error(`Failed to create donation: ${error.message}`);
    }

    console.log('Donation created successfully:', data);
    return data as DBDonation;
  }

  /**
   * Get all donations for a specific user
   */
  async getUserDonations(userId: number): Promise<DBDonation[]> {
    console.log(`Getting donations for userId=${userId}`);

    const { data, error } = await this.supabase
      .from('donations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting donations:', error);
      throw new Error(`Failed to get donations: ${error.message}`);
    }

    console.log(`Found ${data?.length || 0} donations for user`);
    return (data || []) as DBDonation[];
  }

  /**
   * Get total donated amount for a user
   */
  async getTotalDonations(userId: number): Promise<number> {
    console.log(`Getting total donations for userId=${userId}`);

    const { data, error } = await this.supabase
      .from('donations')
      .select('amount_stars')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (error) {
      console.error('Error getting total donations:', error);
      throw new Error(`Failed to get total donations: ${error.message}`);
    }

    const total = data?.reduce((sum, donation) => sum + donation.amount_stars, 0) || 0;
    console.log(`Total donations: ${total} Stars`);
    return total;
  }

  /**
   * Check if a donation with the given charge ID already exists
   * (to prevent duplicate payments)
   */
  async donationExists(telegramChargeId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('donations')
      .select('donation_id')
      .eq('telegram_payment_charge_id', telegramChargeId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected
      console.error('Error checking donation existence:', error);
      throw new Error(`Failed to check donation existence: ${error.message}`);
    }

    return !!data;
  }
}


