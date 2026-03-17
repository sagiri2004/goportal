-- +goose Up
CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  sender_id CHAR(36) NOT NULL,
  recipient_id CHAR(36) NOT NULL,
  channel_id CHAR(36) NULL,
  content TEXT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_messages_deleted_at (deleted_at),
  KEY idx_messages_sender_id (sender_id),
  KEY idx_messages_recipient_id (recipient_id),
  KEY idx_messages_channel_id (channel_id),
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id),
  CONSTRAINT fk_messages_recipient FOREIGN KEY (recipient_id) REFERENCES users(id),
  CONSTRAINT fk_messages_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS messages;
