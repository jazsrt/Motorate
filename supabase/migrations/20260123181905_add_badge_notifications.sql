/*
  # Add Automated Badge Notifications
  
  Enhances the badge automation system to automatically create notifications
  when badges are awarded to users.
*/

-- Update the main badge awarding function to create notifications
CREATE OR REPLACE FUNCTION check_and_award_badge(
  p_user_id uuid,
  p_badge_group text,
  p_count integer
) RETURNS void AS $$
DECLARE
  v_badge_id uuid;
  v_badge_name text;
  v_tier text;
  v_description text;
  v_newly_awarded boolean := false;
BEGIN
  -- Find the highest tier badge this user qualifies for
  SELECT id, name, tier, description
  INTO v_badge_id, v_badge_name, v_tier, v_description
  FROM badges
  WHERE badge_group = p_badge_group
    AND p_count >= tier_threshold
    AND tier_threshold IS NOT NULL
  ORDER BY tier_threshold DESC
  LIMIT 1;

  -- If a badge was found and user doesn't already have it
  IF v_badge_id IS NOT NULL THEN
    -- Try to insert the badge
    INSERT INTO user_badges (user_id, badge_id, earned_at)
    VALUES (p_user_id, v_badge_id, NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING
    RETURNING true INTO v_newly_awarded;

    -- If badge was just awarded (not a duplicate), create notification
    IF v_newly_awarded THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link_type,
        link_id,
        is_read,
        created_at
      ) VALUES (
        p_user_id,
        'badge_awarded',
        'New Badge Unlocked!',
        'You earned the ' || v_badge_name || ' badge! ' || COALESCE(v_description, ''),
        'badge',
        v_badge_id::text,
        false,
        NOW()
      );
    END IF;

    -- Remove lower tier badges from same group
    DELETE FROM user_badges
    WHERE user_id = p_user_id
      AND badge_id IN (
        SELECT id FROM badges
        WHERE badge_group = p_badge_group
          AND id != v_badge_id
      );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function for manual badge grants (admin grants)
CREATE OR REPLACE FUNCTION notify_badge_award()
RETURNS TRIGGER AS $$
DECLARE
  v_badge_name text;
  v_description text;
BEGIN
  -- Get badge details
  SELECT name, description
  INTO v_badge_name, v_description
  FROM badges
  WHERE id = NEW.badge_id;

  -- Create notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link_type,
    link_id,
    is_read,
    created_at
  ) VALUES (
    NEW.user_id,
    'badge_awarded',
    'New Badge Unlocked!',
    'You earned the ' || v_badge_name || ' badge! ' || COALESCE(v_description, ''),
    'badge',
    NEW.badge_id::text,
    false,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_badge_awarded_notify ON user_badges;

-- Create trigger for manual badge awards
CREATE TRIGGER on_badge_awarded_notify
  AFTER INSERT ON user_badges
  FOR EACH ROW
  WHEN (NEW.earned_at = NEW.earned_at) -- Always true, just proper trigger syntax
  EXECUTE FUNCTION notify_badge_award();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_and_award_badge TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_badge_award TO authenticated, service_role;

COMMENT ON FUNCTION check_and_award_badge IS 'Automatically checks user progress and awards appropriate badges with notifications';
COMMENT ON FUNCTION notify_badge_award IS 'Creates notifications when badges are manually awarded';
COMMENT ON TRIGGER on_badge_awarded_notify ON user_badges IS 'Sends notifications for badge awards';
