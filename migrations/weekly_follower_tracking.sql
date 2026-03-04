/*
  # Weekly Follower Tracking System

  1. New Features
    - Automatic weekly snapshot of follower counts
    - Scheduled job runs every Sunday at midnight UTC
    - Updates followers_last_week for all profiles

  2. Implementation
    - Uses pg_cron extension for scheduling
    - Function to update follower snapshots
    - Scheduled job configuration
*/

-- Enable pg_cron extension (requires superuser, already enabled in Supabase)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to update follower snapshots
CREATE OR REPLACE FUNCTION update_follower_snapshots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update all profiles with current follower count
  UPDATE profiles
  SET followers_last_week = (
    SELECT COUNT(*)
    FROM follows
    WHERE follows.following_id = profiles.id
  ),
  updated_at = now();

  -- Log the execution
  RAISE NOTICE 'Updated follower snapshots for % profiles', (SELECT COUNT(*) FROM profiles);
END;
$$;

-- Create a scheduled job to run every Sunday at midnight UTC
-- Note: In Supabase, you need to use their dashboard to schedule this
-- or use the SQL editor to create the cron job

-- For Supabase, schedule via SQL:
SELECT cron.schedule(
  'update-follower-snapshots',
  '0 0 * * 0', -- Every Sunday at midnight UTC
  $$SELECT update_follower_snapshots();$$
);

-- Initialize followers_last_week for existing profiles
-- This sets the baseline to current follower count
UPDATE profiles
SET followers_last_week = (
  SELECT COUNT(*)
  FROM follows
  WHERE follows.following_id = profiles.id
)
WHERE followers_last_week IS NULL;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_follower_snapshots() TO authenticated;
GRANT EXECUTE ON FUNCTION update_follower_snapshots() TO service_role;
