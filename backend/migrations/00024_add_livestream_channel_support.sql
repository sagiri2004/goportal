-- +goose Up
INSERT INTO channel_types (code, description)
VALUES
  ('LIVESTREAM', 'Livestream channel')
ON DUPLICATE KEY UPDATE description = VALUES(description);

ALTER TABLE tournament_match_workspaces
  ADD COLUMN livestream_channel_id CHAR(36) NULL AFTER spectator_channel_id;

ALTER TABLE tournament_match_workspaces
  ADD KEY idx_tournament_workspaces_livestream_channel (livestream_channel_id);

-- +goose Down
ALTER TABLE tournament_match_workspaces DROP KEY idx_tournament_workspaces_livestream_channel;
ALTER TABLE tournament_match_workspaces DROP COLUMN livestream_channel_id;

