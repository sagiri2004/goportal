-- +goose Up
CREATE TABLE IF NOT EXISTS user_games (
  id CHAR(36) NOT NULL,
  owner_user_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NULL,
  visibility VARCHAR(16) NOT NULL DEFAULT 'public',
  status VARCHAR(16) NOT NULL DEFAULT 'published',
  thumbnail_url TEXT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_games_slug (slug),
  KEY idx_user_games_owner (owner_user_id),
  KEY idx_user_games_visibility_status (visibility, status),
  CONSTRAINT fk_user_games_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_game_builds (
  id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  version VARCHAR(64) NOT NULL,
  storage_zip_url TEXT NOT NULL,
  play_base_path TEXT NOT NULL,
  entry_file VARCHAR(255) NOT NULL DEFAULT 'index.html',
  file_size BIGINT NOT NULL DEFAULT 0,
  checksum VARCHAR(128) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ready',
  error_message TEXT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_user_game_builds_game_id (game_id),
  KEY idx_user_game_builds_status (status),
  CONSTRAINT fk_user_game_builds_game FOREIGN KEY (game_id) REFERENCES user_games(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS user_game_builds;
DROP TABLE IF EXISTS user_games;
