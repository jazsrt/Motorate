/*
  # Add Profile Analytics Schema

  1. New Tables
    - `profile_views` - Track profile page views
  
  2. New Columns
    - `profiles.avg_driver_rating` - Average driver rating
    - `profiles.driver_rating_count` - Number of driver ratings

  3. New Functions
    - `get_profile_view_stats` - Get profile view statistics
    - `get_recent_visitors` - Get recent profile visitors

  4. Security
    - Enable RLS on profile_views table
    - Add policies for authenticated users
*/

-- Add missing columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avg_driver_rating'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avg_driver_rating numeric(3,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'driver_rating_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN driver_rating_count int DEFAULT 0;
  END IF;
END $$;

-- Create profile_views table
CREATE TABLE IF NOT EXISTS profile_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_daily_view UNIQUE (viewer_id, viewed_profile_id, viewed_at::date)
);

ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile views"
  ON profile_views FOR SELECT
  TO authenticated
  USING (auth.uid() = viewed_profile_id);

CREATE POLICY "Authenticated users can insert profile views"
  ON profile_views FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_profile 
  ON profile_views(viewed_profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewer 
  ON profile_views(viewer_id);

-- Function to get profile view stats
CREATE OR REPLACE FUNCTION get_profile_view_stats(profile_id uuid)
RETURNS TABLE (
  total_views bigint,
  views_last_7_days bigint,
  unique_visitors bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_views,
    COUNT(*) FILTER (WHERE viewed_at >= NOW() - INTERVAL '7 days')::bigint as views_last_7_days,
    COUNT(DISTINCT viewer_id)::bigint as unique_visitors
  FROM profile_views
  WHERE viewed_profile_id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent visitors
CREATE OR REPLACE FUNCTION get_recent_visitors(profile_id uuid, days int DEFAULT 7)
RETURNS TABLE (
  visitor_id uuid,
  visitor_handle text,
  visitor_avatar_url text,
  visitor_is_private boolean,
  last_visit timestamptz,
  visit_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pv.viewer_id,
    p.handle,
    p.avatar_url,
    COALESCE(p.is_private, false) as visitor_is_private,
    MAX(pv.viewed_at) as last_visit,
    COUNT(*)::bigint as visit_count
  FROM profile_views pv
  JOIN profiles p ON p.id = pv.viewer_id
  WHERE pv.viewed_profile_id = profile_id
    AND pv.viewed_at >= NOW() - (days || ' days')::interval
    AND pv.viewer_id IS NOT NULL
  GROUP BY pv.viewer_id, p.handle, p.avatar_url, p.is_private
  ORDER BY last_visit DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
