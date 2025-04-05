BEGIN;

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
        latest_transcription_jobs AS (
            SELECT tj.id AS transcription_job_id,
                   tj.image_id,
                   tj.status AS transcription_job_status,
                   tj.created_at
            FROM transcription_jobs tj
            WHERE tj.image_id IN (
                SELECT i.id 
                FROM images i 
                WHERE i.document_id IN (SELECT id FROM paginated_documents)
            )
            AND (
                tj.created_at = (
                    SELECT MAX(tj2.created_at)
                    FROM transcription_jobs tj2
                    WHERE tj2.image_id = tj.image_id
                )
            )
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
                            'order', i."order",
                            'filename', i.filename,
                            'transcription_status', t.transcription_status,
                            'transcription_job_status', ltj.transcription_job_status,
                            'note_exists', n.notes_text IS NOT NULL AND LENGTH(TRIM(n.notes_text)) > 0
                        ) ORDER BY i."order"
                    )
                    FROM images i
                    LEFT JOIN transcriptions t ON i.id = t.image_id
                    LEFT JOIN latest_transcription_jobs ltj ON i.id = ltj.image_id
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
        latest_transcription_jobs AS (
            SELECT tj.id AS transcription_job_id,
                   tj.image_id,
                   tj.status AS transcription_job_status,
                   tj.created_at
            FROM transcription_jobs tj
            WHERE tj.image_id IN (
                SELECT i.id 
                FROM images i 
                WHERE i.document_id IN (SELECT id FROM paginated_documents)
            )
            AND (
                tj.created_at = (
                    SELECT MAX(tj2.created_at)
                    FROM transcription_jobs tj2
                    WHERE tj2.image_id = tj.image_id
                )
            )
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
                            'order', i."order",
                            'filename', i.filename,
                            'transcription_status', t.transcription_status,
                            'transcription_job_status', ltj.transcription_job_status,
                            'note_exists', n.notes_text IS NOT NULL AND LENGTH(TRIM(n.notes_text)) > 0
                        ) ORDER BY i."order"
                    )
                    FROM images i
                    LEFT JOIN transcriptions t ON i.id = t.image_id
                    LEFT JOIN latest_transcription_jobs ltj ON i.id = ltj.image_id
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
                            'order', i."order",
                            'filename', i.filename,
                            'transcription_status', t.transcription_status,
                            'transcription_job_status', ltj.transcription_job_status,
                            'note_exists', n.notes_text IS NOT NULL AND LENGTH(TRIM(n.notes_text)) > 0
                        ) ORDER BY i."order"
                    )
                    FROM images i
                    LEFT JOIN transcriptions t ON i.id = t.image_id
                    LEFT JOIN latest_transcription_jobs ltj ON i.id = ltj.image_id
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

DROP FUNCTION IF EXISTS get_image_summaries_by_ids(TEXT[]);
CREATE OR REPLACE FUNCTION get_image_summaries_by_ids(p_image_ids TEXT[])
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
        SELECT jsonb_agg(row_to_json(image_summary)::jsonb)
        FROM (
            SELECT
                i.id::text,
                i.document_id::text,
                i.image_name,
                i."order",
                i.filename,
                t.transcription_status,
                ltj.transcription_job_status,
                (n.notes_text IS NOT NULL AND LENGTH(TRIM(n.notes_text)) > 0) as note_exists
            FROM images i
            LEFT JOIN transcriptions t ON i.id = t.image_id
            LEFT JOIN latest_transcription_jobs ltj ON i.id = ltj.image_id
            LEFT JOIN notes n ON i.id = n.image_id
            WHERE i.id = ANY(p_image_ids::uuid[])
            ORDER BY i."order"
        ) image_summary
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;
