create sequence "public"."documents_id_seq";

create sequence "public"."images_id_seq";

create sequence "public"."lists_id_seq";

create sequence "public"."transcriptions_id_seq";

create table "public"."documents" (
    "id" integer not null default nextval('documents_id_seq'::regclass),
    "list_id" integer not null,
    "document_name" character varying(255) not null,
    "creator_name" character varying(255),
    "date" character varying(255),
    "type" character varying(255),
    "archive" character varying(255),
    "collection" character varying(255),
    "box" character varying(255),
    "folder" character varying(255),
    "identifier" character varying(255),
    "rights" character varying(255),
    "created_at" timestamp without time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone default CURRENT_TIMESTAMP
);


create table "public"."images" (
    "id" integer not null default nextval('images_id_seq'::regclass),
    "document_id" integer not null,
    "image_name" character varying(255),
    "image_url" character varying(255) not null,
    "image_path" character varying(255) not null,
    "created_at" timestamp without time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone default CURRENT_TIMESTAMP
);


create table "public"."lists" (
    "id" integer not null default nextval('lists_id_seq'::regclass),
    "user_id" character varying(255) not null,
    "list_name" character varying(255) not null,
    "parent_list_id" integer,
    "created_at" timestamp without time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone default CURRENT_TIMESTAMP
);


create table "public"."transcriptions" (
    "id" integer not null default nextval('transcriptions_id_seq'::regclass),
    "image_id" integer not null,
    "transcription_text" text not null,
    "status" character varying(10) not null,
    "created_at" timestamp without time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone default CURRENT_TIMESTAMP
);


create table "public"."users" (
    "id" character varying(255) not null,
    "first_name" character varying(255),
    "last_name" character varying(255),
    "email_address" character varying(255) not null,
    "created_at" timestamp without time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone default CURRENT_TIMESTAMP
);


alter sequence "public"."documents_id_seq" owned by "public"."documents"."id";

alter sequence "public"."images_id_seq" owned by "public"."images"."id";

alter sequence "public"."lists_id_seq" owned by "public"."lists"."id";

alter sequence "public"."transcriptions_id_seq" owned by "public"."transcriptions"."id";

CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id);

CREATE UNIQUE INDEX images_pkey ON public.images USING btree (id);

CREATE UNIQUE INDEX lists_pkey ON public.lists USING btree (id);

CREATE UNIQUE INDEX transcriptions_pkey ON public.transcriptions USING btree (id);

CREATE UNIQUE INDEX users_email_address_key ON public.users USING btree (email_address);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."documents" add constraint "documents_pkey" PRIMARY KEY using index "documents_pkey";

alter table "public"."images" add constraint "images_pkey" PRIMARY KEY using index "images_pkey";

alter table "public"."lists" add constraint "lists_pkey" PRIMARY KEY using index "lists_pkey";

alter table "public"."transcriptions" add constraint "transcriptions_pkey" PRIMARY KEY using index "transcriptions_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."documents" add constraint "documents_list_id_fkey" FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE not valid;

alter table "public"."documents" validate constraint "documents_list_id_fkey";

alter table "public"."images" add constraint "images_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE not valid;

alter table "public"."images" validate constraint "images_document_id_fkey";

alter table "public"."lists" add constraint "lists_parent_list_id_fkey" FOREIGN KEY (parent_list_id) REFERENCES lists(id) ON DELETE CASCADE not valid;

alter table "public"."lists" validate constraint "lists_parent_list_id_fkey";

alter table "public"."lists" add constraint "lists_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."lists" validate constraint "lists_user_id_fkey";

alter table "public"."transcriptions" add constraint "transcriptions_image_id_fkey" FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE not valid;

alter table "public"."transcriptions" validate constraint "transcriptions_image_id_fkey";

alter table "public"."transcriptions" add constraint "transcriptions_status_check" CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'complete'::character varying])::text[]))) not valid;

alter table "public"."transcriptions" validate constraint "transcriptions_status_check";

alter table "public"."users" add constraint "users_email_address_key" UNIQUE using index "users_email_address_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.sync_lastmod()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$function$
;

grant delete on table "public"."documents" to "anon";

grant insert on table "public"."documents" to "anon";

grant references on table "public"."documents" to "anon";

grant select on table "public"."documents" to "anon";

grant trigger on table "public"."documents" to "anon";

