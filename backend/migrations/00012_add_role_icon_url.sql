-- +goose Up
ALTER TABLE roles
  ADD COLUMN icon_url TEXT NULL AFTER name;

-- +goose Down
ALTER TABLE roles
  DROP COLUMN icon_url;
