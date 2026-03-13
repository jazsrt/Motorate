/*
  # Fix Badges System - Complete Fix

  ## Problem
  - Foreign key constraint violation: user_badges.badge_id references badges.id
  - Missing badges in badges table that code tries to award
  - Inconsistent badge table schema

  ## Solution
  1. Ensure badges table has correct schema with all necessary columns
  2. Seed ALL badges including onboarding badges
  3. Verify foreign key constraints work

  ## Safety
  - Uses IF NOT EXISTS and ON CONFLICT to be idempotent
  - Preserves existing user_badges records
*/

-- ============================================
-- STEP 1: Ensure badges table has all columns
-- ============================================

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add icon_path column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badges' AND column_name = 'icon_path'
  ) THEN
    ALTER TABLE badges ADD COLUMN icon_path TEXT;
  END IF;

  -- Add badge_group column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badges' AND column_name = 'badge_group'
  ) THEN
    ALTER TABLE badges ADD COLUMN badge_group TEXT;
  END IF;

  -- Add tier_threshold column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badges' AND column_name = 'tier_threshold'
  ) THEN
    ALTER TABLE badges ADD COLUMN tier_threshold INTEGER;
  END IF;

  -- Add earning_method column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badges' AND column_name = 'earning_method'
  ) THEN
    ALTER TABLE badges ADD COLUMN earning_method TEXT;
  END IF;
END $$;

-- ============================================
-- STEP 2: Seed Onboarding Badges
-- ============================================

INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, icon_path
) VALUES
  (
    'welcome',
    'Welcome',
    'Welcome to MotoRated!',
    'onboarding',
    'Common',
    'flag',
    1,
    'Novice',
    NULL,
    '/badges/welcome.svg'
  ),
  (
    'first-post',
    'First Post',
    'Created your first post',
    'onboarding',
    'Common',
    'edit-3',
    1,
    'Novice',
    NULL,
    '/badges/first-post.svg'
  ),
  (
    'profile-complete',
    'Profile Complete',
    'Completed your profile with bio and avatar',
    'onboarding',
    'Common',
    'user-check',
    1,
    'Novice',
    NULL,
    '/badges/profile-complete.svg'
  ),
  (
    'my-first-ride',
    'My First Ride',
    'Added your first vehicle to the garage',
    'onboarding',
    'Common',
    'car',
    1,
    'Novice',
    NULL,
    '/badges/my-first-ride.svg'
  ),
  (
    'social-starter',
    'Social Starter',
    'Gained your first follower',
    'onboarding',
    'Common',
    'users',
    1,
    'Novice',
    NULL,
    '/badges/social-starter.svg'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  rarity = EXCLUDED.rarity,
  icon_name = EXCLUDED.icon_name,
  level = EXCLUDED.level,
  level_name = EXCLUDED.level_name,
  progression_group = EXCLUDED.progression_group,
  icon_path = EXCLUDED.icon_path;

-- ============================================
-- STEP 3: Seed Tiered Activity Badges
-- ============================================

-- All Eyes on Me (posts created)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('content-creator-1', 'All Eyes on Me', 'Create 5 posts',  'content-creator', 'Common',   'edit-3', 1, 'Bronze',   'content-creator', 'content_creator', 5, 'tiered_activity'),
  ('content-creator-2', 'All Eyes on Me', 'Create 10 posts', 'content-creator', 'Uncommon', 'edit-3', 2, 'Silver',   'content-creator', 'content_creator', 10, 'tiered_activity'),
  ('content-creator-3', 'All Eyes on Me', 'Create 25 posts', 'content-creator', 'Rare',     'edit-3', 3, 'Gold',     'content-creator', 'content_creator', 25, 'tiered_activity'),
  ('content-creator-4', 'All Eyes on Me', 'Create 50 posts', 'content-creator', 'Epic',     'edit-3', 4, 'Platinum', 'content-creator', 'content_creator', 50, 'tiered_activity')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier_threshold = EXCLUDED.tier_threshold,
  earning_method = EXCLUDED.earning_method,
  badge_group = EXCLUDED.badge_group;

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
  ('commenter-4', 'Wordsmith', 'Leave 100 comments', 'commenter', 'Epic',     'message-circle', 4, 'Platinum', 'commenter', 'commenter', 100, 'tiered_activity')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier_threshold = EXCLUDED.tier_threshold,
  earning_method = EXCLUDED.earning_method,
  badge_group = EXCLUDED.badge_group;

-- Eagle Eye (vehicles spotted)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('spotter-0', 'First Glance', 'Spot your first vehicle', 'spotter', 'Common',    'eye', 0, 'Bronze',   'spotter', 'spotter', 1, 'tiered_activity'),
  ('spotter-1', 'Eagle Eye',    'Spot 3 vehicles',         'spotter', 'Common',    'crosshair', 1, 'Bronze',   'spotter', 'spotter', 3, 'tiered_activity'),
  ('spotter-2', 'Eagle Eye',    'Spot 10 vehicles',        'spotter', 'Uncommon',  'crosshair', 2, 'Silver',   'spotter', 'spotter', 10, 'tiered_activity'),
  ('spotter-3', 'Eagle Eye',    'Spot 25 vehicles',        'spotter', 'Rare',      'crosshair', 3, 'Gold',     'spotter', 'spotter', 25, 'tiered_activity'),
  ('spotter-4', 'Eagle Eye',    'Spot 50 vehicles',        'spotter', 'Legendary', 'crosshair', 4, 'Platinum', 'spotter', 'spotter', 50, 'tiered_activity')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier_threshold = EXCLUDED.tier_threshold,
  earning_method = EXCLUDED.earning_method,
  badge_group = EXCLUDED.badge_group;

-- Groupie (followers)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method
)
VALUES
  ('getting-noticed-1', 'Groupie', 'Gain 5 followers',   'getting-noticed', 'Common',   'users', 1, 'Bronze',   'getting-noticed', 'followers', 5, 'tiered_activity'),
  ('getting-noticed-2', 'Groupie', 'Gain 25 followers',  'getting-noticed', 'Uncommon', 'users', 2, 'Silver',   'getting-noticed', 'followers', 25, 'tiered_activity'),
  ('getting-noticed-3', 'Groupie', 'Gain 50 followers',  'getting-noticed', 'Rare',     'users', 3, 'Gold',     'getting-noticed', 'followers', 50, 'tiered_activity'),
  ('getting-noticed-4', 'Groupie', 'Gain 100 followers', 'getting-noticed', 'Epic',     'users', 4, 'Platinum', 'getting-noticed', 'followers', 100, 'tiered_activity')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier_threshold = EXCLUDED.tier_threshold,
  earning_method = EXCLUDED.earning_method,
  badge_group = EXCLUDED.badge_group;

-- ============================================
-- STEP 4: Verify the fix
-- ============================================

-- Check that all required badges exist
DO $$
DECLARE
  badge_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO badge_count FROM badges WHERE id IN (
    'welcome', 'first-post', 'profile-complete', 'my-first-ride', 'social-starter',
    'spotter-0', 'spotter-1', 'spotter-2', 'spotter-3', 'spotter-4'
  );

  IF badge_count < 10 THEN
    RAISE WARNING 'Expected at least 10 badges, found only %', badge_count;
  ELSE
    RAISE NOTICE 'Successfully seeded % badges', badge_count;
  END IF;
END $$;

-- Show summary
SELECT
  category,
  COUNT(*) as badge_count,
  string_agg(name, ', ' ORDER BY id) as badge_names
FROM badges
GROUP BY category
ORDER BY category;
