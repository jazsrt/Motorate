/*
  # Add Photo Posts and Social Features

  Creates new tables for photo posts, social following, likes, comments,
  and location-based challenges.
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE post_privacy AS ENUM ('public', 'friends', 'private');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_type AS ENUM ('sedan', 'suv', 'truck', 'sports', 'coupe', 'convertible', 'wagon', 'van', 'motorcycle', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add type column to vehicles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.vehicles ADD COLUMN type vehicle_type DEFAULT 'other';
  END IF;
END $$;

-- Create follows table FIRST (needed for posts policies)
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  caption text,
  privacy_level post_privacy DEFAULT 'public' NOT NULL,
  location_lat float,
  location_lng float,
  location_label text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create other tables
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.location_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  lat float NOT NULL,
  lng float NOT NULL,
  radius_meters int DEFAULT 50 NOT NULL,
  points_reward int DEFAULT 100 NOT NULL,
  badge_id uuid REFERENCES public.badges(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.location_challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.challenge_completions (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_id uuid REFERENCES public.location_challenges(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  completed_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, challenge_id)
);

ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;

-- Follows policies
CREATE POLICY "Users can view all follows"
  ON public.follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others"
  ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- Posts policies
CREATE POLICY "Anyone can view public posts"
  ON public.posts FOR SELECT
  USING (privacy_level = 'public');

CREATE POLICY "Users can view own posts"
  ON public.posts FOR SELECT TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Followers can view friends posts"
  ON public.posts FOR SELECT TO authenticated
  USING (
    privacy_level = 'friends' 
    AND EXISTS (
      SELECT 1 FROM public.follows 
      WHERE follows.following_id = posts.author_id 
      AND follows.follower_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE TO authenticated
  USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

-- Post likes policies
CREATE POLICY "Users can view likes on visible posts"
  ON public.post_likes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts 
      WHERE posts.id = post_likes.post_id
      AND (
        posts.privacy_level = 'public'
        OR posts.author_id = auth.uid()
        OR (posts.privacy_level = 'friends' AND EXISTS (
          SELECT 1 FROM public.follows 
          WHERE follows.following_id = posts.author_id 
          AND follows.follower_id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "Users can like posts"
  ON public.post_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON public.post_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Post comments policies
CREATE POLICY "Users can view comments on visible posts"
  ON public.post_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts 
      WHERE posts.id = post_comments.post_id
      AND (
        posts.privacy_level = 'public'
        OR posts.author_id = auth.uid()
        OR (posts.privacy_level = 'friends' AND EXISTS (
          SELECT 1 FROM public.follows 
          WHERE follows.following_id = posts.author_id 
          AND follows.follower_id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "Users can comment on visible posts"
  ON public.post_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.posts 
      WHERE posts.id = post_comments.post_id
      AND (
        posts.privacy_level = 'public'
        OR posts.author_id = auth.uid()
        OR (posts.privacy_level = 'friends' AND EXISTS (
          SELECT 1 FROM public.follows 
          WHERE follows.following_id = posts.author_id 
          AND follows.follower_id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "Users can delete own comments"
  ON public.post_comments FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

-- Location challenges policies
CREATE POLICY "Users can view active challenges"
  ON public.location_challenges FOR SELECT TO authenticated
  USING (is_active = true);

-- Challenge completions policies
CREATE POLICY "Users can view own completions"
  ON public.challenge_completions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions"
  ON public.challenge_completions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_vehicle ON public.posts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_posts_privacy ON public.posts(privacy_level);
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON public.vehicles(type);
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON public.vehicles(make, model);
