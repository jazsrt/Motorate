/*
  # Badge Auto-Awarding System (FINAL CORRECTED VERSION)

  1. Function
    - `check_and_award_badges(p_user_id, p_action)` - Checks user activity counts and awards appropriate tiered badges

  2. Logic
    - Counts user activities based on action type (spot, review, post, comment, follow, like, photo, mod)
    - Queries badges table for matching badge_group and tier thresholds
    - Awards badges that haven't been earned yet
    - Returns list of newly awarded badges

  3. Security
    - SECURITY DEFINER to allow badge awarding
    - Only awards badges user hasn't already earned

  4. FINAL CORRECTIONS:
    - reviews table: Uses `author_id` not `user_id` ✅
    - modifications table: NO user_id column - must JOIN through vehicles.owner_id ✅
    - All other tables verified against actual schema ✅
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS check_and_award_badge(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS check_and_award_badges(UUID, TEXT);
DROP FUNCTION IF EXISTS check_and_award_activity_badge(UUID, TEXT, INTEGER);

-- Create the badge auto-award function with ALL CORRECTIONS
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID, p_action TEXT)
RETURNS TABLE(badge_id TEXT, badge_name TEXT, badge_rarity TEXT) AS $$
DECLARE
  activity_count INTEGER;
  badge_rec RECORD;
  v_badge_group TEXT;
BEGIN
  -- Map action to badge_group
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

  -- Count user's activity based on action type
  CASE p_action
    WHEN 'spot' THEN
      -- VERIFIED: spot_history table uses spotter_id
      SELECT COUNT(*) INTO activity_count
      FROM spot_history
      WHERE spotter_id = p_user_id;

    WHEN 'review' THEN
      -- CORRECTED: reviews table uses author_id not user_id
      SELECT COUNT(*) INTO activity_count
      FROM reviews
      WHERE author_id = p_user_id;

    WHEN 'post' THEN
      -- VERIFIED: posts table uses author_id
      SELECT COUNT(*) INTO activity_count
      FROM posts
      WHERE author_id = p_user_id;

    WHEN 'comment' THEN
      -- VERIFIED: post_comments table uses author_id
      SELECT COUNT(*) INTO activity_count
      FROM post_comments
      WHERE author_id = p_user_id;

    WHEN 'follow' THEN
      -- VERIFIED: follows table uses follower_id
      SELECT COUNT(*) INTO activity_count
      FROM follows
      WHERE follower_id = p_user_id;

    WHEN 'like' THEN
      -- VERIFIED: reactions table uses user_id
      SELECT COUNT(*) INTO activity_count
      FROM reactions
      WHERE user_id = p_user_id;

    WHEN 'photo' THEN
      -- VERIFIED: spot_history with photo_url check
      SELECT COUNT(*) INTO activity_count
      FROM spot_history
      WHERE spotter_id = p_user_id
        AND photo_url IS NOT NULL;

    WHEN 'mod' THEN
      -- CORRECTED: modifications table has NO user_id - must JOIN through vehicles
      SELECT COUNT(*) INTO activity_count
      FROM modifications m
      INNER JOIN vehicles v ON v.id = m.vehicle_id
      WHERE v.owner_id = p_user_id;

    ELSE
      activity_count := 0;
  END CASE;

  -- Find and award eligible badges
  FOR badge_rec IN
    SELECT b.id, b.name, b.rarity
    FROM badges b
    WHERE b.badge_group = v_badge_group
      AND b.earning_method = 'tiered_activity'
      AND b.tier_threshold IS NOT NULL
      AND b.tier_threshold <= activity_count
      AND b.id NOT IN (
        SELECT ub.badge_id
        FROM user_badges ub
        WHERE ub.user_id = p_user_id
      )
    ORDER BY b.tier_threshold ASC
  LOOP
    -- Award the badge
    INSERT INTO user_badges (user_id, badge_id, earned_at)
    VALUES (p_user_id, badge_rec.id, NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING;

    -- Return badge info
    badge_id := badge_rec.id;
    badge_name := badge_rec.name;
    badge_rarity := badge_rec.rarity;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_and_award_badges TO authenticated, service_role;

COMMENT ON FUNCTION check_and_award_badges IS 'Automatically checks user progress and awards appropriate tiered badges. Final corrected version with reviews.author_id and modifications JOIN fix.';
