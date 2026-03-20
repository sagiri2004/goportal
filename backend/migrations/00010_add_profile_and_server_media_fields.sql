-- +goose Up
ALTER TABLE users
  ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'offline' AFTER is_admin,
  ADD COLUMN avatar_url TEXT NULL AFTER status;

ALTER TABLE servers
  ADD COLUMN icon_url TEXT NULL AFTER default_role_id,
  ADD COLUMN banner_url TEXT NULL AFTER icon_url;

-- +goose Down
ALTER TABLE servers
  DROP COLUMN banner_url,
  DROP COLUMN icon_url;

ALTER TABLE users
  DROP COLUMN avatar_url,
  DROP COLUMN status;
