BEGIN;

ALTER TABLE images DROP CONSTRAINT IF EXISTS unique_document_order;
ALTER TABLE images ADD CONSTRAINT unique_document_order UNIQUE (document_id, "order") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE images DROP COLUMN IF EXISTS temp_order;

CREATE OR REPLACE FUNCTION update_image_orders(
  image_updates jsonb[]
) RETURNS SETOF images AS $$
BEGIN
  WITH updates AS (
    SELECT 
      (json_element->>'id')::uuid as id,
      (json_element->>'order')::int as "order"
    FROM unnest(image_updates) AS arr(json_element)
  )
  UPDATE images i
  SET "order" = u.order
  FROM updates u
  WHERE i.id = u.id;

  -- Return updated records
  RETURN QUERY
  SELECT * FROM images 
  WHERE id IN (
    SELECT (json_element->>'id')::uuid
    FROM unnest(image_updates) AS arr(json_element)
  );
END;
$$ LANGUAGE plpgsql;

COMMIT;