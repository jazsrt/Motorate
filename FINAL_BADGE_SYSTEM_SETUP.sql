/*
  ============================================================
  FINAL BADGE SYSTEM SETUP - CONSOLIDATED MIGRATION
  ============================================================

  This is the ONLY migration you need to run to fix the badge system.
  It consolidates all the fixes into one comprehensive migration.

  What this does:
  1. Ensures badges table has correct schema (TEXT id, all columns)
  2. Seeds ALL required badges (onboarding + tiered activity badges)
  3. Sets up automatic triggers for onboarding badges
  4. No duplicate systems - clean and simple

  Safe to run multiple times (idempotent)
*/

-- ============================================
-- PART 1: Fix Badges Table Schema
-- ============================================

DO $$
BEGIN
  -- Ensure badges table exists with TEXT id
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'badges') THEN
    CREATE TABLE badges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      rarity TEXT CHECK (rarity IN ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary')),
      icon_name TEXT,
      level INTEGER DEFAULT 1,
      level_name TEXT DEFAULT 'Novice',
      progression_group TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Anyone can view badges"
      ON badges FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  -- Add missing columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'badges' AND column_name = 'icon_path') THEN
    ALTER TABLE badges ADD COLUMN icon_path TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'badges' AND column_name = 'badge_group') THEN
    ALTER TABLE badges ADD COLUMN badge_group TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'badges' AND column_name = 'tier_threshold') THEN
    ALTER TABLE badges ADD COLUMN tier_threshold INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'badges' AND column_name = 'earning_method') THEN
    ALTER TABLE badges ADD COLUMN earning_method TEXT;
  END IF;

  -- Ensure user_badges table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_badges') THEN
    CREATE TABLE user_badges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
      earned_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, badge_id)
    );

    ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own badges"
      ON user_badges FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
    CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
  END IF;
END $$;

-- ============================================
-- PART 2: Seed Onboarding Badges
-- ============================================

INSERT INTO badges (
  id, name, description, category, rarity, icon_name,
  level, level_name, progression_group, icon_path
) VALUES
  ('welcome', 'Welcome', 'Welcome to MotoRated!', 'onboarding', 'Common', 'flag', 1, 'Novice', NULL, '/badges/welcome.svg'),
  ('first-post', 'First Post', 'Created your first post', 'onboarding', 'Common', 'edit-3', 1, 'Novice', NULL, '/badges/first-post.svg'),
  ('profile-complete', 'Profile Complete', 'Completed your profile with bio and avatar', 'onboarding', 'Common', 'user-check', 1, 'Novice', NULL, '/badges/profile-complete.svg'),
  ('my-first-ride', 'My First Ride', 'Added your first vehicle to the garage', 'onboarding', 'Common', 'car', 1, 'Novice', NULL, '/badges/my-first-ride.svg'),
  ('social-starter', 'Social Starter', 'Gained your first follower', 'onboarding', 'Common', 'users', 1, 'Novice', NULL, '/badges/social-starter.svg')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_path = EXCLUDED.icon_path;

-- ============================================
-- PART 3: Seed Tiered Activity Badges
-- ============================================

-- Spotter badges (vehicles spotted)
INSERT INTO badges (id, name, description, category, rarity, icon_name, level, level_name, progression_group, badge_group, tier_threshold, earning_method)
VALUES
  ('spotter-0', 'First Glance', 'Spot your first vehicle', 'spotter', 'Common', 'eye', 0, 'Bronze', 'spotter', 'spotter', 1, 'tiered_activity'),
  ('spotter-1', 'Eagle Eye', 'Spot 3 vehicles', 'spotter', 'Common', 'crosshair', 1, 'Bronze', 'spotter', 'spotter', 3, 'tiered_activity'),
  ('spotter-2', 'Eagle Eye', 'Spot 10 vehicles', 'spotter', 'Uncommon', 'crosshair', 2, 'Silver', 'spotter', 'spotter', 10, 'tiered_activity'),
  ('spotter-3', 'Eagle Eye', 'Spot 25 vehicles', 'spotter', 'Rare', 'crosshair', 3, 'Gold', 'spotter', 'spotter', 25, 'tiered_activity'),
  ('spotter-4', 'Eagle Eye', 'Spot 50 vehicles', 'spotter', 'Legendary', 'crosshair', 4, 'Platinum', 'spotter', 'spotter', 50, 'tiered_activity')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tier_threshold = EXCLUDED.tier_threshold;

-- Content creator badges (posts created)
INSERT INTO badges (id, name, description, category, rarity, icon_name, level, level_name, progression_group, badge_group, tier_threshold, earning_method)
VALUES
  ('content-creator-1', 'All Eyes on Me', 'Create 5 posts', 'content-creator', 'Common', 'edit-3', 1, 'Bronze', 'content-creator', 'content_creator', 5, 'tiered_activity'),
  ('content-creator-2', 'All Eyes on Me', 'Create 10 posts', 'content-creator', 'Uncommon', 'edit-3', 2, 'Silver', 'content-creator', 'content_creator', 10, 'tiered_activity'),
  ('content-creator-3', 'All Eyes on Me', 'Create 25 posts', 'content-creator', 'Rare', 'edit-3', 3, 'Gold', 'content-creator', 'content_creator', 25, 'tiered_activity'),
  ('content-creator-4', 'All Eyes on Me', 'Create 50 posts', 'content-creator', 'Epic', 'edit-3', 4, 'Platinum', 'content-creator', 'content_creator', 50, 'tiered_activity')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tier_threshold = EXCLUDED.tier_threshold;

