/*
  # Badges Schema - Exact Specification

  This migration creates the badges and user_badges tables with the exact schema required.

  1. Backup existing data
  2. Drop and recreate tables
  3. Add indexes and RLS policies

  ## Schema

  ### badges table
  - id (text) - Primary key
  - name (text) - Badge name
  - description (text) - Badge description
  - category (text) - Badge category
  - rarity (text) - Common | Uncommon | Rare | Epic | Legendary
  - icon_name (text) - Icon identifier
  - level (integer) - Badge level (default 1)
  - level_name (text) - Level name (default 'Novice')
  - progression_group (text) - Group for progression
  - created_at (timestamptz) - Creation timestamp

  ### user_badges table
  - id (uuid) - Primary key
  - user_id (uuid) - User who earned the badge
  - badge_id (text) - Badge reference
  - earned_at (timestamptz) - When badge was earned
*/

-- Step 1: Backup existing data
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'badges') THEN
    CREATE TABLE IF NOT EXISTS badges_backup_v2 AS SELECT * FROM badges;
    RAISE NOTICE 'Backed up existing badges table to badges_backup_v2';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_badges') THEN
    CREATE TABLE IF NOT EXISTS user_badges_backup_v2 AS SELECT * FROM user_badges;
    RAISE NOTICE 'Backed up existing user_badges table to user_badges_backup_v2';
  END IF;
END $$;

-- Step 2: Drop existing tables
DROP TABLE IF EXISTS badge_progress CASCADE;
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;

-- Step 3: Create badges table with proper schema
CREATE TABLE badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  rarity TEXT NOT NULL CHECK (rarity IN ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary')),
  icon_name TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  level_name TEXT DEFAULT 'Novice',
  progression_group TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create user_badges table
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Step 5: Create indexes
CREATE INDEX idx_badges_category ON badges(category);
CREATE INDEX idx_badges_rarity ON badges(rarity);
CREATE INDEX idx_badges_progression ON badges(progression_group, level);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);

-- Step 6: Enable RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Step 7: Add policies for badges
CREATE POLICY "Badges are viewable by everyone"
  ON badges
  FOR SELECT
  USING (true);

-- Step 8: Add policies for user_badges
CREATE POLICY "Users can view their own badges"
  ON user_badges
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user badges"
  ON user_badges
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view all earned badges"
  ON user_badges
  FOR SELECT
  USING (true);

-- Step 9: Add comments
COMMENT ON TABLE badges IS 'Badge definitions with progression levels';
COMMENT ON TABLE user_badges IS 'Badges earned by users';
COMMENT ON COLUMN badges.rarity IS 'Badge rarity: Common, Uncommon, Rare, Epic, Legendary';
COMMENT ON COLUMN badges.level IS 'Badge level within progression group';
COMMENT ON COLUMN badges.level_name IS 'Display name for badge level (e.g., Novice, Expert, Master)';
COMMENT ON COLUMN badges.progression_group IS 'Group identifier for multi-level badge progressions';

-- Step 10: Verify schema
DO $$
DECLARE
  badge_count int;
BEGIN
  SELECT COUNT(*) INTO badge_count FROM badges;
  RAISE NOTICE 'Migration complete! Badges in database: %', badge_count;
END $$;
