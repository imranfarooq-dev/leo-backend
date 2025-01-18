alter table "public"."lists" add column "next_list_id" integer;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_ordered_images_by_document_id(document_id_param integer, include_relations boolean DEFAULT false)
 RETURNS TABLE(id integer, document_id integer, image_name character varying, image_url character varying, image_path character varying, created_at timestamp without time zone, updated_at timestamp without time zone, next_image_id integer, notes json, transcriptions json)
 LANGUAGE plpgsql
AS $function$BEGIN
  RETURN QUERY
  WITH RECURSIVE image_sequence AS (
    -- Base case: Select images that aren't pointed to by any other image
    SELECT 
      i.id,
      i.document_id,
      i.image_name,
      i.image_url,
      i.image_path,
      i.created_at,
      i.updated_at,
      i.next_image_id,
      -- CHANGE 2: Removed ARRAY() and added LIMIT 1 for notes
      CASE WHEN include_relations THEN
        (SELECT json_build_object(
          'id', n.id,
          'notes_text', n.notes_text,
          'image_id', n.image_id,
          'created_at', n.created_at,
          'updated_at', n.updated_at
        )
        FROM notes n
        WHERE n.image_id = i.id
        LIMIT 1)
      ELSE NULL END as notes,
      -- CHANGE 3: Removed ARRAY() and added LIMIT 1 for transcriptions
      CASE WHEN include_relations THEN
        (SELECT json_build_object(
          'id', t.id,
          'current_transcription_text', t.current_transcription_text,
          'ai_transcription_text', t.ai_transcription_text,
          'transcription_status', t.transcription_status,
          'image_id', t.image_id,
          'created_at', t.created_at,
          'updated_at', t.updated_at
        )
        FROM transcriptions t
        WHERE t.image_id = i.id
        LIMIT 1)
      ELSE NULL END as transcriptions,
      1 as sequence_order
    FROM images i
    WHERE i.document_id = document_id_param
    AND NOT EXISTS (
      SELECT 1 
      FROM images prev 
      WHERE prev.next_image_id = i.id
      AND prev.document_id = i.document_id
    )
    
    UNION ALL
    
    -- Recursive case: Follow next_image_id chain
    SELECT 
      next_img.id,
      next_img.document_id,
      next_img.image_name,
      next_img.image_url,
      next_img.image_path,
      next_img.created_at,
      next_img.updated_at,
      next_img.next_image_id,
      -- CHANGE 4: Removed ARRAY() and added LIMIT 1 for notes in recursive part
      CASE WHEN include_relations THEN
        (SELECT json_build_object(
          'id', n.id,
          'notes_text', n.notes_text,
          'image_id', n.image_id,
          'created_at', n.created_at,
          'updated_at', n.updated_at
        )
        FROM notes n
        WHERE n.image_id = next_img.id
        LIMIT 1)
      ELSE NULL END,
      -- CHANGE 5: Removed ARRAY() and added LIMIT 1 for transcriptions in recursive part
      CASE WHEN include_relations THEN
        (SELECT json_build_object(
          'id', t.id,
          'current_transcription_text', t.current_transcription_text,
          'ai_transcription_text', t.ai_transcription_text,
          'transcription_status', t.transcription_status,
          'image_id', t.image_id,
          'created_at', t.created_at,
          'updated_at', t.updated_at
        )
        FROM transcriptions t
        WHERE t.image_id = next_img.id
        LIMIT 1)
      ELSE NULL END,
      seq.sequence_order + 1
    FROM images next_img
    INNER JOIN image_sequence seq ON seq.next_image_id = next_img.id
    WHERE next_img.document_id = seq.document_id
  )
  SELECT 
    image_sequence.id,
    image_sequence.document_id,
    image_sequence.image_name,
    image_sequence.image_url,
    image_sequence.image_path,
    image_sequence.created_at,
    image_sequence.updated_at,
    image_sequence.next_image_id,
    image_sequence.notes,
    image_sequence.transcriptions
  FROM image_sequence
  ORDER BY sequence_order;
END;$function$
;


