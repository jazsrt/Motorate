/*
  # Seed Badges Data

  Inserts initial badge definitions into the badges table.

  Categories:
  - content-creator: Posts created (All Eyes on Me)
  - commenter: Comments made (Wordsmith)
  - reactor: Reactions given (Likey Likey)
  - popular: Likes/reactions received (Fan Club)
  - getting-noticed: Followers gained (Groupie)
  - photographer: Photos uploaded (Photog)
  - spotter: Vehicles spotted (Eagle Eye)
  - reviewer: Reviews written (Judge)
  - builder: Mods listed (Vroom Vroom)
  - helpful-hand: Comment likes received (Good Point)
*/

-- All Eyes on Me badges (posts)
INSERT INTO badges (id, name, description, category, rarity, icon_name, level, level_name, progression_group)
VALUES
  ('content-creator-1', 'All Eyes on Me', 'Create 5 posts',  'content-creator', 'Common',   'edit-3', 1, 'Bronze',   'content-creator'),
  ('content-creator-2', 'All Eyes on Me', 'Create 10 posts', 'content-creator', 'Uncommon', 'edit-3', 2, 'Silver',   'content-creator'),
  ('content-creator-3', 'All Eyes on Me', 'Create 25 posts', 'content-creator', 'Rare',     'edit-3', 3, 'Gold',     'content-creator'),
  ('content-creator-4', 'All Eyes on Me', 'Create 50 posts', 'content-creator', 'Epic',     'edit-3', 4, 'Platinum', 'content-creator')
ON CONFLICT (id) DO NOTHING;

-- Wordsmith badges (comments)
INSERT INTO badges (id, name, description, category, rarity, icon_name, level, level_name, progression_group)
VALUES
  ('commenter-1', 'Wordsmith', 'Leave 5 comments',   'commenter', 'Common',   'message-circle', 1, 'Bronze',   'commenter'),
  ('commenter-2', 'Wordsmith', 'Leave 25 comments',  'commenter', 'Uncommon', 'message-circle', 2, 'Silver',   'commenter'),
  ('commenter-3', 'Wordsmith', 'Leave 50 comments',  'commenter', 'Rare',     'message-circle', 3, 'Gold',     'commenter'),
  ('commenter-4', 'Wordsmith', 'Leave 100 comments', 'commenter', 'Epic',     'message-circle', 4, 'Platinum', 'commenter')
ON CONFLICT (id) DO NOTHING;

-- Likey Likey badges (likes given)
INSERT INTO badges (id, name, description, category, rarity, icon_name, level, level_name, progression_group)
VALUES
  ('reactor-1', 'Likey Likey', 'Give 10 likes',  'reactor', 'Common',   'heart', 1, 'Bronze',   'reactor'),
  ('reactor-2', 'Likey Likey', 'Give 50 likes',  'reactor', 'Uncommon', 'heart', 2, 'Silver',   'reactor'),
  ('reactor-3', 'Likey Likey', 'Give 150 likes', 'reactor', 'Rare',     'heart', 3, 'Gold',     'reactor'),
  ('reactor-4', 'Likey Likey', 'Give 300 likes', 'reactor', 'Epic',     'heart', 4, 'Platinum', 'reactor')
ON CONFLICT (id) DO NOTHING;

-- Fan Club badges (likes received)
INSERT INTO badges (id, name, description, category, rarity, icon_name, level, level_name, progression_group)
VALUES
  ('popular-1', 'Fan Club', 'Receive 10 likes',  'popular', 'Common',    'trending-up', 1, 'Bronze',   'popular'),
  ('popular-2', 'Fan Club', 'Receive 50 likes',  'popular', 'Uncommon',  'trending-up', 2, 'Silver',   'popular'),
  ('popular-3', 'Fan Club', 'Receive 250 likes', 'popular', 'Rare',      'trending-up', 3, 'Gold',     'popular'),
  ('popular-4', 'Fan Club', 'Receive 500 likes', 'popular', 'Legendary', 'trending-up', 4, 'Platinum', 'popular')
ON CONFLICT (id) DO NOTHING;

-- Groupie badges (followers gained)
INSERT INTO badges (id, name, description, category, rarity, icon_name, level, level_name, progression_group)
VALUES
  ('getting-noticed-1', 'Groupie', 'Gain 5 followers',   'getting-noticed', 'Common',   'users', 1, 'Bronze',   'getting-noticed'),
  ('getting-noticed-2', 'Groupie', 'Gain 25 followers',  'getting-noticed', 'Uncommon', 'users', 2, 'Silver',   'getting-noticed'),
  ('getting-noticed-3', 'Groupie', 'Gain 50 followers',  'getting-noticed', 'Rare',     'users', 3, 'Gold',     'getting-noticed'),
  ('getting-noticed-4', 'Groupie', 'Gain 100 followers', 'getting-noticed', 'Epic',     'users', 4, 'Platinum', 'getting-noticed')
