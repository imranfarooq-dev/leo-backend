BEGIN;

WITH min_orders AS (
  SELECT document_id, MIN("order") as min_order
  FROM images
  GROUP BY document_id
),
-- Calculate the offset needed for each document
offsets AS (
  SELECT 
    document_id,
    CASE 
      WHEN min_order = 0 THEN 1  -- If min is 0, we need to add 1 to all orders
      WHEN min_order > 1 THEN 0  -- If min is > 1, no change needed
      ELSE 1 - min_order        -- Handle any other cases
    END as offset_value
  FROM min_orders
)

-- Update all orders using the calculated offset
UPDATE images i
SET "order" = i."order" + o.offset_value
FROM offsets o
WHERE i.document_id = o.document_id
AND o.offset_value != 0;  -- Only update where needed

COMMIT;