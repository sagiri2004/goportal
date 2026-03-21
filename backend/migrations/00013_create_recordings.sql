-- +goose Up
CREATE TABLE IF NOT EXISTS recordings (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  channel_id CHAR(36) NOT NULL,
  server_id CHAR(36) NOT NULL,
  started_by CHAR(36) NOT NULL,
  egress_id VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  file_url TEXT NULL,
  rtmp_url TEXT NULL,
  duration_seconds BIGINT NULL,
  started_at BIGINT NOT NULL,
  ended_at BIGINT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recordings_egress_id (egress_id),
  KEY idx_recordings_deleted_at (deleted_at),
  KEY idx_recordings_channel_id (channel_id),
  KEY idx_recordings_server_id (server_id),
  KEY idx_recordings_started_by (started_by),
  KEY idx_recordings_type (type),
  KEY idx_recordings_status (status),
  KEY idx_recordings_started_at (started_at),
  KEY idx_recordings_ended_at (ended_at),
  CONSTRAINT fk_recordings_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
  CONSTRAINT fk_recordings_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
  CONSTRAINT fk_recordings_started_by FOREIGN KEY (started_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS recordings;
