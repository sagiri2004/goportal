-- +goose Up
ALTER TABLE tournament_match_workspaces
  ADD COLUMN archived_at BIGINT NULL AFTER created_at,
  ADD COLUMN closed_by CHAR(36) NULL AFTER archived_at;

-- +goose Down
ALTER TABLE tournament_match_workspaces
  DROP COLUMN closed_by,
  DROP COLUMN archived_at;
