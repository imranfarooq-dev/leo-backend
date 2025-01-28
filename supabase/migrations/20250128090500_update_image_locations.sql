CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Make backup of the images table
CREATE TABLE images_backup AS SELECT * FROM images;


UPDATE images
SET image_path_new = CONCAT(
    'public/images/full/', 
    gen_random_uuid()::text, 
    '.', 
    substring(image_path from '\.([a-zA-Z0-9]+)$')
)
WHERE image_path ~ '\.[a-zA-Z0-9]+$';

ALTER TABLE images
RENAME COLUMN image_path TO image_path_old;

ALTER TABLE images 
ALTER COLUMN image_path_old DROP NOT NULL;

ALTER TABLE images
ALTER COLUMN image_path_old SET DEFAULT NULL;

ALTER TABLE images
RENAME COLUMN image_path_new TO image_path;

ALTER TABLE images
ALTER COLUMN image_path SET NOT NULL;

ALTER TABLE images
DROP COLUMN image_url;


-- Update existing functions
-- =========================

-- get_ordered_images_by_document_id
DROP FUNCTION IF EXISTS get_ordered_images_by_document_id(document_id_param uuid, include_relations boolean);

CREATE OR REPLACE FUNCTION get_ordered_images_by_document_id(
    document_id_param uuid,
    include_relations boolean
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    image_name character varying,
    image_path character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    next_image_id uuid,
    notes json,
    transcriptions json,
    latest_transcription_job_status transcription_job_status
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE image_sequence AS (
    -- Base case: Select images that aren't pointed to by any other image
    SELECT 
      i.id,
      i.document_id,
      i.image_name,
      i.image_path,
      i.created_at,
      i.updated_at,
      i.next_image_id,
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
      (SELECT status 
       FROM transcription_jobs tj
       WHERE tj.image_id = i.id
       ORDER BY tj.updated_at DESC
       LIMIT 1) as latest_transcription_job_status,
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
      next_img.image_path,
      next_img.created_at,
      next_img.updated_at,
      next_img.next_image_id,
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
      (SELECT status 
       FROM transcription_jobs tj
       WHERE tj.image_id = next_img.id
       ORDER BY tj.updated_at DESC
       LIMIT 1),
      seq.sequence_order + 1
    FROM images next_img
    INNER JOIN image_sequence seq ON seq.next_image_id = next_img.id
    WHERE next_img.document_id = seq.document_id
  )
  SELECT 
    image_sequence.id,
    image_sequence.document_id,
    image_sequence.image_name,
    image_sequence.image_path,
    image_sequence.created_at,
    image_sequence.updated_at,
    image_sequence.next_image_id,
    image_sequence.notes,
    image_sequence.transcriptions,
    image_sequence.latest_transcription_job_status
  FROM image_sequence
  ORDER BY sequence_order;
END;
$$ LANGUAGE plpgsql;

-- get_ordered_images_by_document_ids
DROP FUNCTION IF EXISTS get_ordered_images_by_document_ids(document_ids uuid[]);

CREATE OR REPLACE FUNCTION get_ordered_images_by_document_ids(document_ids uuid[])
RETURNS TABLE (
  id uuid,
  document_id uuid,
  image_name character varying,
  image_path character varying,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  next_image_id uuid,
  latest_transcription_job_status transcription_job_status
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE image_sequence AS (
    -- Base case: Select images that aren't pointed to by any other image
    SELECT 
      i.id,
      i.document_id,
      i.image_name,
      i.image_path,
      i.created_at,
      i.updated_at,
      i.next_image_id,
      (SELECT status 
       FROM transcription_jobs tj
       WHERE tj.image_id = i.id
       ORDER BY tj.updated_at DESC
       LIMIT 1) as latest_transcription_job_status,
      1 as sequence_order
    FROM images i
    WHERE i.document_id = ANY(document_ids)
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
      next_img.image_path,
      next_img.created_at,
      next_img.updated_at,
      next_img.next_image_id,
      (SELECT status 
       FROM transcription_jobs tj
       WHERE tj.image_id = next_img.id
       ORDER BY tj.updated_at DESC
       LIMIT 1),
      seq.sequence_order + 1
    FROM images next_img
    INNER JOIN image_sequence seq ON seq.next_image_id = next_img.id
    WHERE next_img.document_id = seq.document_id
  )
  SELECT 
    image_sequence.id,
    image_sequence.document_id,
    image_sequence.image_name,
    image_sequence.image_path,
    image_sequence.created_at,
    image_sequence.updated_at,
    image_sequence.next_image_id,
    image_sequence.latest_transcription_job_status
  FROM image_sequence
  ORDER BY image_sequence.document_id, sequence_order;
END;
$$ LANGUAGE plpgsql;