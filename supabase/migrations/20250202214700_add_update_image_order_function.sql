BEGIN;

DROP FUNCTION IF EXISTS update_image_orders;

CREATE OR REPLACE FUNCTION update_image_orders(
  updates jsonb[]
) RETURNS void AS $$
BEGIN
  WITH updates AS (
    SELECT 
      (json_element->>'id')::uuid as id,
      (json_element->>'order')::int as "order"
    FROM unnest(updates) AS arr(json_element)
  )
  UPDATE images i
  SET "order" = u.order
  FROM updates u
  WHERE i.id = u.id;
END;
$$ LANGUAGE plpgsql;

COMMIT;