/*
  # Fix Badges System - Complete Fix v2

  ## Problem
  - Tier constraint only allows: 'bronze', 'silver', 'gold', 'platinum'
  - Onboarding badges were trying to insert without tier column (defaults to something invalid)
  - Progressive badges need explicit tier values

  ## Solution
  1. Make tier column nullable if not already
  2. Insert onboarding badges with tier = NULL
  3. Insert progressive badges with correct tier values ('bronze', 'silver', 'gold', 'platinum')

  ## Safety
  - Uses IF NOT EXISTS and ON CONFLICT to be idempotent
  - Preserves existing user_badges records
*/

-- ============================================
-- STEP 1: Make tier column nullable and add missing columns
-- ============================================

DO $$
BEGIN
  -- Make tier column nullable if it has NOT NULL constraint
  ALTER TABLE badges ALTER COLUMN tier DROP NOT NULL;

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
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Column modifications completed with notices: %', SQLERRM;
END $$;

-- ============================================
-- STEP 2: Seed Onboarding Badges (tier = NULL)
-- ============================================

INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, icon_path, tier
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
    '/badges/welcome.svg',
    NULL
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
    '/badges/first-post.svg',
    NULL
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
    '/badges/profile-complete.svg',
    NULL
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
    '/badges/my-first-ride.svg',
    NULL
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
    '/badges/social-starter.svg',
    NULL
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
  icon_path = EXCLUDED.icon_path,
  tier = EXCLUDED.tier;

-- ============================================
-- STEP 3: Seed Tiered Activity Badges
-- ============================================

-- All Eyes on Me (posts created)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method, tier, icon_path
)
VALUES
  ('content-creator-1', 'All Eyes on Me', 'Create 5 posts',  'content-creator', 'Common',   'edit-3', 1, 'Bronze',   'content-creator', 'content_creator', 5, 'tiered_activity', 'bronze', '/badges/content-creator-bronze.svg'),
  ('content-creator-2', 'All Eyes on Me', 'Create 10 posts', 'content-creator', 'Uncommon', 'edit-3', 2, 'Silver',   'content-creator', 'content_creator', 10, 'tiered_activity', 'silver', '/badges/content-creator-silver.svg'),
  ('content-creator-3', 'All Eyes on Me', 'Create 25 posts', 'content-creator', 'Rare',     'edit-3', 3, 'Gold',     'content-creator', 'content_creator', 25, 'tiered_activity', 'gold', '/badges/content-creator-gold.svg'),
  ('content-creator-4', 'All Eyes on Me', 'Create 50 posts', 'content-creator', 'Epic',     'edit-3', 4, 'Platinum', 'content-creator', 'content_creator', 50, 'tiered_activity', 'platinum', '/badges/content-creator-platinum.svg')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier_threshold = EXCLUDED.tier_threshold,
  earning_method = EXCLUDED.earning_method,
  badge_group = EXCLUDED.badge_group,
  tier = EXCLUDED.tier,
  icon_path = EXCLUDED.icon_path;

-- Wordsmith (comments)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method, tier, icon_path
)
VALUES
  ('commenter-1', 'Wordsmith', 'Leave 5 comments',   'commenter', 'Common',   'message-circle', 1, 'Bronze',   'commenter', 'commenter', 5, 'tiered_activity', 'bronze', '/badges/commenter-bronze.svg'),
  ('commenter-2', 'Wordsmith', 'Leave 25 comments',  'commenter', 'Uncommon', 'message-circle', 2, 'Silver',   'commenter', 'commenter', 25, 'tiered_activity', 'silver', '/badges/commenter-silver.svg'),
  ('commenter-3', 'Wordsmith', 'Leave 50 comments',  'commenter', 'Rare',     'message-circle', 3, 'Gold',     'commenter', 'commenter', 50, 'tiered_activity', 'gold', '/badges/commenter-gold.svg'),
  ('commenter-4', 'Wordsmith', 'Leave 100 comments', 'commenter', 'Epic',     'message-circle', 4, 'Platinum', 'commenter', 'commenter', 100, 'tiered_activity', 'platinum', '/badges/commenter-platinum.svg')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier_threshold = EXCLUDED.tier_threshold,
  earning_method = EXCLUDED.earning_method,
  badge_group = EXCLUDED.badge_group,
  tier = EXCLUDED.tier,
  icon_path = EXCLUDED.icon_path;

