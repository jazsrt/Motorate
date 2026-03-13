-- Award Test Badges to jazsrt
-- Run this in Supabase SQL Editor to award yourself some badges and see the modal in action

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user ID for jazsrt
  SELECT id INTO v_user_id
  FROM profiles
  WHERE handle = 'jazsrt'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User jazsrt not found';
  END IF;

  RAISE NOTICE 'Found user: %', v_user_id;

  -- Award Badge 1: First Glance (Bronze - Spotter)
  IF NOT EXISTS (SELECT 1 FROM user_badges WHERE user_id = v_user_id AND badge_id = 'spotter-0') THEN
    INSERT INTO user_badges (user_id, badge_id, awarded_at)
    VALUES (v_user_id, 'spotter-0', NOW());
    RAISE NOTICE 'Awarded: First Glance (Bronze)';
    PERFORM pg_sleep(0.5);
  ELSE
    RAISE NOTICE 'Already has: First Glance';
  END IF;

  -- Award Badge 2: Eagle Eye (Bronze - Spotter)
  IF NOT EXISTS (SELECT 1 FROM user_badges WHERE user_id = v_user_id AND badge_id = 'spotter-1') THEN
    INSERT INTO user_badges (user_id, badge_id, awarded_at)
    VALUES (v_user_id, 'spotter-1', NOW());
    RAISE NOTICE 'Awarded: Eagle Eye (Bronze)';
    PERFORM pg_sleep(0.5);
  ELSE
    RAISE NOTICE 'Already has: Eagle Eye (Bronze)';
  END IF;

  -- Award Badge 3: Social Butterfly (Silver - Social)
  IF NOT EXISTS (SELECT 1 FROM user_badges WHERE user_id = v_user_id AND badge_id = 'social-butterfly') THEN
    INSERT INTO user_badges (user_id, badge_id, awarded_at)
    VALUES (v_user_id, 'social-butterfly', NOW());
    RAISE NOTICE 'Awarded: Social Butterfly (Silver)';
    PERFORM pg_sleep(0.5);
  ELSE
    RAISE NOTICE 'Already has: Social Butterfly';
  END IF;

  -- Award Badge 4: Photog (Silver - Photographer)
  IF NOT EXISTS (SELECT 1 FROM user_badges WHERE user_id = v_user_id AND badge_id = 'photographer-2') THEN
    INSERT INTO user_badges (user_id, badge_id, awarded_at)
    VALUES (v_user_id, 'photographer-2', NOW());
    RAISE NOTICE 'Awarded: Photog (Silver)';
    PERFORM pg_sleep(0.5);
  ELSE
    RAISE NOTICE 'Already has: Photog (Silver)';
  END IF;

  -- Award Badge 5: Early Adopter (Gold - Special)
  IF NOT EXISTS (SELECT 1 FROM user_badges WHERE user_id = v_user_id AND badge_id = 'early-adopter') THEN
    INSERT INTO user_badges (user_id, badge_id, awarded_at)
    VALUES (v_user_id, 'early-adopter', NOW());
    RAISE NOTICE 'Awarded: Early Adopter (Gold)';
    PERFORM pg_sleep(0.5);
  ELSE
    RAISE NOTICE 'Already has: Early Adopter';
  END IF;

  RAISE NOTICE 'Badge awarding complete!';
  RAISE NOTICE 'Check your app - the badge modals should appear one after another!';
END $$;
