set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.search_documents_and_lists(search_term text, user_id_param text)
 RETURNS TABLE(id integer, name character varying, type text)
 LANGUAGE plpgsql
AS $function$
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
$function$
;


