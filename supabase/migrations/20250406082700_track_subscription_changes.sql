BEGIN;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS "cancel_at_period_end" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "scheduled_plan_change" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "scheduled_price_id" text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "scheduled_effective_date" timestamp with time zone DEFAULT NULL;

COMMIT;
