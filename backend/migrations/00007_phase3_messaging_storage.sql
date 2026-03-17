-- +goose Up
ALTER TABLE messages
  DROP FOREIGN KEY fk_messages_sender,
  DROP FOREIGN KEY fk_messages_recipient,
  DROP FOREIGN KEY fk_messages_channel;

ALTER TABLE messages
  CHANGE COLUMN sender_id author_id CHAR(36) NOT NULL,
  MODIFY COLUMN recipient_id CHAR(36) NULL,
  MODIFY COLUMN channel_id CHAR(36) NOT NULL,
  MODIFY COLUMN content JSON NOT NULL,
  ADD COLUMN is_edited TINYINT(1) NOT NULL DEFAULT 0 AFTER content,
  ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 AFTER is_edited;

ALTER TABLE messages
  ADD CONSTRAINT fk_messages_author FOREIGN KEY (author_id) REFERENCES users(id),
  ADD CONSTRAINT fk_messages_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_messages_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS message_reactions (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  message_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  emoji VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_message_reactions_message_user_emoji (message_id, user_id, emoji),
  KEY idx_message_reactions_deleted_at (deleted_at),
  KEY idx_message_reactions_message_id (message_id),
  KEY idx_message_reactions_user_id (user_id),
  CONSTRAINT fk_message_reactions_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_message_reactions_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS message_attachments (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  message_id CHAR(36) NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_message_attachments_deleted_at (deleted_at),
  KEY idx_message_attachments_message_id (message_id),
  CONSTRAINT fk_message_attachments_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS message_attachments;
DROP TABLE IF EXISTS message_reactions;

ALTER TABLE messages
  DROP FOREIGN KEY fk_messages_author,
  DROP FOREIGN KEY fk_messages_recipient,
  DROP FOREIGN KEY fk_messages_channel,
  CHANGE COLUMN author_id sender_id CHAR(36) NOT NULL,
  DROP COLUMN is_edited,
  DROP COLUMN is_pinned,
  MODIFY COLUMN recipient_id CHAR(36) NOT NULL,
  MODIFY COLUMN channel_id CHAR(36) NULL,
  MODIFY COLUMN content TEXT NOT NULL;

ALTER TABLE messages
  ADD CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id),
  ADD CONSTRAINT fk_messages_recipient FOREIGN KEY (recipient_id) REFERENCES users(id),
  ADD CONSTRAINT fk_messages_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL;
