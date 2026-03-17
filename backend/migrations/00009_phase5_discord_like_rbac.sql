-- +goose Up
ALTER TABLE roles
  ADD COLUMN position INT NOT NULL DEFAULT 0 AFTER name,
  ADD KEY idx_roles_server_position (server_id, position);

UPDATE roles
SET position = CASE
  WHEN LOWER(name) = 'owner' THEN 100
  WHEN LOWER(name) = 'admin' THEN 80
  WHEN LOWER(name) = 'moderator' THEN 50
  ELSE 0
END
WHERE deleted_at = 0;

ALTER TABLE server_members
  ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'active' AFTER user_id,
  ADD KEY idx_server_members_status (status);

ALTER TABLE channels
  ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT FALSE AFTER position,
  ADD KEY idx_channels_is_private (is_private);

CREATE TABLE IF NOT EXISTS server_join_requests (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  server_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  reviewed_by CHAR(36) NULL,
  reviewed_at BIGINT NULL,
  decision_note VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  KEY idx_server_join_requests_deleted_at (deleted_at),
  KEY idx_server_join_requests_server_id (server_id),
  KEY idx_server_join_requests_user_id (user_id),
  KEY idx_server_join_requests_status (status),
  CONSTRAINT fk_server_join_requests_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
  CONSTRAINT fk_server_join_requests_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_server_join_requests_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS channel_members (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  channel_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_channel_members_channel_user (channel_id, user_id),
  KEY idx_channel_members_deleted_at (deleted_at),
  KEY idx_channel_members_channel_id (channel_id),
  KEY idx_channel_members_user_id (user_id),
  CONSTRAINT fk_channel_members_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
  CONSTRAINT fk_channel_members_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS channel_permission_overwrites (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  channel_id CHAR(36) NOT NULL,
  subject_type VARCHAR(8) NOT NULL,
  subject_id CHAR(36) NOT NULL,
  allow_bits BIGINT NOT NULL DEFAULT 0,
  deny_bits BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_channel_permission_overwrite (channel_id, subject_type, subject_id),
  KEY idx_channel_permission_overwrites_deleted_at (deleted_at),
  KEY idx_channel_permission_overwrites_channel_id (channel_id),
  KEY idx_channel_permission_overwrites_subject (subject_type, subject_id),
  CONSTRAINT fk_channel_permission_overwrites_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS channel_permission_overwrites;
DROP TABLE IF EXISTS channel_members;
DROP TABLE IF EXISTS server_join_requests;

ALTER TABLE channels
  DROP KEY idx_channels_is_private,
  DROP COLUMN is_private;

ALTER TABLE server_members
  DROP KEY idx_server_members_status,
  DROP COLUMN status;

ALTER TABLE roles
  DROP KEY idx_roles_server_position,
  DROP COLUMN position;
