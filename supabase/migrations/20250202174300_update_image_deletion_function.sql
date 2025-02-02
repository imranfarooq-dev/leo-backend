BEGIN;

DROP FUNCTION IF EXISTS delete_image_and_reorder;

CREATE OR REPLACE FUNCTION delete_image_and_reorder(
  p_image_id UUID
)
RETURNS TABLE (
  id UUID,
  "order" INTEGER
) AS $$
DECLARE
  v_document_id UUID;
  v_current_order INTEGER;
BEGIN
    -- Check if list exists and get its parent_list_id and order
    SELECT images.document_id, images."order"
    INTO v_document_id, v_current_order
    FROM images 
    WHERE images.id = p_image_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Image not found' USING ERRCODE = 'P0002';
    END IF;

    -- Delete the image
    DELETE FROM images WHERE images.id = p_image_id;

    -- Update orders of sibling images
    UPDATE images
    SET "order" = images."order" - 1
    WHERE 
      images.document_id = v_document_id
      AND images."order" > v_current_order;

    -- Return the updated sibling image orders
    RETURN QUERY
    SELECT images.id, images."order"
    FROM images
    WHERE 
      images.document_id = v_document_id
    ORDER BY images."order";
END;
$$ LANGUAGE plpgsql;

COMMIT;
