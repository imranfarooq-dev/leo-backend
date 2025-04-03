BEGIN;

DROP FUNCTION IF EXISTS search_documents_and_lists(TEXT, TEXT);

CREATE OR REPLACE FUNCTION search_documents_and_lists(search_term TEXT, user_id_param TEXT)
RETURNS TABLE(id uuid, name TEXT, type TEXT) AS $$
BEGIN
  RETURN QUERY
    SELECT documents.id, document_name AS name, 'document' AS type
    FROM documents
    WHERE document_name ILIKE '%' || search_term || '%'
      AND user_id = user_id_param
  UNION ALL
    SELECT lists.id, list_name AS name, 'list' AS type
    FROM lists
    WHERE list_name ILIKE '%' || search_term || '%'
      AND user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

COMMIT;