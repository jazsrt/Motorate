/*
  # Garage Enhancements - Complete Database Updates

  1. New Columns
    - `profiles.pinned_badges` (jsonb) - Array of up to 3 badge IDs to display on profile
    - `profiles.followers_last_week` (int) - Follower count from last week for delta calculation
    - `vehicles.owners_manual_url` (text) - URL to uploaded owner's manual PDF

  2. Security
    - All tables already have RLS enabled
    - Existing policies cover new columns

  3. Indexes
    - Add index on pinned_badges for faster profile queries
*/

-- Add pinned badges support (max 3 badges)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'pinned_badges'
  ) THEN
    ALTER TABLE profiles ADD COLUMN pinned_badges JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add follower tracking for weekly delta
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'followers_last_week'
  ) THEN
    ALTER TABLE profiles ADD COLUMN followers_last_week INT DEFAULT 0;
  END IF;
END $$;

-- Add owner's manual URL support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'owners_manual_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN owners_manual_url TEXT;
  END IF;
END $$;

-- Add index for pinned badges lookup
CREATE INDEX IF NOT EXISTS idx_profiles_pinned_badges ON profiles USING gin (pinned_badges);

-- Add constraint to ensure max 3 pinned badges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_max_3_pinned_badges'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_max_3_pinned_badges
      CHECK (jsonb_array_length(pinned_badges) <= 3);
  END IF;
END $$;
