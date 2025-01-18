create sequence "public"."notes_id_seq";

create table "public"."notes" (
    "id" integer not null default nextval('notes_id_seq'::regclass),
    "notes_text" text,
    "image_id" integer,
    "created_at" timestamp without time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone default CURRENT_TIMESTAMP
);


alter sequence "public"."notes_id_seq" owned by "public"."notes"."id";

CREATE UNIQUE INDEX notes_image_id_key ON public.notes USING btree (image_id);

CREATE UNIQUE INDEX notes_pkey ON public.notes USING btree (id);

alter table "public"."notes" add constraint "notes_pkey" PRIMARY KEY using index "notes_pkey";

alter table "public"."notes" add constraint "fk_image" FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE not valid;

alter table "public"."notes" validate constraint "fk_image";

alter table "public"."notes" add constraint "notes_image_id_key" UNIQUE using index "notes_image_id_key";

grant delete on table "public"."notes" to "anon";

grant insert on table "public"."notes" to "anon";

grant references on table "public"."notes" to "anon";

grant select on table "public"."notes" to "anon";

grant trigger on table "public"."notes" to "anon";

grant truncate on table "public"."notes" to "anon";

grant update on table "public"."notes" to "anon";

grant delete on table "public"."notes" to "authenticated";

grant insert on table "public"."notes" to "authenticated";

grant references on table "public"."notes" to "authenticated";

grant select on table "public"."notes" to "authenticated";

grant trigger on table "public"."notes" to "authenticated";

grant truncate on table "public"."notes" to "authenticated";

grant update on table "public"."notes" to "authenticated";

grant delete on table "public"."notes" to "service_role";

grant insert on table "public"."notes" to "service_role";

grant references on table "public"."notes" to "service_role";

grant select on table "public"."notes" to "service_role";

grant trigger on table "public"."notes" to "service_role";

grant truncate on table "public"."notes" to "service_role";

grant update on table "public"."notes" to "service_role";

CREATE TRIGGER set_timestamp_notes BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION sync_lastmod();


