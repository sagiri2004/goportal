-- +goose Up
ALTER TABLE tournament_match_workspaces
  ADD COLUMN referee_channel_id CHAR(36) NULL AFTER admin_channel_id;

UPDATE tournament_match_workspaces
SET referee_channel_id = admin_channel_id
WHERE referee_channel_id IS NULL OR referee_channel_id = '';

ALTER TABLE tournament_match_workspaces
  MODIFY COLUMN referee_channel_id CHAR(36) NOT NULL;

ALTER TABLE tournament_match_workspaces
  ADD KEY idx_tournament_workspaces_referee_channel (referee_channel_id);

-- +goose Down
ALTER TABLE tournament_match_workspaces DROP KEY idx_tournament_workspaces_referee_channel;
ALTER TABLE tournament_match_workspaces DROP COLUMN referee_channel_id;
