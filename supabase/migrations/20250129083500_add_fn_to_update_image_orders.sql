BEGIN;

CREATE OR REPLACE FUNCTION update_image_orders(
  image_updates jsonb[]
) RETURNS SETOF images AS $$
BEGIN
  WITH updates AS (
    SELECT 
      (json_element->>'id')::uuid as id,
      (json_element->>'document_id')::uuid as document_id,
      json_element->>'image_name' as image_name,
      json_element->>'image_path' as image_path,
      (json_element->>'order')::int as "order"
    FROM unnest(image_updates) AS arr(json_element)
  )
  UPDATE images i
  SET temp_order = u.order
  FROM updates u
  WHERE i.id = u.id

  UPDATE images
  SET "order" = temp_order,
      temp_order = NULL
  FROM updates u
  WHERE u.id = images.id

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