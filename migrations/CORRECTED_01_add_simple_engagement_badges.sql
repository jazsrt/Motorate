/*
  =====================================================
  MIGRATION 1: Add Simple Engagement Badges
  =====================================================

  What this does:
  - Adds 5 basic engagement badges that can be auto-awarded
  - These are simple, one-off badges (not tiered)
  - Each badge has a clear trigger condition

  Badges added:
  1. Welcome - Sign up and create profile
  2. First Post - Create your first post
  3. Profile Complete - Fill out bio and avatar
  4. My First Ride - Add your first vehicle
  5. Social Starter - Get your first follower

  SAFE TO RUN: Uses ON CONFLICT to prevent duplicates
*/

-- Add simple engagement badges
INSERT INTO badges (
  id,
  name,
  description,
  category,
  icon_name,
  level,
  level_name,
  progression_group,
  icon_path
) VALUES
  (
    'welcome',
    'Welcome',
    'Welcome to MotoRated!',
    'onboarding',
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
  icon_name = EXCLUDED.icon_name,
  level = EXCLUDED.level,
  level_name = EXCLUDED.level_name,
  progression_group = EXCLUDED.progression_group,
  icon_path = EXCLUDED.icon_path;

-- Verify badges were added
SELECT id, name, description, category
FROM badges
WHERE category = 'onboarding'
ORDER BY name;
