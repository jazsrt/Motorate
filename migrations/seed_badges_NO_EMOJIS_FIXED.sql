/*
  # Complete Badge Seed Data - NO EMOJIS, NO RARITY

  Seeds all badge definitions with correct column structure.

  CRITICAL NOTES:
  - NO emojis in any backend code
  - NO rarity column (removed)
  - earning_method must match CHECK constraint (likely 'tiered_activity' or NULL)
  - All columns must match actual table structure
*/

-- Clear existing badges
DELETE FROM user_badges WHERE badge_id IN (SELECT id FROM badges);
DELETE FROM badges;

-- All Eyes on Me (posts created)
INSERT INTO badges (
  id, name, description, category, icon,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('content-creator-1', 'All Eyes on Me', 'Create 5 posts',  'content-creator', 'edit-3', 1, 'Bronze',   'content-creator', 'content_creator', 5, 'tiered_activity'),
  ('content-creator-2', 'All Eyes on Me', 'Create 10 posts', 'content-creator', 'edit-3', 2, 'Silver',   'content-creator', 'content_creator', 10, 'tiered_activity'),
  ('content-creator-3', 'All Eyes on Me', 'Create 25 posts', 'content-creator', 'edit-3', 3, 'Gold',     'content-creator', 'content_creator', 25, 'tiered_activity'),
  ('content-creator-4', 'All Eyes on Me', 'Create 50 posts', 'content-creator', 'edit-3', 4, 'Platinum', 'content-creator', 'content_creator', 50, 'tiered_activity');

-- Wordsmith (comments)
INSERT INTO badges (
  id, name, description, category, icon,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('commenter-1', 'Wordsmith', 'Leave 5 comments',   'commenter', 'message-circle', 1, 'Bronze',   'commenter', 'commenter', 5, 'tiered_activity'),
  ('commenter-2', 'Wordsmith', 'Leave 25 comments',  'commenter', 'message-circle', 2, 'Silver',   'commenter', 'commenter', 25, 'tiered_activity'),
  ('commenter-3', 'Wordsmith', 'Leave 50 comments',  'commenter', 'message-circle', 3, 'Gold',     'commenter', 'commenter', 50, 'tiered_activity'),
  ('commenter-4', 'Wordsmith', 'Leave 100 comments', 'commenter', 'message-circle', 4, 'Platinum', 'commenter', 'commenter', 100, 'tiered_activity');

-- Likey Likey (reactions given)
INSERT INTO badges (
  id, name, description, category, icon,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('reactor-1', 'Likey Likey', 'Give 10 likes',  'reactor', 'heart', 1, 'Bronze',   'reactor', 'reactor', 10, 'tiered_activity'),
  ('reactor-2', 'Likey Likey', 'Give 50 likes',  'reactor', 'heart', 2, 'Silver',   'reactor', 'reactor', 50, 'tiered_activity'),
  ('reactor-3', 'Likey Likey', 'Give 150 likes', 'reactor', 'heart', 3, 'Gold',     'reactor', 'reactor', 150, 'tiered_activity'),
  ('reactor-4', 'Likey Likey', 'Give 300 likes', 'reactor', 'heart', 4, 'Platinum', 'reactor', 'reactor', 300, 'tiered_activity');

-- Fan Club (likes received)
INSERT INTO badges (
  id, name, description, category, icon,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('popular-1', 'Fan Club', 'Receive 10 likes',  'popular', 'trending-up', 1, 'Bronze',   'popular', 'popular', 10, 'tiered_activity'),
  ('popular-2', 'Fan Club', 'Receive 50 likes',  'popular', 'trending-up', 2, 'Silver',   'popular', 'popular', 50, 'tiered_activity'),
  ('popular-3', 'Fan Club', 'Receive 250 likes', 'popular', 'trending-up', 3, 'Gold',     'popular', 'popular', 250, 'tiered_activity'),
  ('popular-4', 'Fan Club', 'Receive 500 likes', 'popular', 'trending-up', 4, 'Platinum', 'popular', 'popular', 500, 'tiered_activity');

-- Groupie (followers)
INSERT INTO badges (
  id, name, description, category, icon,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('getting-noticed-1', 'Groupie', 'Gain 5 followers',   'getting-noticed', 'users', 1, 'Bronze',   'getting-noticed', 'getting-noticed', 5, 'tiered_activity'),
  ('getting-noticed-2', 'Groupie', 'Gain 25 followers',  'getting-noticed', 'users', 2, 'Silver',   'getting-noticed', 'getting-noticed', 25, 'tiered_activity'),
  ('getting-noticed-3', 'Groupie', 'Gain 50 followers',  'getting-noticed', 'users', 3, 'Gold',     'getting-noticed', 'getting-noticed', 50, 'tiered_activity'),
  ('getting-noticed-4', 'Groupie', 'Gain 100 followers', 'getting-noticed', 'users', 4, 'Platinum', 'getting-noticed', 'getting-noticed', 100, 'tiered_activity');

-- Photog (photos uploaded)
INSERT INTO badges (
  id, name, description, category, icon,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('photographer-1', 'Photog', 'Upload 5 photos',  'photographer', 'camera', 1, 'Bronze',   'photographer', 'photographer', 5, 'tiered_activity'),
  ('photographer-2', 'Photog', 'Upload 25 photos', 'photographer', 'camera', 2, 'Silver',   'photographer', 'photographer', 25, 'tiered_activity'),
  ('photographer-3', 'Photog', 'Upload 40 photos', 'photographer', 'camera', 3, 'Gold',     'photographer', 'photographer', 40, 'tiered_activity'),
  ('photographer-4', 'Photog', 'Upload 75 photos', 'photographer', 'camera', 4, 'Platinum', 'photographer', 'photographer', 75, 'tiered_activity');

-- Eagle Eye (vehicles spotted)
INSERT INTO badges (
  id, name, description, category, icon,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('spotter-1', 'Eagle Eye', 'Spot 3 vehicles',  'spotter', 'crosshair', 1, 'Bronze',   'spotter', 'spotter', 3, 'tiered_activity'),
  ('spotter-2', 'Eagle Eye', 'Spot 10 vehicles', 'spotter', 'crosshair', 2, 'Silver',   'spotter', 'spotter', 10, 'tiered_activity'),
  ('spotter-3', 'Eagle Eye', 'Spot 25 vehicles', 'spotter', 'crosshair', 3, 'Gold',     'spotter', 'spotter', 25, 'tiered_activity'),
  ('spotter-4', 'Eagle Eye', 'Spot 50 vehicles', 'spotter', 'crosshair', 4, 'Platinum', 'spotter', 'spotter', 50, 'tiered_activity');

-- Judge (reviews written)
INSERT INTO badges (
  id, name, description, category, icon,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('reviewer-1', 'Judge', 'Write 3 reviews',  'reviewer', 'star', 1, 'Bronze',   'reviewer', 'reviewer', 3, 'tiered_activity'),
  ('reviewer-2', 'Judge', 'Write 10 reviews', 'reviewer', 'star', 2, 'Silver',   'reviewer', 'reviewer', 10, 'tiered_activity'),
  ('reviewer-3', 'Judge', 'Write 20 reviews', 'reviewer', 'star', 3, 'Gold',     'reviewer', 'reviewer', 20, 'tiered_activity'),
  ('reviewer-4', 'Judge', 'Write 50 reviews', 'reviewer', 'star', 4, 'Platinum', 'reviewer', 'reviewer', 50, 'tiered_activity');

-- Vroom Vroom (mods listed)
INSERT INTO badges (
  id, name, description, category, icon,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('builder-1', 'Vroom Vroom', 'List 3 mods',  'builder', 'wrench', 1, 'Bronze',   'builder', 'builder', 3, 'tiered_activity'),
  ('builder-2', 'Vroom Vroom', 'List 5 mods',  'builder', 'wrench', 2, 'Silver',   'builder', 'builder', 5, 'tiered_activity'),
  ('builder-3', 'Vroom Vroom', 'List 10 mods', 'builder', 'wrench', 3, 'Gold',     'builder', 'builder', 10, 'tiered_activity'),
  ('builder-4', 'Vroom Vroom', 'List 20 mods', 'builder', 'wrench', 4, 'Platinum', 'builder', 'builder', 20, 'tiered_activity');

-- Good Point (comment likes received)
INSERT INTO badges (
  id, name, description, category, icon,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('helpful-hand-1', 'Good Point', 'Receive 5 comment likes',   'helpful-hand', 'thumbs-up', 1, 'Bronze',   'helpful-hand', 'helpful-hand', 5, 'tiered_activity'),
  ('helpful-hand-2', 'Good Point', 'Receive 25 comment likes',  'helpful-hand', 'thumbs-up', 2, 'Silver',   'helpful-hand', 'helpful-hand', 25, 'tiered_activity'),
  ('helpful-hand-3', 'Good Point', 'Receive 100 comment likes', 'helpful-hand', 'thumbs-up', 3, 'Gold',     'helpful-hand', 'helpful-hand', 100, 'tiered_activity'),
  ('helpful-hand-4', 'Good Point', 'Receive 500 comment likes', 'helpful-hand', 'thumbs-up', 4, 'Platinum', 'helpful-hand', 'helpful-hand', 500, 'tiered_activity');

-- Welcome badge (standalone, NO earning_method to avoid constraint)
INSERT INTO badges (
  id, name, description, category, icon,
  level, level_name
)
VALUES
  ('welcome', 'Welcome', 'Join MotoRated', 'community', 'user-plus', 1, 'Novice');

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
