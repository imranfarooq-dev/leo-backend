BEGIN;

DROP TRIGGER IF EXISTS set_image_order_trigger ON images;
DROP FUNCTION IF EXISTS set_image_order();

-- Create an enum type for image status
DO $$ BEGIN
    CREATE TYPE image_status AS ENUM ('COMPLETE', 'AWAITING_IMAGE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add status column with default value
ALTER TABLE images ADD COLUMN IF NOT EXISTS status image_status NOT NULL DEFAULT 'COMPLETE';

-- Update all existing records to COMPLETE
UPDATE images SET status = 'COMPLETE';

-- Remove the default after setting existing records
ALTER TABLE images ALTER COLUMN status DROP DEFAULT;

-- Make filename column nullable
ALTER TABLE images
ALTER COLUMN filename DROP NOT NULL,
ALTER COLUMN filename SET DEFAULT NULL;

-- Change VARCHAR columns to TEXT
ALTER TABLE documents ALTER COLUMN document_name TYPE TEXT;
ALTER TABLE documents ALTER COLUMN creator_name TYPE TEXT;
ALTER TABLE documents ALTER COLUMN date TYPE TEXT;
ALTER TABLE documents ALTER COLUMN type TYPE TEXT;
ALTER TABLE documents ALTER COLUMN archive TYPE TEXT;
ALTER TABLE documents ALTER COLUMN collection TYPE TEXT;
ALTER TABLE documents ALTER COLUMN box TYPE TEXT;
ALTER TABLE documents ALTER COLUMN folder TYPE TEXT;
ALTER TABLE documents ALTER COLUMN identifier TYPE TEXT;
ALTER TABLE documents ALTER COLUMN rights TYPE TEXT;
ALTER TABLE images ALTER COLUMN filename TYPE TEXT;
ALTER TABLE images ALTER COLUMN image_name TYPE TEXT;
ALTER TABLE lists ALTER COLUMN list_name TYPE TEXT;
ALTER TABLE users ALTER COLUMN id TYPE TEXT;
ALTER TABLE users ALTER COLUMN first_name TYPE TEXT;
ALTER TABLE users ALTER COLUMN last_name TYPE TEXT;
ALTER TABLE users ALTER COLUMN email_address TYPE TEXT;

--- Make create_image_placeholders function
DROP FUNCTION IF EXISTS create_image_placeholders(TEXT, TEXT[]);
CREATE OR REPLACE FUNCTION create_image_placeholders(
    p_document_id    TEXT,
    p_image_names    TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    i              INT;
    doc_uuid       UUID;
    new_id         UUID;
    next_order     INT;
    base_order     INT;
BEGIN
    doc_uuid := p_document_id::uuid;
    
    -- For concurrency safety, we will create a temporary table to store just id and order
    CREATE TEMP TABLE temp_new_images (
        id          UUID,
        order_num   INT
    ) ON COMMIT DROP;

    -- Lock existing rows for the target document so concurrent insertions do not overlap orders
    -- First lock the rows
    PERFORM 1
    FROM images
    WHERE document_id = doc_uuid
    FOR UPDATE;
    
    -- Then calculate the max order
    SELECT COALESCE(MAX("order"), 0)
    INTO base_order
    FROM images
    WHERE document_id = doc_uuid;
    
    FOR i IN 1..array_length(p_image_names, 1)
    LOOP
        next_order := base_order + i;
		
        INSERT INTO images (
            document_id,
            "order",
            status,
            image_name
        )
        VALUES (
            doc_uuid,
            next_order,
            'AWAITING_IMAGE',
            p_image_names[i]
        )
        RETURNING id INTO new_id;

        INSERT INTO temp_new_images (id, order_num)
        VALUES (new_id, next_order);
    END LOOP;

    -- Return the id and order as JSONB
    RETURN (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', id::text,
                'order', order_num
            )
            ORDER BY order_num
        )
        FROM temp_new_images
    );
END;
$$;

