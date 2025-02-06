import { Inject, Logger } from '@nestjs/common';
import { Provides, Tables } from '@/src/shared/constant';
import { SupabaseClient } from '@supabase/supabase-js';
import { SubscriptionDB } from '@/types/subscription';

export class SubscriptionRepository {
  private readonly logger: Logger = new Logger(SubscriptionRepository.name);

  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
  ) { }

  async createSubscription(
    userId: string,
    stripeCustomerId: string,
  ): Promise<SubscriptionDB> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Subscriptions)
        .insert({ user_id: userId, stripe_customer_id: stripeCustomerId })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to create subscription');
    }
  }

  async getUserSubscription(userId: string): Promise<SubscriptionDB | null> {
    try {
      const { data } = await this.supabase
        .from(Tables.Subscriptions)
        .select()
        .eq('user_id', userId)
        .maybeSingle();

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to get user subscription');
    }
  }

  async updateUserSubscription(
    userId: string,
    subscriptions: Partial<SubscriptionDB>,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(Tables.Subscriptions)
        .update(subscriptions)
        .eq('user_id', userId)

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update user subscription');
    }
  }
}
