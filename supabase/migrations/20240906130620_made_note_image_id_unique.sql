alter table "public"."transcriptions" drop constraint "transcriptions_status_check";

alter table "public"."transcriptions" drop column "status";

CREATE UNIQUE INDEX transcriptions_image_id_key ON public.transcriptions USING btree (image_id);

alter table "public"."transcriptions" add constraint "transcriptions_image_id_key" UNIQUE using index "transcriptions_image_id_key";


