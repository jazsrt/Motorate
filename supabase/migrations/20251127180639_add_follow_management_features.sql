/*
  # Follow System Enhancements

  1. Updates to follows table
    - Add muted column (boolean) - hide user's posts from feed
    - Add favorite column (boolean) - prioritize user's posts in feed
    - Add indexes for performance

  2. New blocks table
    - blocker_id (uuid, references profiles) - user who blocked
    - blocked_id (uuid, references profiles) - user who was blocked
    - created_at (timestamp)
    - Unique constraint on blocker_id + blocked_id
    - Indexes for both directions

  3. Security
    - Enable RLS on blocks table
    - Add policies for authenticated users
*/

-- Add muted and favorite columns to follows table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follows' AND column_name = 'muted'
  ) THEN
    ALTER TABLE follows ADD COLUMN muted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follows' AND column_name = 'favorite'
  ) THEN
    ALTER TABLE follows ADD COLUMN favorite boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_follows_muted ON follows(follower_id, muted) WHERE muted = true;
CREATE INDEX IF NOT EXISTS idx_follows_favorite ON follows(follower_id, favorite) WHERE favorite = true;

-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Create indexes on blocks table
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocks_both ON blocks(blocker_id, blocked_id);

-- Enable RLS on blocks table
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Policies for blocks table

-- Users can view their own blocks (who they blocked)
CREATE POLICY "Users can view own blocks"
  ON blocks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Users can view who blocked them
CREATE POLICY "Users can view blocks against them"
  ON blocks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocked_id);

-- Users can create blocks
CREATE POLICY "Users can block others"
  ON blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

-- Users can delete their own blocks (unblock)
CREATE POLICY "Users can unblock"
  ON blocks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_blocked(viewer_id uuid, author_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = viewer_id AND blocked_id = author_id)
       OR (blocker_id = author_id AND blocked_id = viewer_id)
  );
$$;
