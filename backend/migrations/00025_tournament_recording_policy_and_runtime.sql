-- +goose Up
ALTER TABLE tournaments
  ADD COLUMN recording_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER tournament_general_channel_id,
  ADD COLUMN record_team_a TINYINT(1) NOT NULL DEFAULT 1 AFTER recording_enabled,
  ADD COLUMN record_team_b TINYINT(1) NOT NULL DEFAULT 1 AFTER record_team_a,
  ADD COLUMN record_referee TINYINT(1) NOT NULL DEFAULT 0 AFTER record_team_b,
  ADD COLUMN record_livestream TINYINT(1) NOT NULL DEFAULT 0 AFTER record_referee,
  ADD COLUMN auto_start_recording_on_match_start TINYINT(1) NOT NULL DEFAULT 1 AFTER record_livestream;

CREATE TABLE IF NOT EXISTS tournament_match_recordings (
  id CHAR(36) NOT NULL,
  tournament_id CHAR(36) NOT NULL,
  match_id CHAR(36) NOT NULL,
  channel_id CHAR(36) NOT NULL,
  source_role VARCHAR(32) NOT NULL,
  recording_id CHAR(36) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  started_by CHAR(36) NOT NULL,
  started_at BIGINT NOT NULL DEFAULT 0,
  stopped_at BIGINT NULL,
  error TEXT NULL,
  retry_count INT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_tournament_match_recordings_tournament_id (tournament_id),
  KEY idx_tournament_match_recordings_match_id (match_id),
  KEY idx_tournament_match_recordings_channel_id (channel_id),
  KEY idx_tournament_match_recordings_recording_id (recording_id),
  KEY idx_tournament_match_recordings_status (status),
  UNIQUE KEY uq_tournament_match_recordings_match_channel_recording (match_id, channel_id, recording_id),
  CONSTRAINT fk_tournament_match_recordings_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT fk_tournament_match_recordings_match FOREIGN KEY (match_id) REFERENCES tournament_matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_tournament_match_recordings_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
  CONSTRAINT fk_tournament_match_recordings_recording FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS tournament_match_recordings;

ALTER TABLE tournaments
  DROP COLUMN auto_start_recording_on_match_start,
  DROP COLUMN record_livestream,
  DROP COLUMN record_referee,
  DROP COLUMN record_team_b,
  DROP COLUMN record_team_a,
  DROP COLUMN recording_enabled;
