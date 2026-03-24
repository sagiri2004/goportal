-- +goose Up
CREATE TABLE IF NOT EXISTS tournaments (
  id CHAR(36) NOT NULL,
  server_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  game VARCHAR(255) NOT NULL,
  format VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  max_participants INT NOT NULL,
  participant_type VARCHAR(16) NOT NULL,
  team_size INT NULL,
  registration_deadline BIGINT NULL,
  check_in_duration_minutes INT NOT NULL DEFAULT 15,
  prize_pool TEXT NULL,
  rules TEXT NULL,
  created_by CHAR(36) NOT NULL,
  started_at BIGINT NULL,
  completed_at BIGINT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_tournaments_server_id (server_id),
  KEY idx_tournaments_status (status),
  KEY idx_tournaments_created_by (created_by),
  CONSTRAINT fk_tournaments_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
  CONSTRAINT fk_tournaments_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tournament_teams (
  id CHAR(36) NOT NULL,
  tournament_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  captain_id CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tournament_teams_name (tournament_id, name),
  KEY idx_tournament_teams_tournament_id (tournament_id),
  KEY idx_tournament_teams_captain_id (captain_id),
  CONSTRAINT fk_tournament_teams_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT fk_tournament_teams_captain FOREIGN KEY (captain_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tournament_participants (
  id CHAR(36) NOT NULL,
  tournament_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  team_id CHAR(36) NULL,
  seed INT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'registered',
  final_rank INT NULL,
  registered_at BIGINT NOT NULL DEFAULT 0,
  checked_in_at BIGINT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tournament_participants_user (tournament_id, user_id),
  UNIQUE KEY uq_tournament_participants_team (tournament_id, team_id),
  KEY idx_tournament_participants_tournament_id (tournament_id),
  KEY idx_tournament_participants_status (status),
  CONSTRAINT fk_tournament_participants_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT fk_tournament_participants_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_tournament_participants_team FOREIGN KEY (team_id) REFERENCES tournament_teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tournament_team_members (
  team_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  joined_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (team_id, user_id),
  KEY idx_tournament_team_members_user_id (user_id),
  CONSTRAINT fk_tournament_team_members_team FOREIGN KEY (team_id) REFERENCES tournament_teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_tournament_team_members_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tournament_matches (
  id CHAR(36) NOT NULL,
  tournament_id CHAR(36) NOT NULL,
  round INT NOT NULL,
  match_number INT NOT NULL,
  bracket_side VARCHAR(16) NOT NULL DEFAULT 'winners',
  participant1_id CHAR(36) NULL,
  participant2_id CHAR(36) NULL,
  score1 INT NULL,
  score2 INT NULL,
  winner_id CHAR(36) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  next_match_id CHAR(36) NULL,
  loser_next_match_id CHAR(36) NULL,
  scheduled_at BIGINT NULL,
  completed_at BIGINT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_tournament_matches_tournament_id (tournament_id),
  KEY idx_tournament_matches_round (round),
  KEY idx_tournament_matches_status (status),
  KEY idx_tournament_matches_bracket_side (bracket_side),
  KEY idx_tournament_matches_next_match_id (next_match_id),
  KEY idx_tournament_matches_loser_next_match_id (loser_next_match_id),
  CONSTRAINT fk_tournament_matches_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT fk_tournament_matches_participant1 FOREIGN KEY (participant1_id) REFERENCES tournament_participants(id) ON DELETE SET NULL,
  CONSTRAINT fk_tournament_matches_participant2 FOREIGN KEY (participant2_id) REFERENCES tournament_participants(id) ON DELETE SET NULL,
  CONSTRAINT fk_tournament_matches_winner FOREIGN KEY (winner_id) REFERENCES tournament_participants(id) ON DELETE SET NULL,
  CONSTRAINT fk_tournament_matches_next_match FOREIGN KEY (next_match_id) REFERENCES tournament_matches(id) ON DELETE SET NULL,
  CONSTRAINT fk_tournament_matches_loser_next_match FOREIGN KEY (loser_next_match_id) REFERENCES tournament_matches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tournament_match_reports (
  id CHAR(36) NOT NULL,
  match_id CHAR(36) NOT NULL,
  reported_by CHAR(36) NOT NULL,
  winner_id CHAR(36) NULL,
  score1 INT NOT NULL,
  score2 INT NOT NULL,
  screenshot_url TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_tournament_match_reports_match_id (match_id),
  KEY idx_tournament_match_reports_status (status),
  CONSTRAINT fk_tournament_match_reports_match FOREIGN KEY (match_id) REFERENCES tournament_matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_tournament_match_reports_reported_by FOREIGN KEY (reported_by) REFERENCES users(id),
  CONSTRAINT fk_tournament_match_reports_winner FOREIGN KEY (winner_id) REFERENCES tournament_participants(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS tournament_match_reports;
DROP TABLE IF EXISTS tournament_matches;
DROP TABLE IF EXISTS tournament_team_members;
DROP TABLE IF EXISTS tournament_participants;
DROP TABLE IF EXISTS tournament_teams;
DROP TABLE IF EXISTS tournaments;
