-- +goose Up
CREATE TABLE IF NOT EXISTS game_score_entries (
  id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  leaderboard_id VARCHAR(64) NOT NULL DEFAULT 'default',
  user_id CHAR(36) NOT NULL,
  session_id CHAR(36) NULL,
  event_id CHAR(36) NULL,
  server_id CHAR(36) NULL,
  channel_id CHAR(36) NULL,
  score BIGINT NOT NULL,
  metadata JSON NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_game_score_entries_board_global (game_id, leaderboard_id, score, created_at),
  KEY idx_game_score_entries_board_server (game_id, leaderboard_id, server_id, score, created_at),
  KEY idx_game_score_entries_user (game_id, user_id, created_at),
  CONSTRAINT fk_game_score_entries_game FOREIGN KEY (game_id) REFERENCES user_games(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_score_entries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_score_entries_session FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE SET NULL,
  CONSTRAINT fk_game_score_entries_event FOREIGN KEY (event_id) REFERENCES game_events(id) ON DELETE SET NULL,
  CONSTRAINT fk_game_score_entries_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE SET NULL,
  CONSTRAINT fk_game_score_entries_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_leaderboard_entries (
  id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  leaderboard_id VARCHAR(64) NOT NULL DEFAULT 'default',
  scope VARCHAR(16) NOT NULL DEFAULT 'global',
  server_id CHAR(36) NULL,
  user_id CHAR(36) NOT NULL,
  best_score BIGINT NOT NULL,
  best_score_entry_id CHAR(36) NOT NULL,
  metadata JSON NULL,
  achieved_at BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_leaderboard_user_scope (game_id, leaderboard_id, scope, server_id, user_id),
  KEY idx_game_leaderboard_rank (game_id, leaderboard_id, scope, server_id, best_score, achieved_at),
  CONSTRAINT fk_game_leaderboard_entries_game FOREIGN KEY (game_id) REFERENCES user_games(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_leaderboard_entries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_leaderboard_entries_score FOREIGN KEY (best_score_entry_id) REFERENCES game_score_entries(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_leaderboard_entries_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS game_leaderboard_entries;
DROP TABLE IF EXISTS game_score_entries;
