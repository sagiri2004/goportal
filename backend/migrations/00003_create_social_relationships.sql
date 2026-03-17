-- +goose Up
CREATE TABLE IF NOT EXISTS relationship_status (
  code VARCHAR(32) NOT NULL,
  description VARCHAR(255) NOT NULL,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO relationship_status (code, description)
VALUES
  ('PENDING', 'Friend request pending'),
  ('ACCEPTED', 'Friend request accepted'),
  ('DECLINED', 'Friend request declined'),
  ('BLOCKED', 'User blocked')
ON DUPLICATE KEY UPDATE description = VALUES(description);

CREATE TABLE IF NOT EXISTS user_relationships (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  requester_id CHAR(36) NOT NULL,
  addressee_id CHAR(36) NOT NULL,
  status VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_relationship_pair (requester_id, addressee_id),
  KEY idx_user_relationships_deleted_at (deleted_at),
  KEY idx_user_relationships_status (status),
  KEY idx_user_relationships_requester (requester_id),
  KEY idx_user_relationships_addressee (addressee_id),
  CONSTRAINT fk_relationship_requester FOREIGN KEY (requester_id) REFERENCES users(id),
  CONSTRAINT fk_relationship_addressee FOREIGN KEY (addressee_id) REFERENCES users(id),
  CONSTRAINT fk_relationship_status FOREIGN KEY (status) REFERENCES relationship_status(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS user_relationships;
DROP TABLE IF EXISTS relationship_status;
