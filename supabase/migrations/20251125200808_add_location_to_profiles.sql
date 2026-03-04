/*
  # Add location field to profiles table

  1. Changes
    - Add `location` column to profiles table to store user location
  
  2. Notes
    - Location is optional (nullable)
    - No security changes needed as existing RLS policies cover this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE profiles ADD COLUMN location text;
  END IF;
END $$;
