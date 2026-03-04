-- Check the actual column structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'badges'
ORDER BY ordinal_position;

-- Check sample badges to see their actual tier values
SELECT
  id,
  name,
  category,
  tier,
  badge_group,
  tier_threshold
FROM badges
WHERE category IN ('spotter', 'content-creator', 'onboarding', 'engagement', 'social')
ORDER BY category, tier_threshold
LIMIT 25;
