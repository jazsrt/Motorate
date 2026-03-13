/*
  # Complete Badge Seed Data v2

  Seeds ALL badge definitions with correct column mappings.

  Badge Structure:
  - progression_group: Groups related badges (e.g., 'content-creator')
  - badge_group: For tiered activity badges, same as progression_group
  - tier_threshold: Numeric threshold for auto-awarding
  - earning_method: 'tiered_activity' for progression badges
*/

-- Clear existing badges
DELETE FROM user_badges;
DELETE FROM badges;

-- All Eyes on Me (posts created)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('content-creator-1', 'All Eyes on Me', 'Create 5 posts',  'content-creator', 'Common',   'edit-3', 1, 'Bronze',   'content-creator', 'content-creator', 5, 'tiered_activity'),
  ('content-creator-2', 'All Eyes on Me', 'Create 10 posts', 'content-creator', 'Uncommon', 'edit-3', 2, 'Silver',   'content-creator', 'content-creator', 10, 'tiered_activity'),
  ('content-creator-3', 'All Eyes on Me', 'Create 25 posts', 'content-creator', 'Rare',     'edit-3', 3, 'Gold',     'content-creator', 'content-creator', 25, 'tiered_activity'),
  ('content-creator-4', 'All Eyes on Me', 'Create 50 posts', 'content-creator', 'Epic',     'edit-3', 4, 'Platinum', 'content-creator', 'content-creator', 50, 'tiered_activity');

-- Wordsmith (comments)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('commenter-1', 'Wordsmith', 'Leave 5 comments',   'commenter', 'Common',   'message-circle', 1, 'Bronze',   'commenter', 'commenter', 5, 'tiered_activity'),
  ('commenter-2', 'Wordsmith', 'Leave 25 comments',  'commenter', 'Uncommon', 'message-circle', 2, 'Silver',   'commenter', 'commenter', 25, 'tiered_activity'),
  ('commenter-3', 'Wordsmith', 'Leave 50 comments',  'commenter', 'Rare',     'message-circle', 3, 'Gold',     'commenter', 'commenter', 50, 'tiered_activity'),
  ('commenter-4', 'Wordsmith', 'Leave 100 comments', 'commenter', 'Epic',     'message-circle', 4, 'Platinum', 'commenter', 'commenter', 100, 'tiered_activity');

-- Likey Likey (reactions given)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('reactor-1', 'Likey Likey', 'Give 10 likes',  'reactor', 'Common',   'heart', 1, 'Bronze',   'reactor', 'reactor', 10, 'tiered_activity'),
  ('reactor-2', 'Likey Likey', 'Give 50 likes',  'reactor', 'Uncommon', 'heart', 2, 'Silver',   'reactor', 'reactor', 50, 'tiered_activity'),
  ('reactor-3', 'Likey Likey', 'Give 150 likes', 'reactor', 'Rare',     'heart', 3, 'Gold',     'reactor', 'reactor', 150, 'tiered_activity'),
  ('reactor-4', 'Likey Likey', 'Give 300 likes', 'reactor', 'Epic',     'heart', 4, 'Platinum', 'reactor', 'reactor', 300, 'tiered_activity');

-- Fan Club (likes received)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('popular-1', 'Fan Club', 'Receive 10 likes',  'popular', 'Common',    'trending-up', 1, 'Bronze',   'popular', 'popular', 10, 'tiered_activity'),
  ('popular-2', 'Fan Club', 'Receive 50 likes',  'popular', 'Uncommon',  'trending-up', 2, 'Silver',   'popular', 'popular', 50, 'tiered_activity'),
  ('popular-3', 'Fan Club', 'Receive 250 likes', 'popular', 'Rare',      'trending-up', 3, 'Gold',     'popular', 'popular', 250, 'tiered_activity'),
  ('popular-4', 'Fan Club', 'Receive 500 likes', 'popular', 'Legendary', 'trending-up', 4, 'Platinum', 'popular', 'popular', 500, 'tiered_activity');

-- Groupie (followers)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('getting-noticed-1', 'Groupie', 'Gain 5 followers',   'getting-noticed', 'Common',   'users', 1, 'Bronze',   'getting-noticed', 'getting-noticed', 5, 'tiered_activity'),
  ('getting-noticed-2', 'Groupie', 'Gain 25 followers',  'getting-noticed', 'Uncommon', 'users', 2, 'Silver',   'getting-noticed', 'getting-noticed', 25, 'tiered_activity'),
  ('getting-noticed-3', 'Groupie', 'Gain 50 followers',  'getting-noticed', 'Rare',     'users', 3, 'Gold',     'getting-noticed', 'getting-noticed', 50, 'tiered_activity'),
  ('getting-noticed-4', 'Groupie', 'Gain 100 followers', 'getting-noticed', 'Epic',     'users', 4, 'Platinum', 'getting-noticed', 'getting-noticed', 100, 'tiered_activity');

