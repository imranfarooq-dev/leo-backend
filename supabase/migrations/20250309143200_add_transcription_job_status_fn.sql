BEGIN;

DROP FUNCTION IF EXISTS get_latest_transcription_jobs(TEXT[], TIMESTAMP);
CREATE OR REPLACE FUNCTION get_latest_transcription_jobs(
    p_image_ids TEXT[],
    p_earliest_created_at TIMESTAMP DEFAULT NULL
) 
RETURNS JSONB AS $$
BEGIN
    RETURN (
        WITH latest_jobs AS (
            SELECT 
                tj.id,
                tj.image_id,
                tj.external_job_id,
                tj.status,
                tj.transcript_text,
                tj.created_at,
                tj.updated_at,
                -- Use ROW_NUMBER to get the latest job per image
                ROW_NUMBER() OVER (
                    PARTITION BY tj.image_id 
                    ORDER BY tj.created_at DESC
                ) as rn
            FROM transcription_jobs tj
            WHERE 
                tj.image_id = ANY(p_image_ids::uuid[])
                AND (
                    p_earliest_created_at IS NULL 
                    OR tj.created_at >= p_earliest_created_at
                )
        )
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', id,
                'image_id', image_id,
                'external_job_id', external_job_id,
                'status', status,
                'transcript_text', transcript_text,
                'created_at', created_at,
                'updated_at', updated_at
            )
        )
        FROM latest_jobs
        WHERE rn = 1
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;
