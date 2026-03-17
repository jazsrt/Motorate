/*
  # Fix Badge System Overlap & Broken References

  Issues fixed:
  1. check_and_award_badges references b.rarity which doesn't exist → use b.tier instead
  2. Drop trigger-based badge functions that double-award with app-code RPC calls
  3. Drop legacy/duplicate reputation functions (keep only award_motorate_points + record_reputation_event)
  4. Add missing engagement/social badge_group mappings

  Run this in Supabase SQL Editor.
*/

-- ============================================================
-- FIX 1: Recreate check_and_award_badges WITHOUT b.rarity
-- ============================================================

DROP FUNCTION IF EXISTS check_and_award_badges(UUID, TEXT);

CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID, p_action TEXT)
RETURNS TABLE(badge_id TEXT, badge_name TEXT, badge_rarity TEXT) AS $$
DECLARE
  activity_count INTEGER;
  badge_rec RECORD;
  v_badge_group TEXT;
BEGIN
  v_badge_group := CASE p_action
    WHEN 'spot' THEN 'spotter'
    WHEN 'review' THEN 'reviewer'
    WHEN 'post' THEN 'content_creator'
    WHEN 'comment' THEN 'commenter'
    WHEN 'follow' THEN 'followers'
    WHEN 'like' THEN 'reactor'
    WHEN 'photo' THEN 'photographer'
    WHEN 'mod' THEN 'builder'
    ELSE NULL
  END;

  IF v_badge_group IS NULL THEN
    RETURN;
  END IF;

  CASE p_action
    WHEN 'spot' THEN
      SELECT COUNT(*) INTO activity_count FROM spot_history WHERE spotter_id = p_user_id;
    WHEN 'review' THEN
      SELECT COUNT(*) INTO activity_count FROM reviews WHERE author_id = p_user_id;
    WHEN 'post' THEN
      SELECT COUNT(*) INTO activity_count FROM posts WHERE author_id = p_user_id;
    WHEN 'comment' THEN
      SELECT COUNT(*) INTO activity_count FROM post_comments WHERE author_id = p_user_id;
    WHEN 'follow' THEN
      SELECT COUNT(*) INTO activity_count FROM follows WHERE follower_id = p_user_id;
    WHEN 'like' THEN
      SELECT COUNT(*) INTO activity_count FROM reactions WHERE user_id = p_user_id;
    WHEN 'photo' THEN
      SELECT COUNT(*) INTO activity_count FROM spot_history WHERE spotter_id = p_user_id AND photo_url IS NOT NULL;
    WHEN 'mod' THEN
      SELECT COUNT(*) INTO activity_count FROM modifications m INNER JOIN vehicles v ON v.id = m.vehicle_id WHERE v.owner_id = p_user_id;
    ELSE
      activity_count := 0;
  END CASE;

  FOR badge_rec IN
    SELECT b.id, b.name, COALESCE(b.tier, 'bronze') as tier_val
    FROM badges b
    WHERE b.badge_group = v_badge_group
      AND b.earning_method = 'tiered_activity'
      AND b.tier_threshold IS NOT NULL
      AND b.tier_threshold <= activity_count
      AND b.id NOT IN (
        SELECT ub.badge_id FROM user_badges ub WHERE ub.user_id = p_user_id
      )
    ORDER BY b.tier_threshold ASC
  LOOP
    INSERT INTO user_badges (user_id, badge_id, earned_at)
    VALUES (p_user_id, badge_rec.id, NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING;

    badge_id := badge_rec.id;
    badge_name := badge_rec.name;
    badge_rarity := CASE badge_rec.tier_val
      WHEN 'platinum' THEN 'Legendary'
      WHEN 'gold' THEN 'Epic'
      WHEN 'silver' THEN 'Rare'
      WHEN 'bronze' THEN 'Uncommon'
      ELSE 'Common'
    END;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_and_award_badges TO authenticated, service_role;


-- ============================================================
-- FIX 2: Drop trigger-based badge functions that double-award
-- These fire on INSERT and duplicate what check_and_award_badges does
-- ============================================================

-- Drop triggers on posts table
DROP TRIGGER IF EXISTS award_post_badges_trigger ON posts;
DROP TRIGGER IF EXISTS trigger_award_content_creator_badges ON posts;

-- Drop triggers on post_likes table
DROP TRIGGER IF EXISTS trigger_award_getting_noticed_badges ON post_likes;
DROP TRIGGER IF EXISTS trigger_award_reactor_badges ON post_likes;

-- Drop triggers on reactions table
DROP TRIGGER IF EXISTS trigger_award_reaction_badges ON reactions;

-- Drop the individual check_*_badges functions (unified function handles everything)
DROP FUNCTION IF EXISTS check_spotter_badges(UUID);
DROP FUNCTION IF EXISTS check_reviewer_badges(UUID);
DROP FUNCTION IF EXISTS check_commenter_badges(UUID);
DROP FUNCTION IF EXISTS check_content_creator_badges(UUID);
DROP FUNCTION IF EXISTS check_reactor_badges(UUID);
DROP FUNCTION IF EXISTS check_photographer_badges(UUID);
DROP FUNCTION IF EXISTS check_builder_badges(UUID);
DROP FUNCTION IF EXISTS check_social_badges(UUID);
DROP FUNCTION IF EXISTS check_follower_badges(UUID);

-- Drop the trigger functions themselves
DROP FUNCTION IF EXISTS award_post_badges();
DROP FUNCTION IF EXISTS award_getting_noticed_badges();
DROP FUNCTION IF EXISTS award_reactor_badges();
DROP FUNCTION IF EXISTS award_reaction_badges();
DROP FUNCTION IF EXISTS award_content_creator_badges();


-- ============================================================
-- FIX 3: Drop legacy/duplicate reputation functions
-- Keep only: award_motorate_points (used by app) and record_reputation_event (used by remaining triggers)
-- ============================================================

DROP FUNCTION IF EXISTS add_reputation(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS award_carma_points(UUID, INTEGER, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS award_motorated_points(UUID, INTEGER, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS award_rep(UUID, INTEGER, TEXT);
-- NOTE: award_reputation_points is KEPT — called by RateDriverModal via awardReputationPoints()


-- ============================================================
-- FIX 4: Update engagement/social badges to use one_off earning_method
-- These badges have fixed thresholds and don't map to any action in check_and_award_badges
-- Convert them so they can be awarded via specific app logic
-- ============================================================

UPDATE badges SET earning_method = 'one_off' WHERE badge_group = 'engagement' AND earning_method != 'one_off';
UPDATE badges SET earning_method = 'one_off' WHERE badge_group = 'social' AND earning_method != 'one_off';
