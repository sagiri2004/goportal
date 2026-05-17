-- +goose Up
ALTER TABLE tournaments
  ADD COLUMN tournament_general_channel_id CHAR(36) NULL AFTER completed_at;

ALTER TABLE tournaments
  ADD KEY idx_tournaments_general_channel_id (tournament_general_channel_id);

ALTER TABLE tournaments
  ADD CONSTRAINT fk_tournaments_general_channel
  FOREIGN KEY (tournament_general_channel_id) REFERENCES channels(id) ON DELETE SET NULL;

-- +goose Down
ALTER TABLE tournaments DROP FOREIGN KEY fk_tournaments_general_channel;
ALTER TABLE tournaments DROP KEY idx_tournaments_general_channel_id;
ALTER TABLE tournaments DROP COLUMN tournament_general_channel_id;