-- Commenter badges
INSERT INTO badges (id, name, description, category, rarity, icon_name, level, level_name, progression_group, badge_group, tier_threshold, earning_method)
VALUES
  ('commenter-1', 'Wordsmith', 'Leave 5 comments', 'commenter', 'Common', 'message-circle', 1, 'Bronze', 'commenter', 'commenter', 5, 'tiered_activity'),
  ('commenter-2', 'Wordsmith', 'Leave 25 comments', 'commenter', 'Uncommon', 'message-circle', 2, 'Silver', 'commenter', 'commenter', 25, 'tiered_activity'),
  ('commenter-3', 'Wordsmith', 'Leave 50 comments', 'commenter', 'Rare', 'message-circle', 3, 'Gold', 'commenter', 'commenter', 50, 'tiered_activity'),
  ('commenter-4', 'Wordsmith', 'Leave 100 comments', 'commenter', 'Epic', 'message-circle', 4, 'Platinum', 'commenter', 'commenter', 100, 'tiered_activity')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tier_threshold = EXCLUDED.tier_threshold;

-- Follower badges
INSERT INTO badges (id, name, description, category, rarity, icon_name, level, level_name, progression_group, badge_group, tier_threshold, earning_method)
VALUES
  ('getting-noticed-1', 'Groupie', 'Gain 5 followers', 'getting-noticed', 'Common', 'users', 1, 'Bronze', 'getting-noticed', 'followers', 5, 'tiered_activity'),
  ('getting-noticed-2', 'Groupie', 'Gain 25 followers', 'getting-noticed', 'Uncommon', 'users', 2, 'Silver', 'getting-noticed', 'followers', 25, 'tiered_activity'),
  ('getting-noticed-3', 'Groupie', 'Gain 50 followers', 'getting-noticed', 'Rare', 'users', 3, 'Gold', 'getting-noticed', 'followers', 50, 'tiered_activity'),
  ('getting-noticed-4', 'Groupie', 'Gain 100 followers', 'getting-noticed', 'Epic', 'users', 4, 'Platinum', 'getting-noticed', 'followers', 100, 'tiered_activity')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tier_threshold = EXCLUDED.tier_threshold;

-- ============================================
-- PART 4: Create Auto-Award Function & Triggers
-- ============================================

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS award_badges_on_post ON posts;
DROP TRIGGER IF EXISTS award_badges_on_profile ON profiles;
DROP TRIGGER IF EXISTS award_badges_on_vehicle ON vehicles;
DROP TRIGGER IF EXISTS award_badges_on_follow ON follows;

-- Create the badge auto-award function
CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_post_count INT;
  v_vehicle_count INT;
  v_profile_complete BOOLEAN;
  v_follower_count INT;
BEGIN
  -- Determine user_id based on the table
  IF TG_TABLE_NAME = 'posts' THEN
    v_user_id := COALESCE(NEW.author_id, OLD.author_id);
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    v_user_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'vehicles' THEN
    v_user_id := COALESCE(NEW.owner_id, OLD.owner_id);
  ELSIF TG_TABLE_NAME = 'follows' THEN
    v_user_id := COALESCE(NEW.following_id, OLD.following_id);
  ELSE
    RETURN NEW;
  END IF;

  -- Skip if no valid user_id
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get current counts
  SELECT COUNT(*) INTO v_post_count FROM posts WHERE author_id = v_user_id;
  SELECT COUNT(*) INTO v_vehicle_count FROM vehicles WHERE owner_id = v_user_id;
  SELECT COUNT(*) INTO v_follower_count FROM follows WHERE following_id = v_user_id;

  -- Check profile completion
  SELECT (bio IS NOT NULL AND bio != '' AND avatar_url IS NOT NULL)
  INTO v_profile_complete
  FROM profiles WHERE id = v_user_id;

  -- Award onboarding badges (only once each)
  IF v_post_count = 1 THEN
    INSERT INTO user_badges (user_id, badge_id, earned_at)
    VALUES (v_user_id, 'first-post', NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_vehicle_count = 1 THEN
    INSERT INTO user_badges (user_id, badge_id, earned_at)
    VALUES (v_user_id, 'my-first-ride', NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_profile_complete THEN
    INSERT INTO user_badges (user_id, badge_id, earned_at)
    VALUES (v_user_id, 'profile-complete', NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_follower_count = 1 THEN
    INSERT INTO user_badges (user_id, badge_id, earned_at)
    VALUES (v_user_id, 'social-starter', NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on all relevant tables
CREATE TRIGGER award_badges_on_post
  AFTER INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_badges();

CREATE TRIGGER award_badges_on_profile
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_badges();

CREATE TRIGGER award_badges_on_vehicle
  AFTER INSERT ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_badges();

CREATE TRIGGER award_badges_on_follow
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_badges();

-- ============================================
-- PART 5: Verify Setup
-- ============================================

DO $$
DECLARE
  badge_count INTEGER;
  trigger_count INTEGER;
BEGIN
  -- Count badges
  SELECT COUNT(*) INTO badge_count FROM badges;

  -- Count triggers
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname LIKE 'award_badges_on_%';

  RAISE NOTICE '✓ Badge system setup complete!';
  RAISE NOTICE '  - % badges seeded', badge_count;
  RAISE NOTICE '  - % triggers created', trigger_count;
  RAISE NOTICE '  - Auto-award enabled for: vehicles, posts, profiles, follows';
END $$;

-- Show summary
SELECT
  category,
  COUNT(*) as count,
  string_agg(name, ', ' ORDER BY id) as badges
FROM badges
GROUP BY category
ORDER BY category;
