-- +goose Up
CREATE TABLE IF NOT EXISTS users_new (
  id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  username VARCHAR(255) NOT NULL,
  password TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users_new (id, created_at, updated_at, deleted_at, username, password, is_admin)
SELECT
  UUID(),
  COALESCE(UNIX_TIMESTAMP(created_at), UNIX_TIMESTAMP()),
  COALESCE(UNIX_TIMESTAMP(updated_at), UNIX_TIMESTAMP()),
  CASE
    WHEN deleted_at IS NULL THEN 0
    ELSE UNIX_TIMESTAMP(deleted_at)
  END,
  username,
  password,
  is_admin
FROM users;

DROP TABLE users;
RENAME TABLE users_new TO users;

-- +goose Down
CREATE TABLE IF NOT EXISTS users_old (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  deleted_at DATETIME(3) NULL,
  username VARCHAR(255) NOT NULL,
  password TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users_old (id, created_at, updated_at, deleted_at, username, password, is_admin)
SELECT
  FROM_UNIXTIME(created_at),
  FROM_UNIXTIME(updated_at),
  CASE
    WHEN deleted_at = 0 THEN NULL
    ELSE FROM_UNIXTIME(deleted_at)
  END,
  username,
  password,
  is_admin
FROM users;

DROP TABLE users;
RENAME TABLE users_old TO users;
