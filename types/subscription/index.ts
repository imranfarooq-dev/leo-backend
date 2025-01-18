import { Database } from '@/database.types';

export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type SubscriptionStatusType =
  Database['public']['Enums']['subscription_status'];

export enum FreePlanStatus {
  NeverSubscribed = 'never_subscribed',
  PreviouslySubscribed = 'previously_subscribed',
  Subscribed = 'subscribed',
}
