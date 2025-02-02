BEGIN;

ALTER TABLE lists DROP CONSTRAINT IF EXISTS unique_parent_order;
ALTER TABLE lists ADD CONSTRAINT unique_parent_order UNIQUE (parent_list_id, "order") DEFERRABLE INITIALLY DEFERRED;

COMMIT;