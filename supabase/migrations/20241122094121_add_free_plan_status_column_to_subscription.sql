create type "public"."plan_status" as enum ('never_subscribed', 'previously_subscribed', 'subscribed');

alter table "public"."subscriptions" add column "free_plan_status" plan_status not null default 'never_subscribed'::plan_status;


