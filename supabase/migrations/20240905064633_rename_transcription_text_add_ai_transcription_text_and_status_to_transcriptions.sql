create type "public"."transcription_status_enum" as enum ('draft', 'completed');

alter table "public"."transcriptions" drop column "transcription_text";

alter table "public"."transcriptions" add column "ai_transcription_text" text;

alter table "public"."transcriptions" add column "current_transcription_text" text;

alter table "public"."transcriptions" add column "transcription_status" transcription_status_enum default 'draft'::transcription_status_enum;


