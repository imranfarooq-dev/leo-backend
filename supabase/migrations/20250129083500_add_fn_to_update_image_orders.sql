BEGIN;

CREATE OR REPLACE FUNCTION update_image_orders(
  image_updates jsonb[]
) RETURNS SETOF images AS $$
BEGIN
  -- Perform updates in a single transaction
  WITH updates AS (
    SELECT 
      x.id::uuid,
      x.document_id::uuid,
      x.image_name::text,
      x.image_path::text,
      x.order::int
    FROM jsonb_to_recordset(image_updates) AS x(
      id uuid,
      document_id uuid,
      image_name text,
      image_path text,
      "order" int
    )
  )
  UPDATE images i
  SET 
    image_name = u.image_name,
    image_path = u.image_path,
    "order" = u.order
  FROM updates u
  WHERE i.id = u.id
    AND i.document_id = u.document_id;

  -- Return updated records
  RETURN QUERY
  SELECT * FROM images 
  WHERE id IN (SELECT id::uuid FROM jsonb_to_recordset(image_updates) AS x(id uuid));
END;
$$ LANGUAGE plpgsql;

COMMIT;