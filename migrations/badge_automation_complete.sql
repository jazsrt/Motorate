/*
  # Badge Automation System - Complete

  This migration creates the complete badge automation system that:
  - Checks user activity counts and awards badges automatically
  - Returns newly awarded badges for notification display
  - Handles all progression groups (comments, posts, reactions, etc.)
  - Is race-condition safe and idempotent

  ## Features
  - Automatic badge awarding based on activity thresholds
  - Returns badge details for UI notifications
  - Prevents duplicate badge awards
  - Works with all progression groups

  ## Usage
  Called automatically after user actions (posting comments, reactions, etc.)
*/

-- Drop the function if it exists to ensure clean slate
DROP FUNCTION IF EXISTS check_and_award_activity_badge;

-- Create the badge automation function
CREATE OR REPLACE FUNCTION check_and_award_activity_badge(
  p_user_id UUID,
  p_progression_group TEXT,
  p_count INTEGER
)
RETURNS TABLE(
  badge_id UUID,
  badge_name TEXT,
  badge_icon TEXT,
  badge_description TEXT,
  badge_rarity TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert badges that the user has earned but doesn't have yet
  -- Return the newly awarded badges for notification display
  RETURN QUERY
  WITH inserted_badges AS (
    INSERT INTO user_badges (user_id, badge_id)
    SELECT
      p_user_id,
      b.id
    FROM badges b
    WHERE
      -- Match the progression group
      b.progression_group = p_progression_group
      -- User has met or exceeded the threshold
      AND (b.tier_threshold IS NULL OR b.tier_threshold <= p_count)
      -- User doesn't already have this badge
      AND NOT EXISTS (
        SELECT 1
        FROM user_badges ub
        WHERE ub.user_id = p_user_id
          AND ub.badge_id = b.id
      )
    ON CONFLICT (user_id, badge_id) DO NOTHING
    RETURNING user_badges.badge_id
  )
  SELECT
    ib.badge_id,
    b.name,
    b.icon_name,
    b.description,
    b.rarity
  FROM inserted_badges ib
  JOIN badges b ON b.id = ib.badge_id;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION check_and_award_activity_badge TO authenticated, anon;

-- Create index for faster badge lookups
CREATE INDEX IF NOT EXISTS idx_badges_progression_threshold
  ON badges(progression_group, tier_threshold)
  WHERE progression_group IS NOT NULL;

-- Create index for faster user_badges lookups
CREATE INDEX IF NOT EXISTS idx_user_badges_user_badge
  ON user_badges(user_id, badge_id);