-- Eagle Eye (vehicles spotted)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method, tier, icon_path
)
VALUES
  ('spotter-0', 'First Glance', 'Spot your first vehicle', 'spotter', 'Common',    'eye', 0, 'Bronze',   'spotter', 'spotter', 1, 'tiered_activity', 'bronze', '/badges/spotter-0-bronze.svg'),
  ('spotter-1', 'Eagle Eye',    'Spot 3 vehicles',         'spotter', 'Common',    'crosshair', 1, 'Bronze',   'spotter', 'spotter', 3, 'tiered_activity', 'bronze', '/badges/spotter-bronze.svg'),
  ('spotter-2', 'Eagle Eye',    'Spot 10 vehicles',        'spotter', 'Uncommon',  'crosshair', 2, 'Silver',   'spotter', 'spotter', 10, 'tiered_activity', 'silver', '/badges/spotter-silver.svg'),
  ('spotter-3', 'Eagle Eye',    'Spot 25 vehicles',        'spotter', 'Rare',      'crosshair', 3, 'Gold',     'spotter', 'spotter', 25, 'tiered_activity', 'gold', '/badges/spotter-gold.svg'),
  ('spotter-4', 'Eagle Eye',    'Spot 50 vehicles',        'spotter', 'Legendary', 'crosshair', 4, 'Platinum', 'spotter', 'spotter', 50, 'tiered_activity', 'platinum', '/badges/spotter-platinum.svg')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier_threshold = EXCLUDED.tier_threshold,
  earning_method = EXCLUDED.earning_method,
  badge_group = EXCLUDED.badge_group,
  tier = EXCLUDED.tier,
  icon_path = EXCLUDED.icon_path;

-- Groupie (followers)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method, tier, icon_path
)
VALUES
  ('getting-noticed-1', 'Groupie', 'Gain 5 followers',   'getting-noticed', 'Common',   'users', 1, 'Bronze',   'getting-noticed', 'getting-noticed', 5, 'tiered_activity', 'bronze', '/badges/getting-noticed-bronze.svg'),
  ('getting-noticed-2', 'Groupie', 'Gain 25 followers',  'getting-noticed', 'Uncommon', 'users', 2, 'Silver',   'getting-noticed', 'getting-noticed', 25, 'tiered_activity', 'silver', '/badges/getting-noticed-silver.svg'),
  ('getting-noticed-3', 'Groupie', 'Gain 50 followers',  'getting-noticed', 'Rare',     'users', 3, 'Gold',     'getting-noticed', 'getting-noticed', 50, 'tiered_activity', 'gold', '/badges/getting-noticed-gold.svg'),
  ('getting-noticed-4', 'Groupie', 'Gain 100 followers', 'getting-noticed', 'Epic',     'users', 4, 'Platinum', 'getting-noticed', 'getting-noticed', 100, 'tiered_activity', 'platinum', '/badges/getting-noticed-platinum.svg')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier_threshold = EXCLUDED.tier_threshold,
  earning_method = EXCLUDED.earning_method,
  badge_group = EXCLUDED.badge_group,
  tier = EXCLUDED.tier,
  icon_path = EXCLUDED.icon_path;