-- Photog (photos uploaded)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('photographer-1', 'Photog', 'Upload 5 photos',  'photographer', 'Common',   'camera', 1, 'Bronze',   'photographer', 'photographer', 5, 'tiered_activity'),
  ('photographer-2', 'Photog', 'Upload 25 photos', 'photographer', 'Uncommon', 'camera', 2, 'Silver',   'photographer', 'photographer', 25, 'tiered_activity'),
  ('photographer-3', 'Photog', 'Upload 40 photos', 'photographer', 'Rare',     'camera', 3, 'Gold',     'photographer', 'photographer', 40, 'tiered_activity'),
  ('photographer-4', 'Photog', 'Upload 75 photos', 'photographer', 'Epic',     'camera', 4, 'Platinum', 'photographer', 'photographer', 75, 'tiered_activity');

-- Eagle Eye (vehicles spotted)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('spotter-1', 'Eagle Eye', 'Spot 3 vehicles',  'spotter', 'Common',    'crosshair', 1, 'Bronze',   'spotter', 'spotter', 3, 'tiered_activity'),
  ('spotter-2', 'Eagle Eye', 'Spot 10 vehicles', 'spotter', 'Uncommon',  'crosshair', 2, 'Silver',   'spotter', 'spotter', 10, 'tiered_activity'),
  ('spotter-3', 'Eagle Eye', 'Spot 25 vehicles', 'spotter', 'Rare',      'crosshair', 3, 'Gold',     'spotter', 'spotter', 25, 'tiered_activity'),
  ('spotter-4', 'Eagle Eye', 'Spot 50 vehicles', 'spotter', 'Legendary', 'crosshair', 4, 'Platinum', 'spotter', 'spotter', 50, 'tiered_activity');

-- Judge (reviews written)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('reviewer-1', 'Judge', 'Write 3 reviews',  'reviewer', 'Common',   'star', 1, 'Bronze',   'reviewer', 'reviewer', 3, 'tiered_activity'),
  ('reviewer-2', 'Judge', 'Write 10 reviews', 'reviewer', 'Uncommon', 'star', 2, 'Silver',   'reviewer', 'reviewer', 10, 'tiered_activity'),
  ('reviewer-3', 'Judge', 'Write 20 reviews', 'reviewer', 'Rare',     'star', 3, 'Gold',     'reviewer', 'reviewer', 20, 'tiered_activity'),
  ('reviewer-4', 'Judge', 'Write 50 reviews', 'reviewer', 'Epic',     'star', 4, 'Platinum', 'reviewer', 'reviewer', 50, 'tiered_activity');

-- Vroom Vroom (mods listed)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('builder-1', 'Vroom Vroom', 'List 3 mods',  'builder', 'Common',   'wrench', 1, 'Bronze',   'builder', 'builder', 3, 'tiered_activity'),
  ('builder-2', 'Vroom Vroom', 'List 5 mods',  'builder', 'Uncommon', 'wrench', 2, 'Silver',   'builder', 'builder', 5, 'tiered_activity'),
  ('builder-3', 'Vroom Vroom', 'List 10 mods', 'builder', 'Rare',     'wrench', 3, 'Gold',     'builder', 'builder', 10, 'tiered_activity'),
  ('builder-4', 'Vroom Vroom', 'List 20 mods', 'builder', 'Epic',     'wrench', 4, 'Platinum', 'builder', 'builder', 20, 'tiered_activity');

-- Good Point (comment likes received)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('helpful-hand-1', 'Good Point', 'Receive 5 comment likes',   'helpful-hand', 'Common',   'thumbs-up', 1, 'Bronze',   'helpful-hand', 'helpful-hand', 5, 'tiered_activity'),
  ('helpful-hand-2', 'Good Point', 'Receive 25 comment likes',  'helpful-hand', 'Uncommon', 'thumbs-up', 2, 'Silver',   'helpful-hand', 'helpful-hand', 25, 'tiered_activity'),
  ('helpful-hand-3', 'Good Point', 'Receive 100 comment likes', 'helpful-hand', 'Rare',     'thumbs-up', 3, 'Gold',     'helpful-hand', 'helpful-hand', 100, 'tiered_activity'),
  ('helpful-hand-4', 'Good Point', 'Receive 500 comment likes', 'helpful-hand', 'Epic',     'thumbs-up', 4, 'Platinum', 'helpful-hand', 'helpful-hand', 500, 'tiered_activity');

-- Welcome badge (standalone, no progression)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('welcome', 'Welcome', 'Join MotoRated', 'community', 'Common', 'user-plus', 1, 'Novice', NULL, NULL, NULL, 'manual');

-- Verify counts
SELECT
  'Total badges' as metric,
  COUNT(*) as count
FROM badges
UNION ALL
SELECT
  'Tiered activity badges',
  COUNT(*)
FROM badges
WHERE earning_method = 'tiered_activity'
UNION ALL
SELECT
  'Progression groups',
  COUNT(DISTINCT progression_group)
FROM badges
WHERE progression_group IS NOT NULL;
