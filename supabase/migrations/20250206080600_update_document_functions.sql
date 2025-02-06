BEGIN;

DROP FUNCTION IF EXISTS get_documents_by_user_id;
CREATE OR REPLACE FUNCTION get_documents_by_user_id(
    user_id TEXT,
    page_size INTEGER DEFAULT 10,
    page_number INTEGER DEFAULT 1
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    document_name TEXT,
    creator_name TEXT,
    date DATE,
    identifier TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    number_of_images_draft INTEGER,
    number_of_images_transcribed INTEGER,
    number_of_images_finalised INTEGER,
    first_image_path TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH paginated_documents AS (
        SELECT d.*
        FROM documents d
        WHERE d.user_id = user_id::uuid
        ORDER BY d.created_at DESC
        LIMIT page_size
        OFFSET ((page_number - 1) * page_size)
    ),
    image_counts AS (
        SELECT
            i.document_id,
            COUNT(CASE
                     WHEN t.transcription_status = 'draft' OR t.image_id IS NULL THEN 1
                 END) AS number_of_images_draft,
            COUNT(CASE
                     WHEN t.transcription_status = 'transcribed' THEN 1
                 END) AS number_of_images_transcribed,
            COUNT(CASE
                     WHEN t.transcription_status = 'finalised' THEN 1
                 END) AS number_of_images_finalised,
            MIN(i.image_path) AS first_image_path
        FROM images i
        LEFT JOIN transcriptions t ON i.id = t.image_id
        WHERE i.document_id IN (SELECT id FROM paginated_documents)
        GROUP BY i.document_id
    )
    SELECT
        d.id,
        d.user_id,
        d.document_name,
        d.creator_name,
        d.date,
        d.identifier,
        d.created_at,
        d.updated_at,
        COALESCE(ic.number_of_images_draft, 0) AS number_of_images_draft,
        COALESCE(ic.number_of_images_transcribed, 0) AS number_of_images_transcribed,
        COALESCE(ic.number_of_images_finalised, 0) AS number_of_images_finalised,
        ic.first_image_path
    FROM paginated_documents d
    LEFT JOIN image_counts ic ON d.id = ic.document_id
    ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_documents_by_list_id;
CREATE OR REPLACE FUNCTION get_documents_by_list_id(
    list_id TEXT,
    page_size INTEGER DEFAULT 10,
    page_number INTEGER DEFAULT 1
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    document_name TEXT,
    creator_name TEXT,
    date DATE,
    identifier TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    number_of_images_draft INTEGER,
    number_of_images_transcribed INTEGER,
    number_of_images_finalised INTEGER,
    first_image_path TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH paginated_documents AS (
        SELECT d.*
        FROM documents d
        JOIN lists_documents ld ON d.id = ld.document_id
        WHERE ld.list_id = list_id::uuid
        ORDER BY d.created_at DESC
        LIMIT page_size
        OFFSET ((page_number - 1) * page_size)
    ),
    image_counts AS (
        SELECT
            i.document_id,
            COUNT(CASE
                     WHEN t.transcription_status = 'draft' OR t.image_id IS NULL THEN 1
                 END) AS number_of_images_draft,
            COUNT(CASE
                     WHEN t.transcription_status = 'transcribed' THEN 1
                 END) AS number_of_images_transcribed,
            COUNT(CASE
                     WHEN t.transcription_status = 'finalised' THEN 1
                 END) AS number_of_images_finalised,
            MIN(i.image_path) AS first_image_path
        FROM images i
        LEFT JOIN transcriptions t ON i.id = t.image_id
        WHERE i.document_id IN (SELECT id FROM paginated_documents)
        GROUP BY i.document_id
    )
    SELECT
        d.id,
        d.user_id,
        d.document_name,
        d.creator_name,
        d.date,
        d.identifier,
        d.created_at,
        d.updated_at,
        COALESCE(ic.number_of_images_draft, 0) AS number_of_images_draft,
        COALESCE(ic.number_of_images_transcribed, 0) AS number_of_images_transcribed,
        COALESCE(ic.number_of_images_finalised, 0) AS number_of_images_finalised,
        ic.first_image_path
    FROM paginated_documents d
    LEFT JOIN image_counts ic ON d.id = ic.document_id
    ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_document_by_id;
CREATE OR REPLACE FUNCTION get_document_by_id(document_id TEXT)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    document_name TEXT,
    creator_name TEXT,
    date DATE,
    identifier TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    number_of_images_draft INTEGER,
    number_of_images_transcribed INTEGER,
    number_of_images_finalised INTEGER,
    first_image_path TEXT,
    archive TEXT,
    box TEXT,
    collection TEXT,
    folder TEXT,
    rights TEXT,
    type TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH image_counts AS (
        SELECT
            i.document_id,
            COUNT(CASE
                     WHEN t.transcription_status = 'draft' OR t.image_id IS NULL THEN 1
                 END) AS number_of_images_draft,
            COUNT(CASE
                     WHEN t.transcription_status = 'transcribed' THEN 1
                 END) AS number_of_images_transcribed,
            COUNT(CASE
                     WHEN t.transcription_status = 'finalised' THEN 1
                 END) AS number_of_images_finalised,
            MIN(i.image_path) AS first_image_path
        FROM images i
        LEFT JOIN transcriptions t ON i.id = t.image_id
        GROUP BY i.document_id
    )
    SELECT
        d.id,
        d.user_id,
        d.document_name,
        d.creator_name,
        d.date,
        d.identifier,
        d.created_at,
        d.updated_at,
        COALESCE(ic.number_of_images_draft, 0),
        COALESCE(ic.number_of_images_transcribed, 0),
        COALESCE(ic.number_of_images_finalised, 0),
        ic.first_image_path,
        d.archive,
        d.box,
        d.collection,
        d.folder,
        d.rights,
        d.type
    FROM documents d
    LEFT JOIN image_counts ic ON d.id = ic.document_id
    WHERE d.id = document_id::uuid;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_image_by_id;
CREATE OR REPLACE FUNCTION get_image_by_id(image_id TEXT)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    image_name TEXT,
    "order" INTEGER,
    image_path TEXT,
    transcription_id UUID,
    current_transcription_text TEXT,
    ai_transcription_text TEXT,
    transcription_status TEXT,
    transcription_job_id UUID,
    transcription_job_status TEXT,
    note_id UUID,
    notes_text TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_transcription_job AS (
        SELECT tj.id AS transcription_job_id,
               tj.image_id,
               tj.status AS transcription_job_status,
               tj.created_at
        FROM transcription_jobs tj
        WHERE tj.image_id = image_id
        ORDER BY tj.created_at DESC
        LIMIT 1
    )
    SELECT
        i.id,
        i.document_id,
        i.image_name,
        i."order",
        i.image_path,
        t.id AS transcription_id,
        t.current_transcription_text,
        t.ai_transcription_text,
        t.transcription_status,
        ltj.transcription_job_id,
        ltj.transcription_job_status,
        n.id AS note_id,
        n.notes_text
    FROM images i
    LEFT JOIN transcriptions t ON i.id = t.image_id
    LEFT JOIN latest_transcription_job ltj ON i.id = ltj.image_id
    LEFT JOIN notes n ON i.id = n.image_id
    WHERE i.id = image_id::uuid;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_total_images_by_user_id;
CREATE OR REPLACE FUNCTION get_total_images_by_user_id(user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COUNT(i.id)
    INTO total_count
    FROM documents d
    JOIN images i ON d.id = i.document_id
    WHERE d.user_id = user_id::uuid;

    RETURN total_count;
END;
$$ LANGUAGE plpgsql;


COMMIT;
