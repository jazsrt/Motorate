-- Check existing badge awards and their notifications
SELECT
    ub.id as user_badge_id,
    ub.user_id,
    ub.badge_id,
    ub.awarded_at,
    b.name as badge_name,
    n.id as notification_id,
    n.type as notification_type,
    n.created_at as notification_created
FROM user_badges ub
LEFT JOIN badges b ON ub.badge_id = b.id
LEFT JOIN notifications n ON n.reference_id = ub.id::text AND n.type = 'badge_earned'
ORDER BY ub.awarded_at DESC
LIMIT 10;

-- Check total badge awards
SELECT COUNT(*) as total_badge_awards FROM user_badges;

-- Check total badge notifications
SELECT COUNT(*) as total_badge_notifications FROM notifications WHERE type = 'badge_earned';

-- Check badges without notifications
SELECT
    ub.id as user_badge_id,
    ub.user_id,
    ub.badge_id,
    b.name as badge_name,
    ub.awarded_at
FROM user_badges ub
JOIN badges b ON ub.badge_id = b.id
LEFT JOIN notifications n ON n.reference_id = ub.id::text AND n.type = 'badge_earned'
WHERE n.id IS NULL
ORDER BY ub.awarded_at DESC
LIMIT 20;
