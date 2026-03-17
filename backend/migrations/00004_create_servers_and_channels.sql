-- +goose Up
CREATE TABLE IF NOT EXISTS servers (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  name VARCHAR(255) NOT NULL,
  owner_id CHAR(36) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_servers_deleted_at (deleted_at),
  KEY idx_servers_owner_id (owner_id),
  CONSTRAINT fk_servers_owner FOREIGN KEY (owner_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS server_members (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  server_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_server_members_server_user (server_id, user_id),
  KEY idx_server_members_deleted_at (deleted_at),
  KEY idx_server_members_server_id (server_id),
  KEY idx_server_members_user_id (user_id),
  CONSTRAINT fk_server_members_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
  CONSTRAINT fk_server_members_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS channel_types (
  code VARCHAR(32) NOT NULL,
  description VARCHAR(255) NOT NULL,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO channel_types (code, description)
VALUES
  ('TEXT', 'Text channel'),
  ('VOICE', 'Voice channel'),
  ('CATEGORY', 'Category channel')
ON DUPLICATE KEY UPDATE description = VALUES(description);

CREATE TABLE IF NOT EXISTS channels (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  server_id CHAR(36) NOT NULL,
  parent_id CHAR(36) NULL,
  type VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_channels_deleted_at (deleted_at),
  KEY idx_channels_server_id (server_id),
  KEY idx_channels_parent_id (parent_id),
  KEY idx_channels_type (type),
  KEY idx_channels_server_parent_position (server_id, parent_id, position),
  CONSTRAINT fk_channels_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
  CONSTRAINT fk_channels_parent FOREIGN KEY (parent_id) REFERENCES channels(id) ON DELETE SET NULL,
  CONSTRAINT fk_channels_type FOREIGN KEY (type) REFERENCES channel_types(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS channels;
DROP TABLE IF EXISTS channel_types;
DROP TABLE IF EXISTS server_members;
DROP TABLE IF EXISTS servers;