grant truncate on table "public"."documents" to "anon";

grant update on table "public"."documents" to "anon";

grant delete on table "public"."documents" to "authenticated";

grant insert on table "public"."documents" to "authenticated";

grant references on table "public"."documents" to "authenticated";

grant select on table "public"."documents" to "authenticated";

grant trigger on table "public"."documents" to "authenticated";

grant truncate on table "public"."documents" to "authenticated";

grant update on table "public"."documents" to "authenticated";

grant delete on table "public"."documents" to "service_role";

grant insert on table "public"."documents" to "service_role";

grant references on table "public"."documents" to "service_role";

grant select on table "public"."documents" to "service_role";

grant trigger on table "public"."documents" to "service_role";

grant truncate on table "public"."documents" to "service_role";

grant update on table "public"."documents" to "service_role";

grant delete on table "public"."images" to "anon";

grant insert on table "public"."images" to "anon";

grant references on table "public"."images" to "anon";

grant select on table "public"."images" to "anon";

grant trigger on table "public"."images" to "anon";

grant truncate on table "public"."images" to "anon";

grant update on table "public"."images" to "anon";

grant delete on table "public"."images" to "authenticated";

grant insert on table "public"."images" to "authenticated";

grant references on table "public"."images" to "authenticated";

grant select on table "public"."images" to "authenticated";

grant trigger on table "public"."images" to "authenticated";

grant truncate on table "public"."images" to "authenticated";

grant update on table "public"."images" to "authenticated";

grant delete on table "public"."images" to "service_role";

grant insert on table "public"."images" to "service_role";

grant references on table "public"."images" to "service_role";

grant select on table "public"."images" to "service_role";

grant trigger on table "public"."images" to "service_role";

grant truncate on table "public"."images" to "service_role";

grant update on table "public"."images" to "service_role";

grant delete on table "public"."lists" to "anon";

grant insert on table "public"."lists" to "anon";

grant references on table "public"."lists" to "anon";

grant select on table "public"."lists" to "anon";

grant trigger on table "public"."lists" to "anon";

grant truncate on table "public"."lists" to "anon";

grant update on table "public"."lists" to "anon";

grant delete on table "public"."lists" to "authenticated";

grant insert on table "public"."lists" to "authenticated";

grant references on table "public"."lists" to "authenticated";

grant select on table "public"."lists" to "authenticated";

grant trigger on table "public"."lists" to "authenticated";

grant truncate on table "public"."lists" to "authenticated";

grant update on table "public"."lists" to "authenticated";

grant delete on table "public"."lists" to "service_role";

grant insert on table "public"."lists" to "service_role";

grant references on table "public"."lists" to "service_role";

grant select on table "public"."lists" to "service_role";

grant trigger on table "public"."lists" to "service_role";

grant truncate on table "public"."lists" to "service_role";

grant update on table "public"."lists" to "service_role";

grant delete on table "public"."transcriptions" to "anon";

grant insert on table "public"."transcriptions" to "anon";

grant references on table "public"."transcriptions" to "anon";

grant select on table "public"."transcriptions" to "anon";

grant trigger on table "public"."transcriptions" to "anon";

grant truncate on table "public"."transcriptions" to "anon";

grant update on table "public"."transcriptions" to "anon";

grant delete on table "public"."transcriptions" to "authenticated";

grant insert on table "public"."transcriptions" to "authenticated";

grant references on table "public"."transcriptions" to "authenticated";

grant select on table "public"."transcriptions" to "authenticated";

grant trigger on table "public"."transcriptions" to "authenticated";

grant truncate on table "public"."transcriptions" to "authenticated";

grant update on table "public"."transcriptions" to "authenticated";

grant delete on table "public"."transcriptions" to "service_role";

grant insert on table "public"."transcriptions" to "service_role";

grant references on table "public"."transcriptions" to "service_role";

grant select on table "public"."transcriptions" to "service_role";

grant trigger on table "public"."transcriptions" to "service_role";

grant truncate on table "public"."transcriptions" to "service_role";

grant update on table "public"."transcriptions" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

CREATE TRIGGER set_timestamp_documents BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER set_timestamp_images BEFORE UPDATE ON public.images FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER set_timestamp_lists BEFORE UPDATE ON public.lists FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER set_timestamp_transcriptions BEFORE UPDATE ON public.transcriptions FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION sync_lastmod();


