-- +goose Up
ALTER TABLE roles
  ADD COLUMN color CHAR(7) NOT NULL DEFAULT '#99AAB5' AFTER name;

-- +goose Down
ALTER TABLE roles
  DROP COLUMN color;

