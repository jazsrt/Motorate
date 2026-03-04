-- Check the actual structure of the notifications table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
AND table_schema = 'public'
ORDER BY ordinal_position;
