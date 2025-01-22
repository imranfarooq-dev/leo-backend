
-- Part 0: Backup tables
-- =====================

BEGIN;
CREATE TABLE credits_backup AS SELECT * FROM credits;
CREATE TABLE documents_backup AS SELECT * FROM documents;
CREATE TABLE images_backup AS SELECT * FROM images;
CREATE TABLE lists_backup AS SELECT * FROM lists;
CREATE TABLE notes_backup AS SELECT * FROM notes;
CREATE TABLE subscriptions_backup AS SELECT * FROM subscriptions;
CREATE TABLE transcriptions_backup AS SELECT * FROM transcriptions;
CREATE TABLE lists_documents_backup AS SELECT * FROM lists_documents;
CREATE TABLE users_backup AS SELECT * FROM users;
COMMIT;

BEGIN;

-- Part 1: Create UUIDs for all tables
-- ===================================

-- Update credits table
-----------------------

ALTER TABLE credits ADD COLUMN uuid UUID DEFAULT gen_random_uuid();

UPDATE credits SET uuid = gen_random_uuid() WHERE uuid IS NULL;

CREATE INDEX idx_credits_uuid ON credits(uuid);


-- Update documents table
-----------------------

ALTER TABLE documents ADD COLUMN uuid UUID DEFAULT gen_random_uuid();

UPDATE documents SET uuid = gen_random_uuid() WHERE uuid IS NULL;

CREATE INDEX idx_documents_uuid ON documents(uuid);

-- Updates images table
ALTER TABLE images ADD COLUMN document_uuid UUID;

UPDATE images i1
SET document_uuid = d2.uuid
FROM documents d2
WHERE i1.document_id = d2.id;

-- Update lists_documents table
ALTER TABLE lists_documents ADD COLUMN document_uuid UUID;

UPDATE lists_documents ld1
SET document_uuid = d2.uuid
FROM documents d2
WHERE ld1.document_id = d2.id;


-- Update images table
----------------------
ALTER TABLE images ADD COLUMN uuid UUID DEFAULT gen_random_uuid();

UPDATE images SET uuid = gen_random_uuid() WHERE uuid IS NULL;

CREATE INDEX idx_images_uuid ON images(uuid);

-- Update notes table
ALTER TABLE notes ADD COLUMN image_uuid UUID;

UPDATE notes n1
SET image_uuid = i2.uuid
FROM images i2
WHERE n1.image_id = i2.id;

-- Update transcriptions table
ALTER TABLE transcriptions ADD COLUMN image_uuid UUID;

UPDATE transcriptions t1
SET image_uuid = i2.uuid
FROM images i2
WHERE t1.image_id = i2.id;

-- Update images table
ALTER TABLE images ADD COLUMN next_image_uuid UUID;

UPDATE images i1
SET next_image_uuid = i2.uuid
FROM images i2
WHERE i1.next_image_id = i2.id;


-- Update lists table
-----------------------

ALTER TABLE lists ADD COLUMN uuid UUID DEFAULT gen_random_uuid();

UPDATE lists SET uuid = gen_random_uuid() WHERE uuid IS NULL;

CREATE INDEX idx_lists_uuid ON lists(uuid);

-- Update lists_documents table
ALTER TABLE lists_documents ADD COLUMN list_uuid UUID;

UPDATE lists_documents ld1
SET list_uuid = l2.uuid
FROM lists l2
WHERE ld1.list_id = l2.id;

-- Updates lists table
ALTER TABLE lists ADD COLUMN parent_list_uuid UUID;

UPDATE lists l1
SET parent_list_uuid = l2.uuid
FROM lists l2
WHERE l1.parent_list_id = l2.id;

-- Updates lists table
ALTER TABLE lists ADD COLUMN next_list_uuid UUID;

UPDATE lists l1
SET next_list_uuid = l2.uuid
FROM lists l2
WHERE l1.next_list_id = l2.id;

-- Update notes table
---------------------

ALTER TABLE notes ADD COLUMN uuid UUID DEFAULT gen_random_uuid();

UPDATE notes SET uuid = gen_random_uuid() WHERE uuid IS NULL;

CREATE INDEX idx_notes_uuid ON notes(uuid);


-- Update subscriptions table
-----------------------------

ALTER TABLE subscriptions ADD COLUMN uuid UUID DEFAULT gen_random_uuid();

