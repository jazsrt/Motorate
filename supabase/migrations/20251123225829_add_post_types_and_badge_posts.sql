/*
  # Add Post Types and Badge-Giving Support

  1. New Columns
    - `posts.post_type` - Type of post (photo, badge_given, etc.)
    - `posts.badge_id` - Reference to badge for badge_given posts
    - `posts.recipient_vehicle_id` - Vehicle receiving the badge

  2. Changes
    - Make `image_url` nullable for badge posts (they don't need images)
    - Add new post_type enum

  3. Security
    - No changes to RLS policies needed (existing policies cover new post types)
*/

-- Create post_type enum
DO $$ BEGIN
  CREATE TYPE post_type AS ENUM ('photo', 'badge_given');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add post_type column to posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'post_type'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN post_type post_type DEFAULT 'photo' NOT NULL;
  END IF;
END $$;

-- Add badge_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'badge_id'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN badge_id uuid REFERENCES public.badges(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add recipient_vehicle_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'recipient_vehicle_id'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN recipient_vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Make image_url nullable for badge posts
ALTER TABLE public.posts ALTER COLUMN image_url DROP NOT NULL;

-- Create index for badge posts
CREATE INDEX IF NOT EXISTS idx_posts_type ON public.posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_badge ON public.posts(badge_id) WHERE badge_id IS NOT NULL;
