alter table "public"."documents" drop constraint "documents_list_id_fkey";

create table "public"."lists_documents" (
    "list_id" integer not null,
    "document_id" integer not null,
    "created_at" timestamp without time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone default CURRENT_TIMESTAMP
);


alter table "public"."documents" drop column "list_id";

alter table "public"."documents" add column "user_id" character varying(255) not null;

CREATE UNIQUE INDEX lists_documents_pkey ON public.lists_documents USING btree (list_id, document_id);

alter table "public"."lists_documents" add constraint "lists_documents_pkey" PRIMARY KEY using index "lists_documents_pkey";

alter table "public"."documents" add constraint "documents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."documents" validate constraint "documents_user_id_fkey";

alter table "public"."lists_documents" add constraint "lists_documents_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE not valid;

alter table "public"."lists_documents" validate constraint "lists_documents_document_id_fkey";

alter table "public"."lists_documents" add constraint "lists_documents_list_id_fkey" FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE not valid;

alter table "public"."lists_documents" validate constraint "lists_documents_list_id_fkey";

grant delete on table "public"."lists_documents" to "anon";

grant insert on table "public"."lists_documents" to "anon";

grant references on table "public"."lists_documents" to "anon";

grant select on table "public"."lists_documents" to "anon";

grant trigger on table "public"."lists_documents" to "anon";

grant truncate on table "public"."lists_documents" to "anon";

grant update on table "public"."lists_documents" to "anon";

grant delete on table "public"."lists_documents" to "authenticated";

grant insert on table "public"."lists_documents" to "authenticated";

grant references on table "public"."lists_documents" to "authenticated";

grant select on table "public"."lists_documents" to "authenticated";

grant trigger on table "public"."lists_documents" to "authenticated";

grant truncate on table "public"."lists_documents" to "authenticated";

grant update on table "public"."lists_documents" to "authenticated";

grant delete on table "public"."lists_documents" to "service_role";

grant insert on table "public"."lists_documents" to "service_role";

grant references on table "public"."lists_documents" to "service_role";

grant select on table "public"."lists_documents" to "service_role";

grant trigger on table "public"."lists_documents" to "service_role";

grant truncate on table "public"."lists_documents" to "service_role";

grant update on table "public"."lists_documents" to "service_role";

CREATE TRIGGER set_timestamp_lists_documents BEFORE UPDATE ON public.lists_documents FOR EACH ROW EXECUTE FUNCTION sync_lastmod();