UPDATE subscriptions SET uuid = gen_random_uuid() WHERE uuid IS NULL;

CREATE INDEX idx_subscriptions_uuid ON subscriptions(uuid);


-- Update transcriptions table
------------------------------

ALTER TABLE transcriptions ADD COLUMN uuid UUID DEFAULT gen_random_uuid();

UPDATE transcriptions SET uuid = gen_random_uuid() WHERE uuid IS NULL;

CREATE INDEX idx_transcriptions_uuid ON transcriptions(uuid);


-- Part 2: Add constraints
-- =======================

ALTER TABLE credits ADD CONSTRAINT unique_credits_uuid UNIQUE (uuid);
ALTER TABLE documents ADD CONSTRAINT unique_documents_uuid UNIQUE (uuid);
ALTER TABLE images ADD CONSTRAINT unique_images_uuid UNIQUE (uuid);
ALTER TABLE lists ADD CONSTRAINT unique_lists_uuid UNIQUE (uuid);
ALTER TABLE notes ADD CONSTRAINT unique_notes_uuid UNIQUE (uuid);
ALTER TABLE notes ADD CONSTRAINT unique_notes_image_uuid UNIQUE (image_uuid);
ALTER TABLE subscriptions ADD CONSTRAINT unique_subscriptions_uuid UNIQUE (uuid);
ALTER TABLE transcriptions ADD CONSTRAINT unique_transcriptions_uuid UNIQUE (uuid);
ALTER TABLE transcriptions ADD CONSTRAINT unique_transcriptions_image_uuid UNIQUE (image_uuid);
ALTER TABLE lists_documents ADD CONSTRAINT unique_lists_documents_uuid UNIQUE (list_uuid, document_uuid);

ALTER TABLE credits ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE documents ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE images ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE images ALTER COLUMN document_uuid SET NOT NULL;
ALTER TABLE lists ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE notes ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE transcriptions ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE lists_documents ALTER COLUMN list_uuid SET NOT NULL;
ALTER TABLE lists_documents ALTER COLUMN document_uuid SET NOT NULL;


-- Part 3: Set primary keys
-- ========================

ALTER TABLE credits DROP CONSTRAINT IF EXISTS credits_user_id_fkey;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_user_id_fkey;
ALTER TABLE images DROP CONSTRAINT IF EXISTS images_document_id_fkey;
ALTER TABLE lists DROP CONSTRAINT IF EXISTS lists_parent_list_id_fkey;
ALTER TABLE lists DROP CONSTRAINT IF EXISTS lists_user_id_fkey;
ALTER TABLE lists_documents DROP CONSTRAINT IF EXISTS lists_documents_document_id_fkey;
ALTER TABLE lists_documents DROP CONSTRAINT IF EXISTS lists_documents_list_id_fkey;
ALTER TABLE notes DROP CONSTRAINT IF EXISTS fk_image;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE transcriptions DROP CONSTRAINT IF EXISTS transcriptions_image_id_fkey;

ALTER TABLE credits DROP CONSTRAINT IF EXISTS credits_pkey;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_pkey;
ALTER TABLE images DROP CONSTRAINT IF EXISTS images_pkey;
ALTER TABLE lists DROP CONSTRAINT IF EXISTS lists_pkey;
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_pkey;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_pkey;
ALTER TABLE transcriptions DROP CONSTRAINT IF EXISTS transcriptions_pkey;
ALTER TABLE lists_documents DROP CONSTRAINT IF EXISTS lists_documents_pkey;

ALTER TABLE credits ADD PRIMARY KEY (uuid);
ALTER TABLE documents ADD PRIMARY KEY (uuid);
ALTER TABLE images ADD PRIMARY KEY (uuid);
ALTER TABLE lists ADD PRIMARY KEY (uuid);
ALTER TABLE notes ADD PRIMARY KEY (uuid);
ALTER TABLE subscriptions ADD PRIMARY KEY (uuid);
ALTER TABLE transcriptions ADD PRIMARY KEY (uuid);
ALTER TABLE lists_documents ADD PRIMARY KEY (list_uuid, document_uuid);


-- Part 3.6: Add new foreign key constraints
-- ==========================================

ALTER TABLE images
ADD CONSTRAINT fk_images_document_uuid
FOREIGN KEY (document_uuid) REFERENCES documents(uuid);

