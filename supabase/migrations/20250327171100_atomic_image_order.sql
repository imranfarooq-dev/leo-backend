BEGIN;

-- Create a function that will be called by the trigger
CREATE OR REPLACE FUNCTION set_image_order()
RETURNS TRIGGER AS $$
BEGIN
    -- If order is not provided, set it to max + 1 for this document
    IF NEW."order" IS NULL THEN
        SELECT COALESCE(MAX("order"), 0) + 1
        INTO NEW."order"
        FROM images
        WHERE document_id = NEW.document_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS set_image_order_trigger ON images;
CREATE TRIGGER set_image_order_trigger
    BEFORE INSERT ON images
    FOR EACH ROW
    EXECUTE FUNCTION set_image_order();

COMMIT;