BEGIN;

DROP FUNCTION IF EXISTS update_list_orders;

CREATE OR REPLACE FUNCTION update_list_orders(
  updates jsonb[]
) RETURNS void AS $$
BEGIN
  WITH updates AS (
    SELECT 
      (json_element->>'id')::uuid as id,
      (json_element->>'order')::int as "order"
    FROM unnest(updates) AS arr(json_element)
  )
  UPDATE lists l
  SET "order" = u.order
  FROM updates u
  WHERE l.id = u.id;
END;
$$ LANGUAGE plpgsql;

COMMIT;