ALTER TABLE lists_documents
ADD CONSTRAINT fk_lists_documents_document_uuid
FOREIGN KEY (document_uuid) REFERENCES documents(uuid);

ALTER TABLE notes
ADD CONSTRAINT fk_notes_image_uuid
FOREIGN KEY (image_uuid) REFERENCES images(uuid);

ALTER TABLE transcriptions
ADD CONSTRAINT fk_transcriptions_image_uuid
FOREIGN KEY (image_uuid) REFERENCES images(uuid);

ALTER TABLE images
ADD CONSTRAINT fk_images_next_image_uuid
FOREIGN KEY (next_image_uuid) REFERENCES images(uuid);

ALTER TABLE lists_documents
ADD CONSTRAINT fk_lists_documents_list_uuid
FOREIGN KEY (list_uuid) REFERENCES lists(uuid);

ALTER TABLE lists
ADD CONSTRAINT fk_lists_parent_list_uuid
FOREIGN KEY (parent_list_uuid) REFERENCES lists(uuid);

ALTER TABLE lists
ADD CONSTRAINT fk_lists_next_list_uuid
FOREIGN KEY (next_list_uuid) REFERENCES lists(uuid);


-- Part 4: Drop old columns
-- ========================

ALTER TABLE credits DROP COLUMN id;

ALTER TABLE documents DROP COLUMN id;

ALTER TABLE images 
    DROP COLUMN id,
    DROP COLUMN document_id,
    DROP COLUMN next_image_id;

ALTER TABLE lists 
    DROP COLUMN id,
    DROP COLUMN parent_list_id,
    DROP COLUMN next_list_id;

ALTER TABLE notes 
    DROP COLUMN id,
    DROP COLUMN image_id;

ALTER TABLE subscriptions DROP COLUMN id;

ALTER TABLE transcriptions 
    DROP COLUMN id,
    DROP COLUMN image_id;

ALTER TABLE lists_documents 
    DROP COLUMN list_id,
    DROP COLUMN document_id;


-- Part 5: Rename columns
-- ======================

ALTER TABLE credits RENAME COLUMN uuid TO id;

ALTER TABLE documents RENAME COLUMN uuid TO id;

ALTER TABLE images RENAME COLUMN uuid TO id;
ALTER TABLE images RENAME COLUMN document_uuid TO document_id;
ALTER TABLE images RENAME COLUMN next_image_uuid TO next_image_id;

ALTER TABLE lists RENAME COLUMN uuid TO id;
ALTER TABLE lists RENAME COLUMN parent_list_uuid TO parent_list_id;
ALTER TABLE lists RENAME COLUMN next_list_uuid TO next_list_id;

ALTER TABLE notes RENAME COLUMN uuid TO id;
ALTER TABLE notes RENAME COLUMN image_uuid TO image_id;

ALTER TABLE subscriptions RENAME COLUMN uuid TO id;

ALTER TABLE transcriptions RENAME COLUMN uuid TO id;
ALTER TABLE transcriptions RENAME COLUMN image_uuid TO image_id;

ALTER TABLE lists_documents RENAME COLUMN list_uuid TO list_id;
ALTER TABLE lists_documents RENAME COLUMN document_uuid TO document_id;


-- Part 6: Add indexes
-- ===================

CREATE INDEX idx_images_document_id ON images(document_id);
CREATE INDEX idx_images_next_image_id ON images(next_image_id);
CREATE INDEX idx_lists_parent_list_id ON lists(parent_list_id);
CREATE INDEX idx_lists_next_list_id ON lists(next_list_id);
CREATE INDEX idx_lists_documents_list_id ON lists_documents(list_id);
CREATE INDEX idx_lists_documents_document_id ON lists_documents(document_id);
CREATE INDEX idx_notes_image_id ON notes(image_id);
CREATE INDEX idx_transcriptions_image_id ON transcriptions(image_id);

COMMIT;

-- Part 7: Update functions
-- ========================


