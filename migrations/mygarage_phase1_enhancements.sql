/*
  # MyGaragePage Phase 1 Database Enhancements

  1. Profile Enhancements
    - Add privacy_level column to profiles
    - Add profile_views_count column to profiles

  2. Vehicle Enhancements
    - Add is_private boolean to vehicles
    - Add modification_count to vehicles

  3. New Tables
    - profile_views: LinkedIn-style profile view tracking
    - vehicle_badges: Junction table for vehicle-specific badge achievements

  4. Functions
    - track_profile_view: Efficient profile view tracking with deduplication
*/

-- Add privacy controls to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS privacy_level TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS profile_views_count INTEGER DEFAULT 0;

-- Add privacy and badge tracking to vehicles
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS modification_count INTEGER DEFAULT 0;

-- Create profile_views tracking table (LinkedIn-style)
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  view_date DATE DEFAULT CURRENT_DATE
);

-- Create unique index to prevent duplicate views per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_views_unique_daily
ON profile_views(profile_id, viewer_id, view_date);

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profile_views_profile
ON profile_views(profile_id, viewed_at DESC);

-- Enable RLS
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_views
CREATE POLICY "Users can view their own profile views"
  ON profile_views FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Anyone can track profile views"
  ON profile_views FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create vehicle_badges junction table
CREATE TABLE IF NOT EXISTS vehicle_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  sticker_count INTEGER DEFAULT 0,
  UNIQUE(vehicle_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_badges_vehicle
ON vehicle_badges(vehicle_id);

-- Enable RLS
ALTER TABLE vehicle_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicle_badges
CREATE POLICY "Anyone can view vehicle badges"
  ON vehicle_badges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vehicle owners can manage their badges"
  ON vehicle_badges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_badges.vehicle_id
      AND vehicles.user_id = auth.uid()
    )
  );

-- Function to track profile views
CREATE OR REPLACE FUNCTION track_profile_view(
  p_profile_id UUID,
  p_viewer_id UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO profile_views (profile_id, viewer_id, view_date)
  VALUES (p_profile_id, p_viewer_id, CURRENT_DATE)
  ON CONFLICT (profile_id, viewer_id, view_date) DO NOTHING;

  -- Update count
  UPDATE profiles
  SET profile_views_count = (
    SELECT COUNT(DISTINCT viewer_id)
    FROM profile_views
    WHERE profile_id = p_profile_id
  )
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