ON CONFLICT (id) DO NOTHING;

-- Photog badges (photos uploaded)
INSERT INTO badges (id, name, description, category, rarity, icon_name, level, level_name, progression_group)
VALUES
  ('photographer-1', 'Photog', 'Upload 5 photos',  'photographer', 'Common',   'camera', 1, 'Bronze',   'photographer'),
  ('photographer-2', 'Photog', 'Upload 25 photos', 'photographer', 'Uncommon', 'camera', 2, 'Silver',   'photographer'),
  ('photographer-3', 'Photog', 'Upload 40 photos', 'photographer', 'Rare',     'camera', 3, 'Gold',     'photographer'),
  ('photographer-4', 'Photog', 'Upload 75 photos', 'photographer', 'Epic',     'camera', 4, 'Platinum', 'photographer')
ON CONFLICT (id) DO NOTHING;

-- Eagle Eye badges (vehicles spotted)
INSERT INTO badges (id, name, description, category, rarity, icon_name, level, level_name, progression_group)
VALUES
  ('spotter-1', 'Eagle Eye', 'Spot 3 vehicles',  'spotter', 'Common',    'crosshair', 1, 'Bronze',   'spotter'),
  ('spotter-2', 'Eagle Eye', 'Spot 10 vehicles', 'spotter', 'Uncommon',  'crosshair', 2, 'Silver',   'spotter'),
  ('spotter-3', 'Eagle Eye', 'Spot 25 vehicles', 'spotter', 'Rare',      'crosshair', 3, 'Gold',     'spotter'),
  ('spotter-4', 'Eagle Eye', 'Spot 50 vehicles', 'spotter', 'Legendary', 'crosshair', 4, 'Platinum', 'spotter')
ON CONFLICT (id) DO NOTHING;

-- Judge badges (reviews written)
INSERT INTO badges (id, name, description, category, rarity, icon_name, level, level_name, progression_group)
VALUES
  ('reviewer-1', 'Judge', 'Write 3 reviews',  'reviewer', 'Common',   'star', 1, 'Bronze',   'reviewer'),
  ('reviewer-2', 'Judge', 'Write 10 reviews', 'reviewer', 'Uncommon', 'star', 2, 'Silver',   'reviewer'),
  ('reviewer-3', 'Judge', 'Write 20 reviews', 'reviewer', 'Rare',     'star', 3, 'Gold',     'reviewer'),
  ('reviewer-4', 'Judge', 'Write 50 reviews', 'reviewer', 'Epic',     'star', 4, 'Platinum', 'reviewer')
ON CONFLICT (id) DO NOTHING;

-- Special standalone + remaining tiered badges
INSERT INTO badges (id, name, description, category, rarity, icon_name, level, level_name, progression_group)
VALUES
  ('welcome', 'Welcome', 'Join MotoRated', 'community', 'Common', 'user-plus', 1, 'Novice', NULL),
  ('builder-1', 'Vroom Vroom', 'List 3 mods',  'builder', 'Common',   'wrench', 1, 'Bronze',   'builder'),
  ('builder-2', 'Vroom Vroom', 'List 5 mods',  'builder', 'Uncommon', 'wrench', 2, 'Silver',   'builder'),
  ('builder-3', 'Vroom Vroom', 'List 10 mods', 'builder', 'Rare',     'wrench', 3, 'Gold',     'builder'),
  ('builder-4', 'Vroom Vroom', 'List 20 mods', 'builder', 'Epic',     'wrench', 4, 'Platinum', 'builder'),
  ('helpful-hand-1', 'Good Point', 'Receive 5 comment likes',   'helpful-hand', 'Common',   'thumbs-up', 1, 'Bronze',   'helpful-hand'),
  ('helpful-hand-2', 'Good Point', 'Receive 25 comment likes',  'helpful-hand', 'Uncommon', 'thumbs-up', 2, 'Silver',   'helpful-hand'),
  ('helpful-hand-3', 'Good Point', 'Receive 100 comment likes', 'helpful-hand', 'Rare',     'thumbs-up', 3, 'Gold',     'helpful-hand'),
  ('helpful-hand-4', 'Good Point', 'Receive 500 comment likes', 'helpful-hand', 'Epic',     'thumbs-up', 4, 'Platinum', 'helpful-hand')
ON CONFLICT (id) DO NOTHING;
