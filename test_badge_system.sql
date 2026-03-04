-- =========================================
-- BADGE SYSTEM COMPREHENSIVE TEST SCRIPT
-- =========================================
-- This script tests the badge notification system by:
-- 1. Checking existing badge awards and notifications
-- 2. Simulating user actions to trigger badge awards
-- 3. Verifying that notifications are properly created
-- =========================================

-- Step 1: Check existing badge awards and their notifications
\echo '========================================'
\echo 'STEP 1: Checking existing badge awards'
\echo '========================================'

SELECT
    ub.id as user_badge_id,
    ub.user_id,
    ub.badge_id,
    ub.awarded_at,
    b.name as badge_name,
    b.category,
    n.id as notification_id,
    n.type as notification_type,
    n.created_at as notification_created,
    n.is_read
FROM user_badges ub
LEFT JOIN badges b ON ub.badge_id = b.id
LEFT JOIN notifications n ON n.link_id = ub.badge_id::text
    AND n.type = 'badge_awarded'
    AND n.user_id = ub.user_id
ORDER BY ub.awarded_at DESC
LIMIT 10;

\echo ''
\echo 'Badge awards without notifications:'
SELECT
    ub.id as user_badge_id,
    ub.user_id,
    ub.badge_id,
    b.name as badge_name,
    ub.awarded_at
FROM user_badges ub
JOIN badges b ON ub.badge_id = b.id
LEFT JOIN notifications n ON n.link_id = ub.badge_id::text
    AND n.type = 'badge_awarded'
    AND n.user_id = ub.user_id
WHERE n.id IS NULL
ORDER BY ub.awarded_at DESC
LIMIT 20;

-- Step 2: Get statistics
\echo ''
\echo '========================================'
\echo 'STEP 2: Statistics'
\echo '========================================'

SELECT
    COUNT(*) as total_badge_awards
FROM user_badges;

SELECT
    COUNT(*) as total_badge_notifications
FROM notifications
WHERE type = 'badge_awarded';

SELECT
    COUNT(DISTINCT ub.id) as badges_without_notifications
FROM user_badges ub
LEFT JOIN notifications n ON n.link_id = ub.badge_id::text
    AND n.type = 'badge_awarded'
    AND n.user_id = ub.user_id
WHERE n.id IS NULL;

-- Step 3: Check badge system functions
\echo ''
\echo '========================================'
\echo 'STEP 3: Checking badge system functions'
\echo '========================================'

SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name LIKE '%badge%'
ORDER BY routine_name;

-- Step 4: Check triggers on user_badges table
\echo ''
\echo '========================================'
\echo 'STEP 4: Checking triggers'
\echo '========================================'

SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_badges'
ORDER BY trigger_name;

-- Step 5: Test badge award with notification (SIMULATION)
-- NOTE: This is a simulation only - we'll check if a test user exists first
\echo ''
\echo '========================================'
\echo 'STEP 5: Preparing to test badge award'
\echo '========================================'

-- Find the first user in the system
DO $$
DECLARE
    v_test_user_id uuid;
    v_test_badge_id uuid;
    v_existing_award_count integer;
    v_notification_before integer;
    v_notification_after integer;
BEGIN
    -- Get first user
    SELECT id INTO v_test_user_id
    FROM profiles
    LIMIT 1;

    IF v_test_user_id IS NULL THEN
        RAISE NOTICE 'No users found in the system. Cannot run badge award test.';
        RETURN;
    END IF;

    -- Get a badge that the user doesn't have yet (preferably First Glance)
    SELECT id INTO v_test_badge_id
    FROM badges
    WHERE name = 'First Glance'
        AND id NOT IN (
            SELECT badge_id FROM user_badges WHERE user_id = v_test_user_id
        )
    LIMIT 1;

    IF v_test_badge_id IS NULL THEN
        -- Try to find any badge they don't have
        SELECT id INTO v_test_badge_id
        FROM badges
        WHERE id NOT IN (
            SELECT badge_id FROM user_badges WHERE user_id = v_test_user_id
        )
        LIMIT 1;
    END IF;

    IF v_test_badge_id IS NULL THEN
        RAISE NOTICE 'User % already has all badges. Cannot test new badge award.', v_test_user_id;
        RETURN;
    END IF;

    -- Count existing notifications before
    SELECT COUNT(*) INTO v_notification_before
    FROM notifications
    WHERE user_id = v_test_user_id AND type = 'badge_awarded';

    RAISE NOTICE 'Testing badge award for user: %', v_test_user_id;
    RAISE NOTICE 'Badge to award: %', v_test_badge_id;
    RAISE NOTICE 'Notifications before: %', v_notification_before;

    -- Award the badge (this should trigger the notification)
    INSERT INTO user_badges (user_id, badge_id, awarded_at)
    VALUES (v_test_user_id, v_test_badge_id, NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING;

    -- Count notifications after
    SELECT COUNT(*) INTO v_notification_after
    FROM notifications
    WHERE user_id = v_test_user_id AND type = 'badge_awarded';

    RAISE NOTICE 'Notifications after: %', v_notification_after;
    RAISE NOTICE 'New notifications created: %', (v_notification_after - v_notification_before);

    IF v_notification_after > v_notification_before THEN
        RAISE NOTICE 'SUCCESS: Badge notification was created!';
    ELSE
        RAISE NOTICE 'WARNING: No notification was created. Check trigger setup.';
    END IF;

END $$;

-- Step 6: Final verification - show the most recent badge notification
\echo ''
\echo '========================================'
\echo 'STEP 6: Most recent badge notifications'
\echo '========================================'

SELECT
    n.id,
    n.user_id,
    n.type,
    n.title,
    n.message,
    n.link_id as badge_id,
    n.is_read,
    n.created_at,
    b.name as badge_name
FROM notifications n
LEFT JOIN badges b ON b.id::text = n.link_id
WHERE n.type = 'badge_awarded'
ORDER BY n.created_at DESC
LIMIT 5;
