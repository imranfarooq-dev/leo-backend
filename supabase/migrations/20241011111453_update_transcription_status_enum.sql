alter table "public"."transcriptions" alter column "transcription_status" drop default;

alter type "public"."transcription_status_enum" rename to "transcription_status_enum__old_version_to_be_dropped";

create type "public"."transcription_status_enum" as enum ('draft', 'transcribed', 'finalised');

alter table "public"."transcriptions" alter column transcription_status type "public"."transcription_status_enum" using transcription_status::text::"public"."transcription_status_enum";

alter table "public"."transcriptions" alter column "transcription_status" set default 'draft'::transcription_status_enum;

drop type "public"."transcription_status_enum__old_version_to_be_dropped";