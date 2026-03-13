/*
  # Bumper Sticker System Migration

  This migration creates the bumper sticker system for MotoRated.

  ## Tables Created

  1. **bumper_stickers** - Sticker definitions (the catalog of available stickers)
     - id: UUID primary key
     - name: Sticker display name
     - description: What this sticker means
     - icon_name: Lucide icon name for display
     - category: 'Positive', 'Negative', 'Fun', or 'Community'
     - color: Hex color code for theming
     - created_at: Timestamp

  2. **vehicle_stickers** - Junction table linking vehicles to stickers given by users
     - id: UUID primary key
     - vehicle_id: References vehicles table
     - sticker_id: References bumper_stickers table
     - given_by: References profiles table (user who gave the sticker)
     - created_at: Timestamp
     - UNIQUE constraint on (vehicle_id, sticker_id, given_by) - prevents duplicate gifts

  ## Security
  - RLS enabled on both tables
  - Anyone can view stickers
  - Only authenticated users can give stickers
  - Users cannot give the same sticker twice to the same vehicle
*/

-- 1. CREATE BUMPER_STICKERS TABLE (Sticker Definitions)
CREATE TABLE IF NOT EXISTS public.bumper_stickers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('Positive', 'Negative', 'Fun', 'Community')),
  color text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.bumper_stickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bumper stickers"
  ON public.bumper_stickers
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. CREATE VEHICLE_STICKERS TABLE (Junction Table)
CREATE TABLE IF NOT EXISTS public.vehicle_stickers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  sticker_id uuid REFERENCES public.bumper_stickers(id) ON DELETE CASCADE NOT NULL,
  given_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(vehicle_id, sticker_id, given_by)
);

ALTER TABLE public.vehicle_stickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vehicle stickers"
  ON public.vehicle_stickers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can give stickers"
  ON public.vehicle_stickers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = given_by);

CREATE POLICY "Users can delete their own stickers"
  ON public.vehicle_stickers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = given_by);

-- 3. SEED INITIAL STICKER DEFINITIONS
INSERT INTO public.bumper_stickers (name, description, icon_name, category, color) VALUES
-- Positive stickers
('Clean Machine', 'Spotless and well-maintained vehicle', 'Sparkles', 'Positive', '#10b981'),
('Smooth Operator', 'Excellent driving skills', 'Gauge', 'Positive', '#3b82f6'),
('Road Angel', 'Courteous and helpful driver', 'Heart', 'Positive', '#ec4899'),
('Speed Demon', 'Fast but responsible driver', 'Zap', 'Positive', '#f59e0b'),
('Parking Pro', 'Expert at parking', 'Target', 'Positive', '#8b5cf6'),

-- Negative stickers
('Lead Foot', 'Tends to speed excessively', 'AlertTriangle', 'Negative', '#ef4444'),
('Lane Hog', 'Doesn''t stay in their lane', 'AlertCircle', 'Negative', '#dc2626'),
('Tailgater', 'Follows too closely', 'ArrowDown', 'Negative', '#991b1b'),
('No Signal', 'Forgets to use turn signals', 'X', 'Negative', '#7f1d1d'),
('Parking Fail', 'Poor parking skills', 'Ban', 'Negative', '#b91c1c'),

-- Fun stickers
('Show Off', 'Loves to rev and show their ride', 'Star', 'Fun', '#f97316'),
('Bass Boosted', 'Music loud enough to rattle windows', 'Music', 'Fun', '#a855f7'),
('Rolling Coal', 'Excessive exhaust emissions', 'Cloud', 'Fun', '#64748b'),
('Sticker Bomber', 'Vehicle covered in stickers', 'Sticker', 'Fun', '#06b6d4'),
('Mod Squad', 'Heavily modified vehicle', 'Wrench', 'Fun', '#14b8a6'),

-- Community stickers
('Car Meet Regular', 'Frequent car meet attendee', 'Users', 'Community', '#0ea5e9'),
('Track Star', 'Regular at the race track', 'Flag', 'Community', '#6366f1'),
('Charity Cruiser', 'Participates in charity events', 'Gift', 'Community', '#84cc16'),
('Local Legend', 'Well-known in the car community', 'Crown', 'Community', '#eab308'),
('Mentor', 'Helps new car enthusiasts', 'GraduationCap', 'Community', '#22c55e')
ON CONFLICT DO NOTHING;

-- 4. CREATE INDEX FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_vehicle_stickers_vehicle_id ON public.vehicle_stickers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_stickers_given_by ON public.vehicle_stickers(given_by);
CREATE INDEX IF NOT EXISTS idx_vehicle_stickers_sticker_id ON public.vehicle_stickers(sticker_id);
