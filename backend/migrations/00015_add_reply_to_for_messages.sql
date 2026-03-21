-- +goose Up
ALTER TABLE messages
  ADD COLUMN reply_to_id CHAR(36) NULL AFTER channel_id,
  ADD KEY idx_messages_reply_to_id (reply_to_id),
  ADD CONSTRAINT fk_messages_reply_to FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL;

-- +goose Down
ALTER TABLE messages
  DROP FOREIGN KEY fk_messages_reply_to,
  DROP KEY idx_messages_reply_to_id,
  DROP COLUMN reply_to_id;
