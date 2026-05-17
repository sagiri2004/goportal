-- +goose Up
CREATE TABLE IF NOT EXISTS tournament_roles (
  id CHAR(36) PRIMARY KEY,
  tournament_id CHAR(36) NOT NULL,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_tournament_role_code (tournament_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tournament_role_bindings (
  id CHAR(36) PRIMARY KEY,
  tournament_id CHAR(36) NOT NULL,
  role_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_tournament_role_binding (tournament_id, role_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tournament_match_workspaces (
  id CHAR(36) PRIMARY KEY,
  tournament_id CHAR(36) NOT NULL,
  match_id CHAR(36) NOT NULL,
  server_id CHAR(36) NOT NULL,
  category_channel_id CHAR(36) NOT NULL,
  team_a_channel_id CHAR(36) NOT NULL,
  team_b_channel_id CHAR(36) NOT NULL,
  caster_channel_id CHAR(36) NOT NULL,
  admin_channel_id CHAR(36) NOT NULL,
  spectator_channel_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_tournament_match_workspace (tournament_id, match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS tournament_match_workspaces;
DROP TABLE IF EXISTS tournament_role_bindings;
DROP TABLE IF EXISTS tournament_roles;
