BEGIN;
ALTER TABLE lists ADD COLUMN "order" INT;

WITH RECURSIVE ordered_lists AS (
  SELECT 
    l.id,
	l.list_name,
	l.parent_list_id,
    l.next_list_id,
    1 as "order"
  FROM lists l
  WHERE NOT EXISTS (
    SELECT 1 
    FROM lists prev 
    WHERE prev.next_list_id = l.id
  )
  
  UNION ALL
 
  SELECT 
    l.id,
    l.list_name,
    l.parent_list_id,
    l.next_list_id,
    s.order + 1
  FROM lists l
  JOIN ordered_lists s ON l.id = s.next_list_id
)
UPDATE lists
SET "order" = (SELECT "order" FROM ordered_lists WHERE ordered_lists.id = lists.id);

CREATE INDEX idx_lists_order ON lists (parent_list_id, "order");
ALTER TABLE lists ALTER COLUMN "order" SET NOT NULL;
ALTER TABLE lists ADD CONSTRAINT unique_parent_order UNIQUE (parent_list_id, "order");

-- Drop the next_list_id column
ALTER TABLE lists DROP CONSTRAINT IF EXISTS fk_lists_next_list_id;
ALTER TABLE lists DROP COLUMN IF EXISTS next_list_id;

-- Add a function to delete a list and reorder the lists
CREATE OR REPLACE FUNCTION delete_list_and_reorder(
  p_list_id UUID
)
RETURNS TABLE (
  id UUID,
  list_name TEXT,
  user_id TEXT,
  parent_list_id UUID,
  "order" INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
DECLARE
  v_parent_list_id UUID;
  v_current_order INTEGER;
BEGIN
    -- Check if list exists and get its parent_list_id and order
    SELECT parent_list_id, "order"
    INTO v_parent_list_id, v_current_order
    FROM lists 
    WHERE id = p_list_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'List not found' USING ERRCODE = 'P0002';
    END IF;

    -- Delete the list
    DELETE FROM lists WHERE id = p_list_id;

    -- Update orders of sibling lists
    UPDATE lists
    SET "order" = "order" - 1
    WHERE 
      COALESCE(parent_list_id, UUID_NIL()) = COALESCE(v_parent_list_id, UUID_NIL())
      AND "order" > v_current_order;

    -- Return the updated sibling lists
    RETURN QUERY
    SELECT *
    FROM lists
    WHERE 
      COALESCE(parent_list_id, UUID_NIL()) = COALESCE(v_parent_list_id, UUID_NIL())
    ORDER BY "order";
END;
$$ LANGUAGE plpgsql;

COMMIT;

