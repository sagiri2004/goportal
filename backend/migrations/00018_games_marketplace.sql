-- +goose Up
ALTER TABLE user_games
  ADD COLUMN source_type VARCHAR(16) NOT NULL DEFAULT 'community' AFTER owner_user_id,
  ADD COLUMN publish_state VARCHAR(24) NOT NULL DEFAULT 'draft' AFTER status,
  ADD COLUMN category VARCHAR(64) NULL AFTER publish_state,
  ADD COLUMN tags JSON NULL AFTER category,
  ADD COLUMN age_rating VARCHAR(24) NULL AFTER tags,
  ADD COLUMN featured_score DOUBLE NOT NULL DEFAULT 0 AFTER age_rating,
  ADD COLUMN created_by CHAR(36) NOT NULL DEFAULT '' AFTER featured_score,
  ADD COLUMN approved_by CHAR(36) NULL AFTER created_by,
  ADD COLUMN approved_at BIGINT NULL AFTER approved_by,
  ADD COLUMN avg_rating DOUBLE NOT NULL DEFAULT 0 AFTER approved_at,
  ADD COLUMN rating_count BIGINT NOT NULL DEFAULT 0 AFTER avg_rating,
  ADD COLUMN launch_count BIGINT NOT NULL DEFAULT 0 AFTER rating_count,
  ADD COLUMN trending_score DOUBLE NOT NULL DEFAULT 0 AFTER launch_count;

UPDATE user_games
SET source_type = 'community',
    publish_state = CASE
      WHEN status = 'published' THEN 'published'
      WHEN status = 'disabled' THEN 'suspended'
      ELSE 'draft'
    END,
    created_by = owner_user_id
WHERE created_by = '';

ALTER TABLE user_games
  ADD KEY idx_user_games_source_publish (source_type, publish_state),
  ADD KEY idx_user_games_trending (trending_score, updated_at),
  ADD KEY idx_user_games_rating (avg_rating, rating_count),
  ADD FULLTEXT KEY ft_user_games_search (title, description);

CREATE TABLE IF NOT EXISTS game_ratings (
  id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  score TINYINT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_ratings_game_user (game_id, user_id),
  KEY idx_game_ratings_game (game_id),
  KEY idx_game_ratings_user (user_id),
  CONSTRAINT fk_game_ratings_game FOREIGN KEY (game_id) REFERENCES user_games(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_ratings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_reviews (
  id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(255) NULL,
  content TEXT NOT NULL,
  rating_score TINYINT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'visible',
  moderated_by CHAR(36) NULL,
  moderated_at BIGINT NULL,
  moderation_note TEXT NULL,
  helpful_count BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_game_reviews_game_status (game_id, status),
  KEY idx_game_reviews_user (user_id),
  CONSTRAINT fk_game_reviews_game FOREIGN KEY (game_id) REFERENCES user_games(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_review_votes (
  id CHAR(36) NOT NULL,
  review_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  vote_type VARCHAR(16) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_review_votes (review_id, user_id),
  KEY idx_game_review_votes_user (user_id),
  CONSTRAINT fk_game_review_votes_review FOREIGN KEY (review_id) REFERENCES game_reviews(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_review_votes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_reports (
  id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  reporter_user_id CHAR(36) NOT NULL,
  reason VARCHAR(64) NOT NULL,
  detail TEXT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  resolved_by CHAR(36) NULL,
  resolved_at BIGINT NULL,
  resolution_note TEXT NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_game_reports_game_status (game_id, status),
  KEY idx_game_reports_reporter (reporter_user_id),
  CONSTRAINT fk_game_reports_game FOREIGN KEY (game_id) REFERENCES user_games(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_reports_reporter FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_metrics_daily (
  id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  metric_date DATE NOT NULL,
  view_count BIGINT NOT NULL DEFAULT 0,
  launch_count BIGINT NOT NULL DEFAULT 0,
  install_count BIGINT NOT NULL DEFAULT 0,
  bookmark_count BIGINT NOT NULL DEFAULT 0,
  unique_user_count BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_metrics_daily_game_date (game_id, metric_date),
  KEY idx_game_metrics_daily_date (metric_date),
  CONSTRAINT fk_game_metrics_daily_game FOREIGN KEY (game_id) REFERENCES user_games(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_curations (
  id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  curated_by CHAR(36) NOT NULL,
  collection_key VARCHAR(64) NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  note TEXT NULL,
  starts_at BIGINT NULL,
  ends_at BIGINT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_game_curations_collection (collection_key, priority),
  KEY idx_game_curations_game (game_id),
  CONSTRAINT fk_game_curations_game FOREIGN KEY (game_id) REFERENCES user_games(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_curations_user FOREIGN KEY (curated_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_audit_logs (
  id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  actor_user_id CHAR(36) NOT NULL,
  action VARCHAR(64) NOT NULL,
  payload JSON NULL,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  deleted_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_game_audit_logs_game (game_id, created_at),
  KEY idx_game_audit_logs_actor (actor_user_id),
  CONSTRAINT fk_game_audit_logs_game FOREIGN KEY (game_id) REFERENCES user_games(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS game_audit_logs;
DROP TABLE IF EXISTS game_curations;
DROP TABLE IF EXISTS game_metrics_daily;
DROP TABLE IF EXISTS game_reports;
DROP TABLE IF EXISTS game_review_votes;
DROP TABLE IF EXISTS game_reviews;
DROP TABLE IF EXISTS game_ratings;

ALTER TABLE user_games
  DROP KEY idx_user_games_source_publish,
  DROP KEY idx_user_games_trending,
  DROP KEY idx_user_games_rating,
  DROP KEY ft_user_games_search,
  DROP COLUMN source_type,
  DROP COLUMN publish_state,
  DROP COLUMN category,
  DROP COLUMN tags,
  DROP COLUMN age_rating,
  DROP COLUMN featured_score,
  DROP COLUMN created_by,
  DROP COLUMN approved_by,
  DROP COLUMN approved_at,
  DROP COLUMN avg_rating,
  DROP COLUMN rating_count,
  DROP COLUMN launch_count,
  DROP COLUMN trending_score;
