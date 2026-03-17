-- +goose Up
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  event_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  source_type VARCHAR(32) NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
  payload JSON NOT NULL,
  metadata JSON NULL,
  delivery_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  delivered_to_server_at BIGINT NULL,
  delivered_to_client_at BIGINT NULL,
  last_error TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notifications_event_id (event_id),
  KEY idx_notifications_deleted_at (deleted_at),
  KEY idx_notifications_user_id (user_id),
  KEY idx_notifications_source_type (source_type),
  KEY idx_notifications_event_type (event_type),
  KEY idx_notifications_delivery_status (delivery_status),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS notifications;
