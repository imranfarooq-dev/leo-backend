BEGIN;

ALTER TABLE images ADD COLUMN filename VARCHAR;
UPDATE images
SET filename = REGEXP_REPLACE(image_path, '^images/full/', '');
ALTER TABLE images ALTER COLUMN filename SET NOT NULL;
ALTER TABLE images DROP COLUMN image_path;

ROLLBACK;
