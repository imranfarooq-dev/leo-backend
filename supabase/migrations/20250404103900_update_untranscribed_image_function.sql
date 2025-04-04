BEGIN;

DROP FUNCTION IF EXISTS get_untranscribed_image_ids(TEXT[]);
CREATE OR REPLACE FUNCTION get_untranscribed_image_ids(p_document_ids TEXT[])
RETURNS JSONB AS $$
BEGIN
    RETURN (
        WITH latest_transcription_jobs AS (
            SELECT 
                tj.image_id,
                tj.status AS transcription_job_status
            FROM transcription_jobs tj
            INNER JOIN (
                SELECT image_id, MAX(created_at) as latest_job_time
                FROM transcription_jobs
                GROUP BY image_id
            ) latest ON tj.image_id = latest.image_id 
                     AND tj.created_at = latest.latest_job_time
        )
        SELECT jsonb_agg(i.id::text)
        FROM images i
        LEFT JOIN transcriptions t ON i.id = t.image_id
        LEFT JOIN latest_transcription_jobs ltj ON i.id = ltj.image_id
        WHERE i.document_id = ANY(p_document_ids::uuid[])
        AND i.filename IS NOT NULL
        AND (
            -- No transcription exists OR both transcription texts are empty/null/whitespace
            t.id IS NULL 
            OR (
                (t.current_transcription_text IS NULL 
                 OR LENGTH(TRIM(t.current_transcription_text)) = 0)
            )
        )
        AND (
            -- Transcription status is draft or NULL
            t.transcription_status IS NULL 
            OR t.transcription_status = 'draft'::transcription_status_enum
        )
        AND (
            -- No in-progress transcription job
            ltj.transcription_job_status IS NULL 
            OR ltj.transcription_job_status != 'IN_PROGRESS'::transcription_job_status
        )
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;
