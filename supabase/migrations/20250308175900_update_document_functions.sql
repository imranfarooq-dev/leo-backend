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
                            'image_path', i.image_path,
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
                            'order', i."order",
                            'image_path', i.image_path,
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
                            'order', i."order",
                            'image_path', i.image_path,
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
                i."order",
                i.image_path,
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
                i."order",
                i.image_path,
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
                i."order",
                i.image_path,
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
                            'image_path', di.image_path,
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