-- Update existing functions to also return the new image status field
DROP FUNCTION IF EXISTS get_documents_by_user_id(TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION get_documents_by_user_id(
    p_user_id TEXT,
    page_size INTEGER DEFAULT 10,
    page_number INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        WITH paginated_documents AS (
            SELECT d.*
            FROM documents d
            WHERE d.user_id = p_user_id
            ORDER BY d.created_at DESC
            LIMIT page_size
            OFFSET (page_number * page_size)
        ),
        documents_with_image_summaries AS (
            SELECT
                d.id,
                d.user_id,
                d.document_name,
                d.creator_name,
                d.date,
                d.identifier,
                d.created_at,
                d.updated_at,
                d.archive,
                d.box,
                d.collection,
                d.folder,
                d.rights,
                d.type,
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', i.id,
                            'document_id', i.document_id,
                            'image_name', i.image_name,
                            'status', i.status,
                            'order', i."order",
                            'filename', i.filename,
                            'transcription_status', t.transcription_status,
                            'note_exists', n.notes_text IS NOT NULL AND LENGTH(TRIM(n.notes_text)) > 0
                        ) ORDER BY i."order"
                    )
                    FROM images i
                    LEFT JOIN transcriptions t ON i.id = t.image_id
                    LEFT JOIN notes n ON i.id = n.image_id
                    WHERE i.document_id = d.id
                ) AS images
            FROM paginated_documents d
            ORDER BY d.created_at DESC
        )
        SELECT jsonb_agg(row_to_json(documents_with_image_summaries)::jsonb)
        FROM documents_with_image_summaries
    );
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_documents_by_list_id(TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION get_documents_by_list_id(
    p_list_id TEXT,
    page_size INTEGER DEFAULT 10,
    page_number INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        WITH paginated_documents AS (
            SELECT d.*
            FROM documents d
            JOIN lists_documents ld ON d.id = ld.document_id
            WHERE ld.list_id = p_list_id::uuid
            ORDER BY d.created_at DESC
            LIMIT page_size
            OFFSET (page_number * page_size)
        ),
        documents_with_image_summaries AS (
            SELECT
                d.id,
                d.user_id,
                d.document_name,
                d.creator_name,
                d.date,
                d.identifier,
                d.created_at,
                d.updated_at,
                d.archive,
                d.box,
                d.collection,
                d.folder,
                d.rights,
                d.type,
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', i.id,
                            'document_id', i.document_id,
                            'image_name', i.image_name,
                            'status', i.status,
                            'order', i."order",
                            'filename', i.filename,
                            'transcription_status', t.transcription_status,
                            'note_exists', n.notes_text IS NOT NULL AND LENGTH(TRIM(n.notes_text)) > 0
                        ) ORDER BY i."order"
                    )
                    FROM images i
                    LEFT JOIN transcriptions t ON i.id = t.image_id
                    LEFT JOIN notes n ON i.id = n.image_id
                    WHERE i.document_id = d.id
                ) AS images
            FROM paginated_documents d
            ORDER BY d.created_at DESC
        )
        SELECT jsonb_agg(row_to_json(documents_with_image_summaries)::jsonb)
        FROM documents_with_image_summaries
    );
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_document_summaries_by_ids(TEXT[]);
CREATE OR REPLACE FUNCTION get_document_summaries_by_ids(
    p_document_ids TEXT[]
)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        WITH documents_with_image_summaries AS (
            SELECT
                d.id,
                d.user_id,
                d.document_name,
                d.creator_name,
                d.date,
                d.identifier,
                d.created_at,
                d.updated_at,
                d.archive,
                d.box,
                d.collection,
                d.folder,
                d.rights,
                d.type,
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', i.id,
                            'document_id', i.document_id,
                            'image_name', i.image_name,
                            'status', i.status,
                            'order', i."order",
                            'filename', i.filename,
                            'transcription_status', t.transcription_status,
                            'note_exists', n.notes_text IS NOT NULL AND LENGTH(TRIM(n.notes_text)) > 0
                        ) ORDER BY i."order"
                    )
                    FROM images i
                    LEFT JOIN transcriptions t ON i.id = t.image_id
                    LEFT JOIN notes n ON i.id = n.image_id
                    WHERE i.document_id = d.id
                ) AS images
            FROM documents d
            WHERE d.id = ANY(p_document_ids::uuid[])
            ORDER BY d.created_at DESC
        )
        SELECT jsonb_agg(row_to_json(documents_with_image_summaries)::jsonb)
        FROM documents_with_image_summaries
    );
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_images_by_ids(TEXT[]);
CREATE OR REPLACE FUNCTION get_images_by_ids(p_image_ids TEXT[])
RETURNS JSONB AS $$
BEGIN
    RETURN (
        WITH latest_transcription_jobs AS (
            SELECT tj.id AS transcription_job_id,
                   tj.image_id,
                   tj.status AS transcription_job_status,
                   tj.created_at
            FROM transcription_jobs tj
            WHERE tj.image_id = ANY(p_image_ids::uuid[])
            AND (
                tj.created_at = (
                    SELECT MAX(tj2.created_at)
                    FROM transcription_jobs tj2
                    WHERE tj2.image_id = tj.image_id
                )
            )
        )
        SELECT jsonb_agg(row_to_json(image_data)::jsonb)
        FROM (
            SELECT
                i.id::text,
                i.document_id::text,
                i.image_name,
                i.status,
                i."order",
                i.filename,
                t.transcription_status,
                (n.notes_text IS NOT NULL AND LENGTH(TRIM(n.notes_text)) > 0) as note_exists,
                t.id::text AS transcription_id,
                t.ai_transcription_text,
                t.current_transcription_text,
                ltj.transcription_job_status,
                n.id::text AS note_id,
                n.notes_text
            FROM images i
            LEFT JOIN transcriptions t ON i.id = t.image_id
            LEFT JOIN latest_transcription_jobs ltj ON i.id = ltj.image_id
            LEFT JOIN notes n ON i.id = n.image_id
            WHERE i.id = ANY(p_image_ids::uuid[])
            ORDER BY i."order"
        ) image_data
    );
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_image_summaries_by_ids(TEXT[]);
CREATE OR REPLACE FUNCTION get_image_summaries_by_ids(p_image_ids TEXT[])
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(row_to_json(image_summary)::jsonb)
        FROM (
            SELECT
                i.id::text,
                i.document_id::text,
                i.image_name,
                i.status,
                i."order",
                i.filename,
                t.transcription_status,
                (n.notes_text IS NOT NULL AND LENGTH(TRIM(n.notes_text)) > 0) as note_exists
            FROM images i
            LEFT JOIN transcriptions t ON i.id = t.image_id
            LEFT JOIN notes n ON i.id = n.image_id
            WHERE i.id = ANY(p_image_ids::uuid[])
            ORDER BY i."order"
        ) image_summary
    );
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_documents_by_ids(TEXT[]);
CREATE OR REPLACE FUNCTION get_documents_by_ids(
    p_document_ids TEXT[]
)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        WITH latest_transcription_jobs AS (
            SELECT tj.id AS transcription_job_id,
                   tj.image_id,
                   tj.status AS transcription_job_status,
                   tj.created_at
            FROM transcription_jobs tj
            WHERE tj.image_id IN (
                SELECT i.id 
                FROM images i 
                WHERE i.document_id = ANY(p_document_ids::uuid[])
            )
            AND (
                tj.created_at = (
                    SELECT MAX(tj2.created_at)
                    FROM transcription_jobs tj2
                    WHERE tj2.image_id = tj.image_id
                )
            )
        ),
        detailed_images AS (
            SELECT
                i.id,
                i.document_id,
                i.image_name,
                i.status,
                i."order",
                i.filename,
                t.transcription_status,
                (n.notes_text IS NOT NULL AND LENGTH(TRIM(n.notes_text)) > 0) as note_exists,
                t.id AS transcription_id,
                t.ai_transcription_text,
                t.current_transcription_text,
                ltj.transcription_job_status,
                n.id AS note_id,
                n.notes_text
            FROM images i
            LEFT JOIN transcriptions t ON i.id = t.image_id
            LEFT JOIN latest_transcription_jobs ltj ON i.id = ltj.image_id
            LEFT JOIN notes n ON i.id = n.image_id
            WHERE i.document_id = ANY(p_document_ids::uuid[])
        )
        SELECT jsonb_agg(row_to_json(document_with_images)::jsonb)
        FROM (
            SELECT
                d.id,
                d.user_id,
                d.document_name,
                d.creator_name,
                d.date,
                d.identifier,
                d.created_at,
                d.updated_at,
                d.archive,
                d.box,
                d.collection,
                d.folder,
                d.rights,
                d.type,
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', di.id,
                            'document_id', di.document_id,
                            'image_name', di.image_name,
                            'order', di."order",
                            'filename', di.filename,
                            'transcription_status', di.transcription_status,
                            'note_exists', di.note_exists,
                            'transcription_id', di.transcription_id,
                            'ai_transcription_text', di.ai_transcription_text,
                            'current_transcription_text', di.current_transcription_text,
                            'transcription_job_status', di.transcription_job_status,
                            'note_id', di.note_id,
                            'notes_text', di.notes_text
                        )
                        ORDER BY di."order"
                    )
                    FROM detailed_images di
                    WHERE di.document_id = d.id
                ) AS images
            FROM documents d
            WHERE d.id = ANY(p_document_ids::uuid[])
            ORDER BY d.created_at DESC
        ) document_with_images
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;