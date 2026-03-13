/*
  =====================================================
  MIGRATION 2: Badge Auto-Award System
  =====================================================

  What this does:
  - Creates a function that automatically awards badges
  - Sets up triggers on posts, profiles, vehicles, and follows
  - Awards badges when users complete actions

  Auto-Awards:
  - "first-post" when user creates first post
  - "my-first-ride" when user adds first vehicle
  - "profile-complete" when user fills bio + avatar
  - "social-starter" when user gets first follower
  - "welcome" badge given manually on signup

  SAFE TO RUN: Replaces existing function if it exists
*/

-- =====================================================
-- MAIN BADGE AWARD FUNCTION
-- =====================================================

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
  SELECT COUNT(*) INTO v_post_count
  FROM posts WHERE author_id = v_user_id;

  SELECT COUNT(*) INTO v_vehicle_count
  FROM vehicles WHERE owner_id = v_user_id;

  SELECT COUNT(*) INTO v_follower_count
  FROM follows WHERE following_id = v_user_id;

  -- Check profile completion
  SELECT
    (bio IS NOT NULL AND bio != '' AND avatar_url IS NOT NULL)
    INTO v_profile_complete
  FROM profiles WHERE id = v_user_id;

  -- Award "first-post" badge (first post)
  IF v_post_count = 1 THEN
    INSERT INTO user_badges (user_id, badge_id, earned_at)
    VALUES (v_user_id, 'first-post', NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Award "my-first-ride" badge (first vehicle)
  IF v_vehicle_count = 1 THEN
    INSERT INTO user_badges (user_id, badge_id, earned_at)
    VALUES (v_user_id, 'my-first-ride', NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Award "profile-complete" badge (complete profile)
  IF v_profile_complete THEN
    INSERT INTO user_badges (user_id, badge_id, earned_at)
    VALUES (v_user_id, 'profile-complete', NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Award "social-starter" badge (first follower)
  IF v_follower_count = 1 THEN
    INSERT INTO user_badges (user_id, badge_id, earned_at)
    VALUES (v_user_id, 'social-starter', NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS - Apply to all relevant tables
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS award_badges_on_post ON posts;
DROP TRIGGER IF EXISTS award_badges_on_profile ON profiles;
DROP TRIGGER IF EXISTS award_badges_on_vehicle ON vehicles;
DROP TRIGGER IF EXISTS award_badges_on_follow ON follows;

-- Create new triggers
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

-- Verify function was created
SELECT proname, pronargs
FROM pg_proc
WHERE proname = 'check_and_award_badges';
