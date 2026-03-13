/*
  # Add Badge SVG Icon Paths

  1. Changes
    - Add `icon_path` column to badges table
    - Update all tiered badges with standardized icon paths
    - Update one-off badges with specific icon paths
    - Update vehicle modification badges with specific icon paths

  2. Naming Convention
    - Tiered badges: {badge_group}-{tier}.svg (e.g., "spotter-gold.svg")
    - One-off badges: {specific-name}.svg (e.g., "welcome.svg")
    - Vehicle mods: {mod-name}.svg (e.g., "turbo-supercharger.svg")

  3. Verification
    - Checks that all badges have icon_path assigned
    - Reports any badges missing icon paths
*/

-- ============================================================================
-- ADD COLUMN
-- ============================================================================

ALTER TABLE badges
ADD COLUMN IF NOT EXISTS icon_path TEXT;

-- ============================================================================
-- TIERED BADGES (bronze/silver/gold/platinum)
-- ============================================================================
-- These follow pattern: {badge_group}-{tier}.svg

UPDATE badges
SET icon_path = LOWER(REPLACE(badge_group, '_', '-')) || '-' || LOWER(tier) || '.svg'
WHERE tier IS NOT NULL
  AND badge_group IS NOT NULL
  AND tier IN ('bronze', 'silver', 'gold', 'platinum');

-- ============================================================================
-- ONE-OFF BADGES (Welcome, Profile Complete, etc.)
-- ============================================================================

UPDATE badges SET icon_path = 'welcome.svg'
WHERE name = 'Welcome' AND category = 'onboarding';

UPDATE badges SET icon_path = 'profile-complete.svg'
WHERE name = 'Profile Complete' AND category = 'onboarding';

UPDATE badges SET icon_path = 'my-first-ride.svg'
WHERE name = 'My First Ride' AND category = 'onboarding';

UPDATE badges SET icon_path = 'first-post.svg'
WHERE name = 'First Post' AND category = 'onboarding';

UPDATE badges SET icon_path = 'first-comment.svg'
WHERE name = 'First Comment' AND category = 'onboarding';

UPDATE badges SET icon_path = 'social-starter.svg'
WHERE name = 'Social Starter' AND category = 'onboarding';

UPDATE badges SET icon_path = 'verified-owner.svg'
WHERE name = 'Verified Owner' AND category = 'onboarding';

-- ============================================================================
-- VEHICLE MODIFICATION BADGES
-- ============================================================================
-- These are single badges (no tiers) for specific mods

UPDATE badges SET icon_path = 'turbo-supercharger.svg'
WHERE name = 'Turbo / Supercharger' AND category = 'vehicle';

UPDATE badges SET icon_path = 'cold-air-intake.svg'
WHERE name = 'Cold Air Intake' AND category = 'vehicle';

UPDATE badges SET icon_path = 'custom-exhaust.svg'
WHERE name = 'Custom Exhaust' AND category = 'vehicle';

UPDATE badges SET icon_path = 'ecu-tune.svg'
WHERE name = 'ECU Tune' AND category = 'vehicle';

UPDATE badges SET icon_path = 'performance-chip.svg'
WHERE name = 'Performance Chip' AND category = 'vehicle';

UPDATE badges SET icon_path = 'nitrous-oxide.svg'
WHERE name = 'Nitrous Oxide System' AND category = 'vehicle';

UPDATE badges SET icon_path = 'headers.svg'
WHERE name = 'Headers' AND category = 'vehicle';

UPDATE badges SET icon_path = 'catalytic-converter.svg'
WHERE name = 'High-Flow Catalytic Converter' AND category = 'vehicle';

UPDATE badges SET icon_path = 'air-filter.svg'
WHERE name = 'Performance Air Filter' AND category = 'vehicle';

UPDATE badges SET icon_path = 'short-shifter.svg'
WHERE name = 'Short Shifter' AND category = 'vehicle';

UPDATE badges SET icon_path = 'custom-paint.svg'
WHERE name = 'Custom Paint' AND category = 'vehicle';

UPDATE badges SET icon_path = 'vinyl-wrap.svg'
WHERE name = 'Vinyl Wrap' AND category = 'vehicle';

UPDATE badges SET icon_path = 'led-lighting.svg'
WHERE name = 'LED Lighting' AND category = 'vehicle';

UPDATE badges SET icon_path = 'window-tint.svg'
WHERE name = 'Window Tint' AND category = 'vehicle';

UPDATE badges SET icon_path = 'body-kit.svg'
WHERE name = 'Body Kit' AND category = 'vehicle';

UPDATE badges SET icon_path = 'custom-wheels.svg'
WHERE name = 'Custom Wheels' AND category = 'vehicle';

UPDATE badges SET icon_path = 'smoked-lights.svg'
WHERE name = 'Smoked Tail Lights' AND category = 'vehicle';

UPDATE badges SET icon_path = 'underglow.svg'
WHERE name = 'Underglow' AND category = 'vehicle';

UPDATE badges SET icon_path = 'decals-stickers.svg'
WHERE name = 'Decals / Stickers' AND category = 'vehicle';

UPDATE badges SET icon_path = 'carbon-fiber.svg'
WHERE name = 'Carbon Fiber Accents' AND category = 'vehicle';

UPDATE badges SET icon_path = 'lowered-suspension.svg'
WHERE name = 'Lowered Suspension' AND category = 'vehicle';

UPDATE badges SET icon_path = 'coilovers.svg'
WHERE name = 'Coilovers' AND category = 'vehicle';

UPDATE badges SET icon_path = 'air-suspension.svg'
WHERE name = 'Air Suspension' AND category = 'vehicle';

UPDATE badges SET icon_path = 'sway-bars.svg'
WHERE name = 'Sway Bars' AND category = 'vehicle';

UPDATE badges SET icon_path = 'performance-tires.svg'
WHERE name = 'Performance Tires' AND category = 'vehicle';

UPDATE badges SET icon_path = 'upgraded-speakers.svg'
WHERE name = 'Upgraded Speakers' AND category = 'vehicle';

UPDATE badges SET icon_path = 'head-unit.svg'
WHERE name = 'Aftermarket Head Unit' AND category = 'vehicle';

UPDATE badges SET icon_path = 'subwoofer.svg'
WHERE name = 'Subwoofer System' AND category = 'vehicle';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Count badges with icons by category
SELECT
  category,
  COUNT(*) as total_badges,
  COUNT(icon_path) as badges_with_icons,
  COUNT(*) - COUNT(icon_path) as missing_icons
FROM badges
GROUP BY category
ORDER BY category;

-- Show any badges still missing icons
SELECT id, name, category, badge_group, tier
FROM badges
WHERE icon_path IS NULL
ORDER BY category, name;

-- Total count verification
SELECT
  COUNT(*) as total_badges,
  COUNT(icon_path) as with_icons,
  COUNT(*) - COUNT(icon_path) as missing_icons
FROM badges;

-- Should show: total_badges: 163+, with_icons: 163+, missing_icons: 0