-- fetch_documents_for_lists -
DROP FUNCTION IF EXISTS fetch_documents_for_lists(INTEGER[], INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION fetch_documents_for_lists(
    list_ids uuid[],
    _from integer DEFAULT NULL,
    _to integer DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    document_name character varying,
    creator_name character varying,
    date character varying,
    type character varying,
    archive character varying,
    collection character varying,
    box character varying,
    folder character varying,
    identifier character varying,
    rights character varying,
    user_id character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    total_count integer
) 
LANGUAGE plpgsql
SECURITY INVOKER
AS $$

DECLARE
    total_documents_count int;
BEGIN
  -- Calculate total count of distinct documents
  SELECT COUNT(DISTINCT d.id)
  INTO total_documents_count
  FROM documents d
  INNER JOIN lists_documents ld ON ld.document_id = d.id
  WHERE ld.list_id = ANY(list_ids);

  -- Return the distinct documents with pagination and total count
  RETURN QUERY
  SELECT 
    d.id, 
    d.document_name, 
    d.creator_name, 
    d.date, 
    d.type, 
    d.archive, 
    d.collection, 
    d.box, 
    d.folder, 
    d.identifier, 
    d.rights, 
    d.user_id, 
    d.created_at, 
    d.updated_at, 
    total_documents_count  -- Total count of distinct documents
  FROM (
    SELECT DISTINCT ON (d.id) d.id, d.document_name, d.creator_name, d.date, d.type, d.archive, 
                        d.collection, d.box, d.folder, d.identifier, d.rights, d.user_id, 
                        d.created_at, d.updated_at
    FROM documents d
    INNER JOIN lists_documents ld ON ld.document_id = d.id
    WHERE ld.list_id = ANY(list_ids)
    ORDER BY d.id
    LIMIT CASE WHEN _from IS NOT NULL AND _to IS NOT NULL THEN (_to - _from + 1) ELSE NULL END
    OFFSET COALESCE(_from, 0)
  ) AS d;

END;
$$;


-- get_list_with_children
DROP FUNCTION IF EXISTS get_list_with_children(INTEGER);

CREATE OR REPLACE FUNCTION get_list_with_children(_id uuid)
RETURNS TABLE(id uuid) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE list_hierarchy AS (
      -- Base case: Select the root list with the given id
      SELECT lists.id, lists.parent_list_id
      FROM lists
      WHERE lists.id = _id
      
      UNION ALL
      
      -- Recursive case: Select children of the previously selected rows
      SELECT l.id, l.parent_list_id
      FROM lists l
      INNER JOIN list_hierarchy lh ON lh.id = l.parent_list_id
  )
  -- Return the ids of all matching rows
  SELECT list_hierarchy.id FROM list_hierarchy;
END;
$$ LANGUAGE plpgsql;

-- get_ordered_images_by_document_id
DROP FUNCTION IF EXISTS get_ordered_images_by_document_id(document_id_param INTEGER, include_relations boolean);

CREATE OR REPLACE FUNCTION get_ordered_images_by_document_id(
    document_id_param uuid,
    include_relations boolean
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    image_name character varying,
    image_url character varying,
    image_path character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    next_image_id uuid,
    notes json,
    transcriptions json
) AS $$
BEGIN
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
END;
$$ LANGUAGE plpgsql;

-- get_ordered_images_by_document_ids
DROP FUNCTION IF EXISTS get_ordered_images_by_document_ids(document_ids INTEGER[]);

CREATE OR REPLACE FUNCTION get_ordered_images_by_document_ids(document_ids uuid[])
RETURNS TABLE (
  id uuid,
  document_id uuid,
  image_name character varying,
  image_url character varying,
  image_path character varying,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  next_image_id uuid
) AS $$
BEGIN
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
      next_img.image_url,
      next_img.image_path,
      next_img.created_at,
      next_img.updated_at,
      next_img.next_image_id,
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
    image_sequence.next_image_id
  FROM image_sequence
  ORDER BY image_sequence.document_id, sequence_order;
END;
$$ LANGUAGE plpgsql;


-- search_documents_and_lists
DROP FUNCTION IF EXISTS search_documents_and_lists(TEXT, TEXT);

CREATE OR REPLACE FUNCTION search_documents_and_lists(search_term TEXT, user_id_param TEXT)
RETURNS TABLE(id uuid, name CHARACTER VARYING, type TEXT) AS $$
BEGIN
  RETURN QUERY
    SELECT documents.id, document_name AS name, 'document' AS type
    FROM documents
    WHERE document_name ILIKE '%' || search_term || '%'
      AND user_id = user_id_param
  UNION ALL
    SELECT lists.id, list_name AS name, 'list' AS type
    FROM lists
    WHERE list_name ILIKE '%' || search_term || '%'
      AND user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;
