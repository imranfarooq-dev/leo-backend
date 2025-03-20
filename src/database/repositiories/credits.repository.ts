import { Inject, Logger } from '@nestjs/common';
import { Provides, Tables } from '@/src/shared/constant';
import { SupabaseClient } from '@supabase/supabase-js';
import { Credit } from '@/types/credit';
import { calculateUpdatedCredits } from '@/src/utils';

export class CreditsRepository {
  private readonly logger: Logger = new Logger(CreditsRepository.name);
  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
  ) {}

  async fetchUserCredits(userId: string): Promise<Credit | null> {
    try {
      const { data } = await this.supabase
        .from(Tables.Credits)
        .select()
        .eq('user_id', userId)
        .maybeSingle();

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to get user credits');
    }
  }

  async createCredits(userId: string): Promise<Credit | null> {
    try {
      const { data } = await this.supabase
        .from(Tables.Credits)
        .insert({
          user_id: userId,
          monthly_credits: 0,
          lifetime_credits: 0,
          image_limits: 0,
        })
        .select()
        .maybeSingle();

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to get user subscription');
    }
  }

  async updateCredits(userId: string, credits: Partial<Credit>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(Tables.Credits)
        .update(credits)
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update user credits');
    }
  }

  async deductCredits(userId: string, cost: number): Promise<Credit | null> {
    try {
      const { data: currentCredits, error: fetchError } = await this.supabase
        .from(Tables.Credits)
        .select()
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const { monthly_credits, lifetime_credits } = calculateUpdatedCredits(
        cost,
        currentCredits.monthly_credits,
        currentCredits.lifetime_credits,
      );

      const { data: updatedCredits, error: updateError } = await this.supabase
        .from(Tables.Credits)
        .update({
          monthly_credits,
          lifetime_credits,
        })
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (updateError) {
        throw new Error(updateError.message);
      }

      return updatedCredits;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update user credits');
      throw error;
    }
  }
}
