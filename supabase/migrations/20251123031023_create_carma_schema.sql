/*
  # MOTORATED DATABASE SCHEMA v1.0

  This migration creates the complete database structure for MotoRated - a privacy-first,
  gamified vehicle reputation platform ("Yelp for Cars").
  
  ## Key Features
  - Shadow Profiles: Vehicles can exist without owners (owner_id = NULL)
  - God Mode: Owners can moderate reviews based on claim timing
  - Gamification: Badge inventory system with scarcity mechanics
  
  ## Tables Created
  
  1. **profiles** - Extended user profiles
     - id: References auth.users
     - handle: Unique username
     - avatar_url: Profile picture
     - reputation_score: Gamification score
     - created_at: Timestamp
  
  2. **vehicles** - Vehicle records (supports shadow state)
     - id: UUID primary key
     - owner_id: NULL for unclaimed vehicles
     - plate_hash: SHA-256 hash of state+plate (NEVER plaintext)
     - make, model, year, color: Vehicle details
     - stock_image_url: Default vehicle image
     - is_claimed: Whether vehicle has been claimed by owner
     - claimed_at: Timestamp of claim (critical for God Mode)
  
  3. **reviews** - Core content (ratings and comments)
     - vehicle_id: Links to vehicles
     - author_id: Links to profiles
     - text: Review content
     - driver_score: 0-100 safety rating
     - cool_score: 0-100 aesthetics rating
     - location_label: Fuzzy location (no precise coords)
     - image_url: Optional photo
     - is_hidden_by_owner: Owner moderation flag
     - is_pre_claim: Calculated flag for God Mode
  
  4. **badges** - Badge definitions
     - name: Badge display name
     - icon: Emoji or URL
     - type: 'good', 'bad', or 'landmark'
     - monthly_limit: -1 for unlimited, otherwise scarcity count
  
  5. **user_inventory** - User's badge collection (The Glovebox)
     - user_id: Owner of badges
     - badge_id: Badge reference
     - count_remaining: Available uses
     - last_reset: For monthly refresh logic
  
  6. **modifications** - Vehicle build sheet
     - vehicle_id: Links to vehicles
     - category: Powertrain, Suspension, Aero, Interior
     - part_name: Modification description
     - is_verified: Verification status
  
  ## Security (RLS)
  - All tables have Row Level Security enabled
  - God Mode policy: Owners can delete pre-claim reviews
  - Public can view non-hidden reviews
  - Authenticated users can manage their own content
  
  ## Important Notes
  - License plates are NEVER stored in plaintext - only SHA-256 hashes
  - Location data must be fuzzed (~1km) and delayed (60 mins) in application layer
  - Shadow profiles (owner_id = NULL) allow community to rate unclaimed vehicles
*/

-- 1. PROFILES (Extended User Information)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  handle text UNIQUE,
  avatar_url text,
  reputation_score int DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 2. VEHICLES (Core Entity - Supports Shadow State)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  plate_hash text NOT NULL UNIQUE,
  make text,
  model text,
  year int,
  color text,
  stock_image_url text,
  is_claimed boolean DEFAULT false,
  claimed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vehicles"
  ON public.vehicles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can create shadow vehicles"
  ON public.vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id IS NULL);

CREATE POLICY "Owners can update their vehicles"
  ON public.vehicles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 3. REVIEWS (The Core Content)
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  text text,
  driver_score int CHECK (driver_score >= 0 AND driver_score <= 100),
  cool_score int CHECK (cool_score >= 0 AND cool_score <= 100),
  location_label text,
  image_url text,
  is_hidden_by_owner boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-hidden reviews"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (is_hidden_by_owner = false);

CREATE POLICY "Authors can insert reviews"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own reviews"
  ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete own reviews"
  ON public.reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Owners can delete pre-claim reviews (God Mode)"
  ON public.reviews
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = reviews.vehicle_id
        AND vehicles.owner_id = auth.uid()
        AND vehicles.claimed_at > reviews.created_at
    )
  );

CREATE POLICY "Owners can hide reviews on their vehicles"
  ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = reviews.vehicle_id
        AND vehicles.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = reviews.vehicle_id
        AND vehicles.owner_id = auth.uid()
    )
  );

-- 4. BADGES (Gamification Definitions)
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL,
  type text CHECK (type IN ('good', 'bad', 'landmark')),
  monthly_limit int DEFAULT -1,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges"
  ON public.badges
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. USER INVENTORY (The Glovebox)
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id uuid REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  count_remaining int DEFAULT 0,
  last_reset timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory"
  ON public.user_inventory
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory"
  ON public.user_inventory
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory"
  ON public.user_inventory
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. MODIFICATIONS (Build Sheet)
CREATE TABLE IF NOT EXISTS public.modifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  category text,
  part_name text NOT NULL,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.modifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view modifications"
  ON public.modifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vehicle owners can manage modifications"
  ON public.modifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = modifications.vehicle_id
        AND vehicles.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = modifications.vehicle_id
        AND vehicles.owner_id = auth.uid()
    )
  );

-- Seed some initial badges
INSERT INTO public.badges (name, icon, type, monthly_limit) VALUES
  ('Lane Hog', '🐌', 'bad', 3),
  ('No Signal', '❌', 'bad', 3),
  ('Tailgater', '😤', 'bad', 3),
  ('Clean Whip', '✨', 'good', -1),
  ('Courtesy Wave', '👋', 'good', -1),
  ('Smooth Driver', '🧈', 'good', -1),
  ('Show Car', '🏆', 'good', -1)
ON CONFLICT DO NOTHING;