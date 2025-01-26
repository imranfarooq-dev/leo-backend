ALTER TABLE credits
DROP CONSTRAINT IF EXISTS fk_credits_user_uuid,
ADD CONSTRAINT fk_credits_user_id
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

ALTER TABLE documents
DROP CONSTRAINT IF EXISTS fk_documents_user_uuid,
ADD CONSTRAINT fk_documents_user_id
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

ALTER TABLE images
DROP CONSTRAINT IF EXISTS fk_images_document_uuid,
ADD CONSTRAINT fk_images_document_id
    FOREIGN KEY (document_id)
    REFERENCES documents(id)
    ON DELETE CASCADE;

ALTER TABLE images
DROP CONSTRAINT IF EXISTS fk_images_next_image_uuid,
ADD CONSTRAINT fk_images_next_image_id
    FOREIGN KEY (next_image_id)
    REFERENCES images(id)
    ON DELETE SET NULL;

ALTER TABLE lists
DROP CONSTRAINT IF EXISTS fk_lists_parent_list_uuid,
ADD CONSTRAINT fk_lists_parent_list_id
    FOREIGN KEY (parent_list_id)
    REFERENCES lists(id)
    ON DELETE CASCADE;

ALTER TABLE lists
DROP CONSTRAINT IF EXISTS fk_lists_next_list_uuid,
ADD CONSTRAINT fk_lists_next_list_id
    FOREIGN KEY (next_list_id)
    REFERENCES lists(id)
    ON DELETE SET NULL;

ALTER TABLE lists
DROP CONSTRAINT IF EXISTS fk_lists_user_uuid,
ADD CONSTRAINT fk_lists_user_id
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

ALTER TABLE lists_documents
DROP CONSTRAINT IF EXISTS fk_lists_documents_document_uuid,
ADD CONSTRAINT fk_lists_documents_document_id
    FOREIGN KEY (document_id)
    REFERENCES documents(id)
    ON DELETE CASCADE;

ALTER TABLE lists_documents
DROP CONSTRAINT IF EXISTS fk_lists_documents_list_uuid,
ADD CONSTRAINT fk_lists_documents_list_id
    FOREIGN KEY (list_id)
    REFERENCES lists(id)
    ON DELETE CASCADE;

ALTER TABLE notes
DROP CONSTRAINT IF EXISTS fk_notes_image_uuid,
ADD CONSTRAINT fk_notes_image_id
    FOREIGN KEY (image_id)
    REFERENCES images(id)
    ON DELETE CASCADE;

ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS fk_subscriptions_user_uuid,
ADD CONSTRAINT fk_subscriptions_user_id
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

ALTER TABLE transcriptions
DROP CONSTRAINT IF EXISTS fk_transcriptions_image_uuid,
ADD CONSTRAINT fk_transcriptions_image_id
    FOREIGN KEY (image_id)
    REFERENCES images(id)
    ON DELETE CASCADE;