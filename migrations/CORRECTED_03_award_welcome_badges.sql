/*
  =====================================================
  MIGRATION 3: Award Welcome Badges to Existing Users
  =====================================================

  What this does:
  - Awards "welcome" badge to all existing users
  - Retroactively awards badges for users who already have posts/vehicles
  - Does NOT duplicate badges (uses ON CONFLICT)

  Safe to run multiple times - will only award badges once per user
*/

-- Award "welcome" badge to all users who don't have it
INSERT INTO user_badges (user_id, badge_id, earned_at)
SELECT
  id,
  'welcome',
  NOW()
FROM profiles
WHERE id NOT IN (
  SELECT user_id FROM user_badges WHERE badge_id = 'welcome'
)
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Award "first-post" to users with at least 1 post
INSERT INTO user_badges (user_id, badge_id, earned_at)
SELECT
  author_id,
  'first-post',
  NOW()
FROM posts
WHERE author_id IN (
  SELECT author_id
  FROM posts
  GROUP BY author_id
  HAVING COUNT(*) >= 1
)
AND author_id NOT IN (
  SELECT user_id FROM user_badges WHERE badge_id = 'first-post'
)
GROUP BY author_id
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Award "my-first-ride" to users with at least 1 vehicle
INSERT INTO user_badges (user_id, badge_id, earned_at)
SELECT
  owner_id,
  'my-first-ride',
  NOW()
FROM vehicles
WHERE owner_id IS NOT NULL
AND owner_id IN (
  SELECT owner_id
  FROM vehicles
  WHERE owner_id IS NOT NULL
  GROUP BY owner_id
  HAVING COUNT(*) >= 1
)
AND owner_id NOT IN (
  SELECT user_id FROM user_badges WHERE badge_id = 'my-first-ride'
)
GROUP BY owner_id
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Award "profile-complete" to users with bio and avatar
INSERT INTO user_badges (user_id, badge_id, earned_at)
SELECT
  id,
  'profile-complete',
  NOW()
FROM profiles
WHERE bio IS NOT NULL
  AND bio != ''
  AND avatar_url IS NOT NULL
AND id NOT IN (
  SELECT user_id FROM user_badges WHERE badge_id = 'profile-complete'
)
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Award "social-starter" to users with at least 1 follower
INSERT INTO user_badges (user_id, badge_id, earned_at)
SELECT
  following_id,
  'social-starter',
  NOW()
FROM follows
WHERE following_id IN (
  SELECT following_id
  FROM follows
  GROUP BY following_id
  HAVING COUNT(*) >= 1
)
AND following_id NOT IN (
  SELECT user_id FROM user_badges WHERE badge_id = 'social-starter'
)
GROUP BY following_id
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Show results
SELECT
  b.name,
  COUNT(ub.id) as users_with_badge
FROM badges b
LEFT JOIN user_badges ub ON b.id = ub.badge_id
WHERE b.category = 'onboarding'
GROUP BY b.name, b.id
ORDER BY b.name;
