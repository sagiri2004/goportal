-- +goose Up
ALTER TABLE user_games
  ADD COLUMN icon_url TEXT NULL AFTER thumbnail_url,
  ADD COLUMN capsule_image_url TEXT NULL AFTER icon_url,
  ADD COLUMN hero_image_url TEXT NULL AFTER capsule_image_url,
  ADD COLUMN screenshot_urls JSON NULL AFTER hero_image_url,
  ADD COLUMN trailer_url TEXT NULL AFTER screenshot_urls;

-- +goose Down
ALTER TABLE user_games
  DROP COLUMN trailer_url,
  DROP COLUMN screenshot_urls,
  DROP COLUMN hero_image_url,
  DROP COLUMN capsule_image_url,
  DROP COLUMN icon_url;
