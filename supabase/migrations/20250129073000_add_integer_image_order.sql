BEGIN;

-- Migrate to integer order
-- ========================

ALTER TABLE images ADD COLUMN "order" INT;

WITH RECURSIVE ordered_images AS (
    SELECT id, document_id, 1 AS "order"
    FROM images
    WHERE id NOT IN (SELECT next_image_id FROM images WHERE next_image_id IS NOT NULL) -- Find the first image
    UNION ALL
    SELECT i.id, i.document_id, oi.order + 1
    FROM images i
    JOIN ordered_images oi ON oi.id = i.next_image_id -- Changed this line
)
UPDATE images
SET "order" = (SELECT "order" FROM ordered_images WHERE ordered_images.id = images.id);

CREATE INDEX idx_images_order ON images (document_id, "order");
ALTER TABLE images ALTER COLUMN "order" SET NOT NULL;
ALTER TABLE images ADD CONSTRAINT unique_document_order UNIQUE (document_id, "order");

-- Drop the next_image_id column
ALTER TABLE images DROP CONSTRAINT IF EXISTS fk_images_next_image_id;
ALTER TABLE images DROP COLUMN IF EXISTS next_image_id;


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
    "order" int,
    notes json,
    transcriptions json,
    latest_transcription_job_status transcription_job_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.document_id,
    i.image_name,
    i.image_path,
    i.created_at,
    i.updated_at,
    i.order,
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
     LIMIT 1) as latest_transcription_job_status
  FROM images i
  WHERE i.document_id = document_id_param
  ORDER BY i.order;
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
  "order" int,
  latest_transcription_job_status transcription_job_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.document_id,
    i.image_name,
    i.image_path,
    i.created_at,
    i.updated_at,
    i.order,
    (SELECT status 
     FROM transcription_jobs tj
     WHERE tj.image_id = i.id
     ORDER BY tj.updated_at DESC
     LIMIT 1) as latest_transcription_job_status
  FROM images i
  WHERE i.document_id = ANY(document_ids)
  ORDER BY i.document_id, i.order;
END;
$$ LANGUAGE plpgsql;

COMMIT;