-- +goose Up
CREATE TABLE IF NOT EXISTS user_channel_reads (
  user_id CHAR(36) NOT NULL,
  channel_id CHAR(36) NOT NULL,
  last_read_at BIGINT NOT NULL DEFAULT 0,
  unread_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, channel_id),
  KEY idx_user_channel_reads_channel_id (channel_id),
  CONSTRAINT fk_user_channel_reads_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_channel_reads_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS message_mentions (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  message_id CHAR(36) NOT NULL,
  mentioned_user_id CHAR(36) NULL,
  mention_type VARCHAR(32) NOT NULL,
  channel_id CHAR(36) NULL,
  PRIMARY KEY (id),
  KEY idx_message_mentions_deleted_at (deleted_at),
  KEY idx_message_mentions_message_id (message_id),
  KEY idx_message_mentions_mentioned_user_id (mentioned_user_id),
  KEY idx_message_mentions_channel_id (channel_id),
  CONSTRAINT fk_message_mentions_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_message_mentions_mentioned_user FOREIGN KEY (mentioned_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_message_mentions_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS channel_notification_settings (
  user_id CHAR(36) NOT NULL,
  channel_id CHAR(36) NOT NULL,
  level VARCHAR(32) NOT NULL DEFAULT 'all',
  muted_until BIGINT NULL,
  PRIMARY KEY (user_id, channel_id),
  KEY idx_channel_notification_settings_channel_id (channel_id),
  KEY idx_channel_notification_settings_muted_until (muted_until),
  CONSTRAINT fk_channel_notification_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_channel_notification_settings_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS channel_notification_settings;
DROP TABLE IF EXISTS message_mentions;
DROP TABLE IF EXISTS user_channel_reads;
