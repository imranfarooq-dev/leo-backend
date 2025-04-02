BEGIN;

CREATE OR REPLACE FUNCTION update_image_filenames(
    p_image_ids TEXT[],
    p_filenames TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Validate arrays are same length
    IF array_length(p_image_ids, 1) != array_length(p_filenames, 1) THEN
        RAISE EXCEPTION 'Arrays must be of equal length';
    END IF;

    -- Create temp table to store successful updates
    CREATE TEMP TABLE temp_updates (
        id UUID,
        filename TEXT
    ) ON COMMIT DROP;

    -- Update images and capture successful updates
    WITH updates AS (
        SELECT 
            uuid(unnest(p_image_ids)) as id,
            unnest(p_filenames) as new_filename
    )
    INSERT INTO temp_updates (id, filename)
    SELECT u.id, u.new_filename
    FROM updates u
    WHERE EXISTS (
        SELECT 1 FROM images i WHERE i.id = u.id
    );

    -- Perform the actual updates
    UPDATE images i
    SET filename = tu.filename
    FROM temp_updates tu
    WHERE i.id = tu.id;

    -- Return results as JSONB
    RETURN (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', id::text,
                'filename', filename
            )
        )
        FROM temp_updates
    );
END;
$$;

COMMIT;