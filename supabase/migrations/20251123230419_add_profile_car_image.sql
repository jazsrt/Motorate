/*
  # Add Profile Car Image

  1. New Columns
    - `profiles.profile_car_image` - URL to user's main car photo for their profile

  2. Changes
    - Add profile_car_image column to profiles table

  3. Security
    - No changes to RLS policies needed
*/

-- Add profile_car_image column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'profile_car_image'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN profile_car_image text;
  END IF;
END $$;
