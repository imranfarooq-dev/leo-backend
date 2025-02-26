BEGIN;

DROP FUNCTION IF EXISTS get_document_summaries_by_ids(TEXT[]);
DROP FUNCTION IF EXISTS get_image_summaries_by_ids(TEXT[]);

COMMIT;
