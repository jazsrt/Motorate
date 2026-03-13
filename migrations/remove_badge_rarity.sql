/*
  # Remove Badge Rarity Field

  1. Changes
    - Removes the `rarity` column from the `badges` table
    - This field is no longer used in the badge system

  2. Notes
    - Safe to remove as UI no longer displays or uses rarity
    - All badge logic is now based on category and criteria
*/

-- Remove rarity column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'badges' AND column_name = 'rarity'
  ) THEN
    ALTER TABLE badges DROP COLUMN rarity;
  END IF;
END $$;
