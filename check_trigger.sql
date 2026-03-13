-- Check if the badge notification trigger exists
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_badges'
    AND trigger_name = 'on_badge_awarded_notify';

-- Check if the trigger function exists
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'notify_badge_award';
