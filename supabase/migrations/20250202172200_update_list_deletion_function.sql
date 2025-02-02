BEGIN;

DROP FUNCTION IF EXISTS delete_list_and_reorder;

CREATE OR REPLACE FUNCTION delete_list_and_reorder(
  p_list_id UUID
)
RETURNS TABLE (
  id UUID,
  "order" INTEGER
) AS $$
DECLARE
  v_parent_list_id UUID;
  v_current_order INTEGER;
BEGIN
    -- Check if list exists and get its parent_list_id and order
    SELECT lists.parent_list_id, lists."order"
    INTO v_parent_list_id, v_current_order
    FROM lists 
    WHERE lists.id = p_list_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'List not found' USING ERRCODE = 'P0002';
    END IF;

    -- Delete the list
    DELETE FROM lists WHERE lists.id = p_list_id;

    -- Update orders of sibling lists
    UPDATE lists
    SET "order" = lists."order" - 1
    WHERE 
      COALESCE(lists.parent_list_id, UUID_NIL()) = COALESCE(v_parent_list_id, UUID_NIL())
      AND lists."order" > v_current_order;

    -- Return the updated sibling list orders
    RETURN QUERY
    SELECT lists.id, lists."order"
    FROM lists
    WHERE 
      COALESCE(lists.parent_list_id, UUID_NIL()) = COALESCE(v_parent_list_id, UUID_NIL())
    ORDER BY lists."order";
END;
$$ LANGUAGE plpgsql;

COMMIT;
