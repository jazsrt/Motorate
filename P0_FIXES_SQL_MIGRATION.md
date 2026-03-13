# P0 Fixes - SQL Migration Required

This document contains the SQL migration script needed to support the Priority 0 fixes implemented.

## What This Migration Does

1. Creates the `retired_vehicles` table to support the "Lifetime Rides" feature
2. Enables Row Level Security (RLS) with appropriate policies
3. Creates indexes for optimal query performance

## Migration Script

Run this SQL script in your Supabase SQL Editor:

```sql
/*
  # Add Retired Vehicles (Lifetime Rides)

  1. New Tables
    - `retired_vehicles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `year` (integer)
      - `make` (text)
      - `model` (text)
      - `trim` (text, optional)
      - `ownership_period` (text)
      - `notes` (text, optional)
      - `retired_at` (timestamptz)
      - `spots_count` (integer, default 0)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `retired_vehicles` table
    - Add policies for authenticated users to manage their own retired vehicles
    - Add policy for users to view their own retired vehicles

  3. Purpose
    - Allow users to add vehicles from their past to showcase automotive journey
    - Support "Lifetime Rides" section in garage
    - Track historical ownership without claiming active vehicles
*/

-- Create retired_vehicles table
CREATE TABLE IF NOT EXISTS public.retired_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  trim text,
  ownership_period text,
  notes text,
  retired_at timestamptz DEFAULT now() NOT NULL,
  spots_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.retired_vehicles ENABLE ROW LEVEL SECURITY;

-- Users can view their own retired vehicles
CREATE POLICY "Users can view own retired vehicles"
  ON public.retired_vehicles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own retired vehicles
CREATE POLICY "Users can insert own retired vehicles"
  ON public.retired_vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own retired vehicles
CREATE POLICY "Users can update own retired vehicles"
  ON public.retired_vehicles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own retired vehicles
CREATE POLICY "Users can delete own retired vehicles"
  ON public.retired_vehicles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_retired_vehicles_user_id ON public.retired_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_retired_vehicles_retired_at ON public.retired_vehicles(retired_at DESC);
```

## Steps to Apply

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Create a new query
4. Copy and paste the entire SQL script above
5. Run the query
6. Verify success in the Table Editor

## What This Enables

After running this migration:

- Users can retire active vehicles from their garage
- Retired vehicles appear in the "Lifetime Rides" section
- Users can manually add vehicles from their past
- All retired vehicle data is secured with RLS policies
- Fast queries via indexed columns

## Files Modified

The following files have been updated to work with this migration:

1. `src/components/RetireVehicleModal.tsx` - NEW: Modal for retiring active vehicles
2. `src/components/AddRetiredVehicleModal.tsx` - EXISTING: Modal for manually adding past vehicles
3. `src/pages/MyGaragePage.tsx` - UPDATED: Added retire button and modal integration

## Testing After Migration

1. Go to My Garage page
2. Click the 3-dot menu on any active vehicle
3. Click "Retire Vehicle"
4. Fill out the retirement form
5. Verify the vehicle moves to "Lifetime Rides" section
6. Test manually adding a past vehicle with "+ Add a car from your past"
