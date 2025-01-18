alter table "public"."credits" drop column "modified_at";

alter table "public"."credits" add column "updated_at" timestamp with time zone default CURRENT_TIMESTAMP;

alter table "public"."subscriptions" drop column "modified_at";

alter table "public"."subscriptions" add column "updated_at" timestamp with time zone default CURRENT_TIMESTAMP;


