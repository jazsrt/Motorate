-- Get actual columns in badges table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'badges'
ORDER BY ordinal_position;
