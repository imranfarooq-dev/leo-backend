ALTER TABLE credits
ADD CONSTRAINT fk_credits_user_uuid
FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE documents
ADD CONSTRAINT fk_documents_user_uuid
FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE lists
ADD CONSTRAINT fk_lists_user_uuid
FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE subscriptions
ADD CONSTRAINT fk_subscriptions_user_uuid
FOREIGN KEY (user_id) REFERENCES users(id);

