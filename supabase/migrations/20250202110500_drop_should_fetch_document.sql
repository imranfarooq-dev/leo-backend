BEGIN;
ALTER TABLE users DROP COLUMN should_fetch_document;
COMMIT;
