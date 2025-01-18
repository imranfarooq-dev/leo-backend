set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.fetch_documents_for_lists(list_ids integer[], _from integer DEFAULT NULL::integer, _to integer DEFAULT NULL::integer)
 RETURNS TABLE(id integer, document_name character varying, creator_name character varying, date character varying, type character varying, archive character varying, collection character varying, box character varying, folder character varying, identifier character varying, rights character varying, user_id character varying, created_at timestamp without time zone, updated_at timestamp without time zone, total_count integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_documents_count int;
BEGIN
  -- Calculate total count of distinct documents
  SELECT COUNT(DISTINCT d.id)
  INTO total_documents_count
  FROM documents d
  INNER JOIN lists_documents ld ON ld.document_id = d.id
  WHERE ld.list_id = ANY(list_ids);

  -- Return the distinct documents with pagination and total count
  RETURN QUERY
  SELECT 
    d.id, 
    d.document_name, 
    d.creator_name, 
    d.date, 
    d.type, 
    d.archive, 
    d.collection, 
    d.box, 
    d.folder, 
    d.identifier, 
    d.rights, 
    d.user_id, 
    d.created_at, 
    d.updated_at, 
    total_documents_count  -- Total count of distinct documents
  FROM (
    SELECT DISTINCT ON (d.id) d.id, d.document_name, d.creator_name, d.date, d.type, d.archive, 
                        d.collection, d.box, d.folder, d.identifier, d.rights, d.user_id, 
                        d.created_at, d.updated_at
    FROM documents d
    INNER JOIN lists_documents ld ON ld.document_id = d.id
    WHERE ld.list_id = ANY(list_ids)
    ORDER BY d.id
    LIMIT CASE WHEN _from IS NOT NULL AND _to IS NOT NULL THEN (_to - _from + 1) ELSE NULL END
    OFFSET COALESCE(_from, 0)
  ) AS d;

END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_list_with_children(_id integer)
 RETURNS TABLE(id integer)
 LANGUAGE plpgsql
AS $function$BEGIN
  RETURN QUERY
  WITH RECURSIVE list_hierarchy AS (
      -- Base case: Select the root list with the given id (use lists.id to disambiguate)
      SELECT lists.id, lists.parent_list_id
      FROM lists
      WHERE lists.id = _id  -- Use the renamed parameter (_id)
      
      UNION ALL
      
      -- Recursive case: Select children of the previously selected rows (alias as l)
      SELECT l.id, l.parent_list_id
      FROM lists l
      INNER JOIN list_hierarchy lh ON lh.id = l.parent_list_id
  )
  -- Return the ids of all matching rows
  SELECT list_hierarchy.id FROM list_hierarchy;
END;$function$
;