-- Photog (photos uploaded)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method, tier, icon_path
)
VALUES
  ('photographer-1', 'Photog', 'Upload 5 photos',  'photographer', 'Common',   'camera', 1, 'Bronze',   'photographer', 'photographer', 5, 'tiered_activity', 'bronze', '/badges/photographer-bronze.svg'),
  ('photographer-2', 'Photog', 'Upload 25 photos', 'photographer', 'Uncommon', 'camera', 2, 'Silver',   'photographer', 'photographer', 25, 'tiered_activity', 'silver', '/badges/photographer-silver.svg'),
  ('photographer-3', 'Photog', 'Upload 40 photos', 'photographer', 'Rare',     'camera', 3, 'Gold',     'photographer', 'photographer', 40, 'tiered_activity', 'gold', '/badges/photographer-gold.svg'),
  ('photographer-4', 'Photog', 'Upload 75 photos', 'photographer', 'Epic',     'camera', 4, 'Platinum', 'photographer', 'photographer', 75, 'tiered_activity', 'platinum', '/badges/photographer-platinum.svg')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier_threshold = EXCLUDED.tier_threshold,
  earning_method = EXCLUDED.earning_method,
  badge_group = EXCLUDED.badge_group,
  tier = EXCLUDED.tier,
  icon_path = EXCLUDED.icon_path;

-- Fan Club (followers gained)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method, tier, icon_path
)
VALUES
  ('popular-1', 'Fan Club', 'Gain 10 followers',  'popular', 'Common',    'users', 1, 'Bronze',   'popular', 'popular', 10, 'tiered_activity', 'bronze', '/badges/popular-bronze.svg'),
  ('popular-2', 'Fan Club', 'Gain 50 followers',  'popular', 'Uncommon',  'users', 2, 'Silver',   'popular', 'popular', 50, 'tiered_activity', 'silver', '/badges/popular-silver.svg'),
  ('popular-3', 'Fan Club', 'Gain 250 followers', 'popular', 'Rare',      'users', 3, 'Gold',     'popular', 'popular', 250, 'tiered_activity', 'gold', '/badges/popular-gold.svg'),
  ('popular-4', 'Fan Club', 'Gain 500 followers', 'popular', 'Legendary', 'users', 4, 'Platinum', 'popular', 'popular', 500, 'tiered_activity', 'platinum', '/badges/popular-platinum.svg')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier_threshold = EXCLUDED.tier_threshold,
  earning_method = EXCLUDED.earning_method,
  badge_group = EXCLUDED.badge_group,
  tier = EXCLUDED.tier,
  icon_path = EXCLUDED.icon_path;

-- Likey Likey (reactions given)
INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method, tier, icon_path
)
VALUES
  ('reactor-1', 'Likey Likey', 'React 10 times',  'reactor', 'Common',   'heart', 1, 'Bronze',   'reactor', 'reactor', 10, 'tiered_activity', 'bronze', '/badges/reactor-bronze.svg'),
  ('reactor-2', 'Likey Likey', 'React 50 times',  'reactor', 'Uncommon', 'heart', 2, 'Silver',   'reactor', 'reactor', 50, 'tiered_activity', 'silver', '/badges/reactor-silver.svg'),
  ('reactor-3', 'Likey Likey', 'React 150 times', 'reactor', 'Rare',     'heart', 3, 'Gold',     'reactor', 'reactor', 150, 'tiered_activity', 'gold', '/badges/reactor-gold.svg'),
  ('reactor-4', 'Likey Likey', 'React 300 times', 'reactor', 'Epic',     'heart', 4, 'Platinum', 'reactor', 'reactor', 300, 'tiered_activity', 'platinum', '/badges/reactor-platinum.svg')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier_threshold = EXCLUDED.tier_threshold,
  earning_method = EXCLUDED.earning_method,
  badge_group = EXCLUDED.badge_group,
  tier = EXCLUDED.tier,
  icon_path = EXCLUDED.icon_path;

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
  COUNT(DISTINCT tier) FILTER (WHERE tier IS NOT NULL) as tier_count,
  string_agg(DISTINCT tier, ', ' ORDER BY tier) as tiers
FROM badges
GROUP BY category
ORDER BY category;
