-- +goose Up
INSERT IGNORE INTO users (id, username, password, is_admin, status, created_at, updated_at, deleted_at)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'goportal_system',
  'system-owned-game-library',
  FALSE,
  'offline',
  UNIX_TIMESTAMP(),
  UNIX_TIMESTAMP(),
  0
);

INSERT INTO user_games (
  id, owner_user_id, source_type, title, slug, description, visibility, status, publish_state,
  category, tags, age_rating, featured_score, created_by, approved_by, approved_at,
  avg_rating, rating_count, launch_count, trending_score,
  thumbnail_url, icon_url, capsule_image_url, hero_image_url, screenshot_urls, trailer_url,
  created_at, updated_at, deleted_at
) VALUES
(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'system',
  'Tic Tac Toe',
  'tic-tac-toe',
  'A quick local two-player classic for testing the GoPortal web game runtime.',
  'public',
  'published',
  'published',
  'board',
  JSON_ARRAY('local-multiplayer', 'classic', 'web'),
  'everyone',
  90,
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  UNIX_TIMESTAMP(),
  4.7,
  12,
  0,
  90,
  NULL, NULL, NULL, NULL, JSON_ARRAY(), NULL,
  UNIX_TIMESTAMP(),
  UNIX_TIMESTAMP(),
  0
),
(
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000001',
  'system',
  'Snake Sprint',
  'snake-sprint',
  'A compact keyboard snake game that runs entirely in the browser.',
  'public',
  'published',
  'published',
  'arcade',
  JSON_ARRAY('single-player', 'arcade', 'web'),
  'everyone',
  80,
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  UNIX_TIMESTAMP(),
  4.5,
  8,
  0,
  80,
  NULL, NULL, NULL, NULL, JSON_ARRAY(), NULL,
  UNIX_TIMESTAMP(),
  UNIX_TIMESTAMP(),
  0
),
(
  '00000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000001',
  'system',
  'Memory Match',
  'memory-match',
  'Flip cards, find pairs, and clear the board with as few moves as possible.',
  'public',
  'published',
  'published',
  'puzzle',
  JSON_ARRAY('single-player', 'puzzle', 'web'),
  'everyone',
  70,
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  UNIX_TIMESTAMP(),
  4.4,
  6,
  0,
  70,
  NULL, NULL, NULL, NULL, JSON_ARRAY(), NULL,
  UNIX_TIMESTAMP(),
  UNIX_TIMESTAMP(),
  0
)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  visibility = VALUES(visibility),
  status = VALUES(status),
  publish_state = VALUES(publish_state),
  category = VALUES(category),
  tags = VALUES(tags),
  age_rating = VALUES(age_rating),
  featured_score = VALUES(featured_score),
  approved_by = VALUES(approved_by),
  approved_at = VALUES(approved_at),
  avg_rating = VALUES(avg_rating),
  rating_count = VALUES(rating_count),
  trending_score = VALUES(trending_score),
  updated_at = UNIX_TIMESTAMP(),
  deleted_at = 0;

INSERT INTO user_game_builds (
  id, game_id, version, storage_zip_url, play_base_path, entry_file, file_size, checksum, status,
  error_message, created_at, updated_at, deleted_at
) VALUES
(
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000101',
  '1.0.0',
  '/system-games/tic-tac-toe/source.zip',
  '/system-games/tic-tac-toe',
  'index.html',
  0,
  NULL,
  'ready',
  NULL,
  UNIX_TIMESTAMP(),
  UNIX_TIMESTAMP(),
  0
),
(
  '00000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000102',
  '1.0.0',
  '/system-games/snake-sprint/source.zip',
  '/system-games/snake-sprint',
  'index.html',
  0,
  NULL,
  'ready',
  NULL,
  UNIX_TIMESTAMP(),
  UNIX_TIMESTAMP(),
  0
),
(
  '00000000-0000-4000-8000-000000000203',
  '00000000-0000-4000-8000-000000000103',
  '1.0.0',
  '/system-games/memory-match/source.zip',
  '/system-games/memory-match',
  'index.html',
  0,
  NULL,
  'ready',
  NULL,
  UNIX_TIMESTAMP(),
  UNIX_TIMESTAMP(),
  0
)
ON DUPLICATE KEY UPDATE
  version = VALUES(version),
  storage_zip_url = VALUES(storage_zip_url),
  play_base_path = VALUES(play_base_path),
  entry_file = VALUES(entry_file),
  status = VALUES(status),
  updated_at = UNIX_TIMESTAMP(),
  deleted_at = 0;

INSERT INTO game_curations (
  id, game_id, curated_by, collection_key, priority, note, starts_at, ends_at, is_active,
  created_at, updated_at, deleted_at
) VALUES
(
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'featured',
  100,
  'Default system game',
  NULL, NULL, TRUE,
  UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), 0
),
(
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000001',
  'featured',
  90,
  'Default system game',
  NULL, NULL, TRUE,
  UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), 0
),
(
  '00000000-0000-4000-8000-000000000303',
  '00000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000001',
  'featured',
  80,
  'Default system game',
  NULL, NULL, TRUE,
  UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), 0
)
ON DUPLICATE KEY UPDATE
  priority = VALUES(priority),
  note = VALUES(note),
  is_active = VALUES(is_active),
  updated_at = UNIX_TIMESTAMP(),
  deleted_at = 0;

-- +goose Down
DELETE FROM game_curations
WHERE id IN (
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000303'
);

DELETE FROM user_game_builds
WHERE id IN (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000203'
);

DELETE FROM user_games
WHERE id IN (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103'
);
