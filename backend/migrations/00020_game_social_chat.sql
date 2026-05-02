-- +goose Up
CREATE TABLE IF NOT EXISTS game_sessions (
  id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  channel_id CHAR(36) NULL,
  room_id CHAR(36) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  started_at BIGINT NOT NULL DEFAULT 0,
  last_seen_at BIGINT NOT NULL DEFAULT 0,
  ended_at BIGINT NULL,
  metadata JSON NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_game_sessions_game_user (game_id, user_id),
  KEY idx_game_sessions_status (status, last_seen_at),
  KEY idx_game_sessions_room (room_id),
  CONSTRAINT fk_game_sessions_game FOREIGN KEY (game_id) REFERENCES user_games(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_sessions_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_events (
  id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  idempotency_key VARCHAR(128) NULL,
  score INT NULL,
  achievement_code VARCHAR(128) NULL,
  achievement_title VARCHAR(255) NULL,
  payload JSON NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_game_events_session (session_id, created_at),
  KEY idx_game_events_game_type (game_id, event_type),
  UNIQUE KEY uq_game_events_idempotency (session_id, idempotency_key),
  CONSTRAINT fk_game_events_game FOREIGN KEY (game_id) REFERENCES user_games(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_events_session FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_rooms (
  id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  channel_id CHAR(36) NULL,
  host_user_id CHAR(36) NOT NULL,
  room_code VARCHAR(32) NOT NULL,
  room_name VARCHAR(255) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  max_players TINYINT NOT NULL DEFAULT 8,
  current_state JSON NULL,
  state_version BIGINT NOT NULL DEFAULT 1,
  expires_at BIGINT NOT NULL DEFAULT 0,
  last_active_at BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_rooms_room_code (room_code),
  KEY idx_game_rooms_game_status (game_id, status),
  KEY idx_game_rooms_active (status, expires_at),
  CONSTRAINT fk_game_rooms_game FOREIGN KEY (game_id) REFERENCES user_games(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_rooms_host_user FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_rooms_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_room_members (
  id CHAR(36) NOT NULL,
  room_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'player',
  status VARCHAR(16) NOT NULL DEFAULT 'joined',
  joined_at BIGINT NOT NULL DEFAULT 0,
  left_at BIGINT NULL,
  last_seen_at BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_room_members_active (room_id, user_id, deleted_at),
  KEY idx_game_room_members_user (user_id, status),
  KEY idx_game_room_members_room (room_id, status),
  CONSTRAINT fk_game_room_members_room FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_room_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS game_room_members;
DROP TABLE IF EXISTS game_rooms;
DROP TABLE IF EXISTS game_events;
DROP TABLE IF EXISTS game_sessions;
