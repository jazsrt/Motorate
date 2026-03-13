-- Backfill Badge Notifications
-- This script creates notifications for all existing badge awards that don't have them yet

-- First, check if notifications exist for the user's badges
SELECT
  ub.user_id,
  ub.badge_id,
  b.name as badge_name,
  ub.awarded_at,
  (SELECT COUNT(*) FROM notifications n
   WHERE n.user_id = ub.user_id
   AND n.type = 'badge_awarded'
   AND n.link_id = ub.badge_id) as notification_count
FROM user_badges ub
JOIN badges b ON b.id = ub.badge_id
WHERE ub.user_id IN (
  SELECT id FROM profiles WHERE handle = 'jazsrt'
)
ORDER BY ub.awarded_at DESC;

-- Create notifications for badges that don't have them
INSERT INTO notifications (
  user_id,
  type,
  title,
  message,
  link_type,
  link_id,
  is_read,
  created_at
)
SELECT
  ub.user_id,
  'badge_awarded' as type,
  'New Badge Unlocked!' as title,
  'You earned the ' || b.name || ' badge! ' || COALESCE(b.description, '') as message,
  'badge' as link_type,
  ub.badge_id as link_id,
  false as is_read,
  ub.awarded_at as created_at
FROM user_badges ub
JOIN badges b ON b.id = ub.badge_id
WHERE ub.user_id IN (
  SELECT id FROM profiles WHERE handle = 'jazsrt'
)
AND NOT EXISTS (
  SELECT 1 FROM notifications n
  WHERE n.user_id = ub.user_id
  AND n.type = 'badge_awarded'
  AND n.link_id = ub.badge_id
);

-- Verify notifications were created
SELECT
  n.id,
  n.type,
  n.title,
  n.is_read,
  n.created_at,
  n.link_id as badge_id,
  b.name as badge_name
FROM notifications n
LEFT JOIN badges b ON b.id = n.link_id
WHERE n.user_id IN (
  SELECT id FROM profiles WHERE handle = 'jazsrt'
)
AND n.type = 'badge_awarded'
ORDER BY n.created_at DESC;
