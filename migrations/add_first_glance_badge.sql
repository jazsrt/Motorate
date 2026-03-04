/*
  # Add First Glance Badge

  1. Changes
    - Adds "First Glance" badge (threshold = 1 spot)
    - This is the first badge users earn
    - Bronze tier, spotter category

  2. Security
    - No RLS changes needed (badges table already configured)
*/

-- Insert First Glance badge
INSERT INTO badges (
  id, name, description, category, icon,
  level, level_name, progression_group, badge_group,
  tier_threshold, earning_method, tier
)
VALUES
  (
    'spotter-0',
    'First Glance',
    'Spot your first vehicle',
    'spotter',
    'eye',
    0,
    'Bronze',
    'spotter',
    'spotter',
    1,
    'tiered_activity',
    'bronze'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier_threshold = EXCLUDED.tier_threshold,
  tier = EXCLUDED.tier;
