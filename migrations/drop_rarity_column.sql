-- Migration: Drop rarity column from badges table
-- Date: 2026-03-28
-- Reason: Rarity system (Common/Uncommon/Rare/Epic/Legendary) is being replaced
--         entirely by the tier system (Bronze/Silver/Gold/Platinum).
--         The rarity column is no longer read or written by the app.

-- Step 1: Drop the CHECK constraint and column
DO $$
BEGIN
  -- Drop index if it exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'badges' AND indexname = 'idx_badges_rarity'
  ) THEN
    DROP INDEX idx_badges_rarity;
  END IF;

  -- Drop column if it exists (CASCADE drops the CHECK constraint too)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badges' AND column_name = 'rarity'
  ) THEN
    ALTER TABLE badges DROP COLUMN rarity CASCADE;
  END IF;
END $$;

-- Step 2: Verify column is gone
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badges' AND column_name = 'rarity'
  ) THEN
    RAISE EXCEPTION 'rarity column still exists on badges table — migration failed';
  END IF;
END $$;
