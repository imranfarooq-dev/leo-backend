create type "public"."subscription_status" as enum ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused');

create sequence "public"."credits_id_seq";

create sequence "public"."subscriptions_id_seq";

create table "public"."credits" (
    "id" integer not null default nextval('credits_id_seq'::regclass),
    "user_id" text not null,
    "monthly_credits" integer default 0,
    "lifetime_credits" integer default 0,
    "image_limits" integer default 0,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "modified_at" timestamp with time zone default CURRENT_TIMESTAMP
);


create table "public"."subscriptions" (
    "id" integer not null default nextval('subscriptions_id_seq'::regclass),
    "user_id" text not null,
    "stripe_customer_id" text not null,
    "status" subscription_status,
    "price" text,
    "stripe_price_id" text,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "modified_at" timestamp with time zone default CURRENT_TIMESTAMP
);


CREATE UNIQUE INDEX credits_pkey ON public.credits USING btree (id);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);

CREATE UNIQUE INDEX unique_stripe_customer ON public.subscriptions USING btree (stripe_customer_id);

CREATE UNIQUE INDEX unique_user_credits ON public.credits USING btree (user_id);

CREATE UNIQUE INDEX unique_user_subscription ON public.subscriptions USING btree (user_id);

alter table "public"."credits" add constraint "credits_pkey" PRIMARY KEY using index "credits_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."credits" add constraint "credits_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."credits" validate constraint "credits_user_id_fkey";

alter table "public"."credits" add constraint "unique_user_credits" UNIQUE using index "unique_user_credits";

alter table "public"."subscriptions" add constraint "subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_user_id_fkey";

alter table "public"."subscriptions" add constraint "unique_stripe_customer" UNIQUE using index "unique_stripe_customer";

alter table "public"."subscriptions" add constraint "unique_user_subscription" UNIQUE using index "unique_user_subscription";

grant delete on table "public"."credits" to "anon";

grant insert on table "public"."credits" to "anon";

grant references on table "public"."credits" to "anon";

grant select on table "public"."credits" to "anon";

grant trigger on table "public"."credits" to "anon";

grant truncate on table "public"."credits" to "anon";

grant update on table "public"."credits" to "anon";

grant delete on table "public"."credits" to "authenticated";

grant insert on table "public"."credits" to "authenticated";

grant references on table "public"."credits" to "authenticated";

grant select on table "public"."credits" to "authenticated";

grant trigger on table "public"."credits" to "authenticated";

grant truncate on table "public"."credits" to "authenticated";

grant update on table "public"."credits" to "authenticated";

grant delete on table "public"."credits" to "service_role";

grant insert on table "public"."credits" to "service_role";

grant references on table "public"."credits" to "service_role";

grant select on table "public"."credits" to "service_role";

grant trigger on table "public"."credits" to "service_role";

grant truncate on table "public"."credits" to "service_role";

grant update on table "public"."credits" to "service_role";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant references on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant trigger on table "public"."subscriptions" to "authenticated";

grant truncate on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";

CREATE TRIGGER set_timestamp_credits BEFORE UPDATE ON public.credits FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER set_timestamp_subscriptions BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION sync_lastmod();


