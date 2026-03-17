-- ============================================================
-- MOTORATE: Create Missing Tables (SAFE — idempotent)
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- Generated 2026-03-10
-- ============================================================

-- ─── 1. NOTIFICATIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text,
  message text,
  link_type text,
  link_id text,
  reference_type text,
  reference_id text,
  data jsonb,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications (ignore error if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. POST COMMENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  is_edited boolean DEFAULT false,
  updated_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read comments" ON public.post_comments;
CREATE POLICY "Anyone can read comments" ON public.post_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own comments" ON public.post_comments;
CREATE POLICY "Users can insert own comments" ON public.post_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.post_comments;
CREATE POLICY "Users can update own comments" ON public.post_comments
  FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;
CREATE POLICY "Users can delete own comments" ON public.post_comments
  FOR DELETE USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);

-- ─── 3. COMMENT LIKES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read comment likes" ON public.comment_likes;
CREATE POLICY "Anyone can read comment likes" ON public.comment_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own comment likes" ON public.comment_likes;
CREATE POLICY "Users can insert own comment likes" ON public.comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comment likes" ON public.comment_likes;
CREATE POLICY "Users can delete own comment likes" ON public.comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ─── 4. SPOT HISTORY ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.spot_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spotter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  review_id uuid,
  spot_type text DEFAULT 'quick',
  photo_url text,
  reputation_earned int DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.spot_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read spot history" ON public.spot_history;
CREATE POLICY "Anyone can read spot history" ON public.spot_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own spots" ON public.spot_history;
CREATE POLICY "Users can insert own spots" ON public.spot_history
  FOR INSERT WITH CHECK (auth.uid() = spotter_id);

CREATE INDEX IF NOT EXISTS idx_spot_history_vehicle_id ON public.spot_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_spot_history_spotter_id ON public.spot_history(spotter_id);

-- ─── 5. POST VIEWS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id text,
  viewed_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read post views" ON public.post_views;
CREATE POLICY "Anyone can read post views" ON public.post_views
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert post views" ON public.post_views;
CREATE POLICY "Anyone can insert post views" ON public.post_views
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON public.post_views(post_id);

-- ─── 6. REPUTATION SCORES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reputation_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_score int DEFAULT 0,
  rank int DEFAULT 0,
  level int DEFAULT 1,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.reputation_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reputation scores" ON public.reputation_scores;
CREATE POLICY "Anyone can read reputation scores" ON public.reputation_scores
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own reputation" ON public.reputation_scores;
CREATE POLICY "Users can insert own reputation" ON public.reputation_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reputation" ON public.reputation_scores;
CREATE POLICY "Users can update own reputation" ON public.reputation_scores
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reputation_scores_user_id ON public.reputation_scores(user_id);

-- ─── 7. REPUTATION TRANSACTIONS ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.reputation_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  points int NOT NULL,
  reference_type text,
  reference_id text,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.reputation_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own transactions" ON public.reputation_transactions;
CREATE POLICY "Users can read own transactions" ON public.reputation_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.reputation_transactions;
CREATE POLICY "Users can insert own transactions" ON public.reputation_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reputation_transactions_user_id ON public.reputation_transactions(user_id);

-- ─── 8. DRIVER RATINGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.driver_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read driver ratings" ON public.driver_ratings;
CREATE POLICY "Anyone can read driver ratings" ON public.driver_ratings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own ratings" ON public.driver_ratings;
CREATE POLICY "Users can insert own ratings" ON public.driver_ratings
  FOR INSERT WITH CHECK (auth.uid() = rated_by);

CREATE INDEX IF NOT EXISTS idx_driver_ratings_driver_id ON public.driver_ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_ratings_rated_user_id ON public.driver_ratings(rated_user_id);

-- ─── 9. SHARE EVENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_type text,
  share_url text,
  platform text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own share events" ON public.share_events;
CREATE POLICY "Users can insert own share events" ON public.share_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own share events" ON public.share_events;
CREATE POLICY "Users can read own share events" ON public.share_events
  FOR SELECT USING (auth.uid() = user_id);

-- ─── 10. BUMPER STICKERS (definitions) ────────────────────────
CREATE TABLE IF NOT EXISTS public.bumper_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon_name text,
  category text DEFAULT 'Fun',
  color text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.bumper_stickers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read bumper stickers" ON public.bumper_stickers;
CREATE POLICY "Anyone can read bumper stickers" ON public.bumper_stickers
  FOR SELECT USING (true);

-- ─── 11. STICKER DEFINITIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sticker_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sticker_type text,
  name text NOT NULL,
  description text,
  icon text,
  rarity text DEFAULT 'common',
  points_value int DEFAULT 0,
  unlocks_badge_slug text,
  required_count int DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.sticker_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read sticker definitions" ON public.sticker_definitions;
CREATE POLICY "Anyone can read sticker definitions" ON public.sticker_definitions
  FOR SELECT USING (true);

-- ─── 12. VEHICLE STICKERS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  sticker_id uuid NOT NULL,
  given_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.vehicle_stickers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read vehicle stickers" ON public.vehicle_stickers;
CREATE POLICY "Anyone can read vehicle stickers" ON public.vehicle_stickers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert vehicle stickers" ON public.vehicle_stickers;
CREATE POLICY "Users can insert vehicle stickers" ON public.vehicle_stickers
  FOR INSERT WITH CHECK (auth.uid() = given_by);

CREATE INDEX IF NOT EXISTS idx_vehicle_stickers_vehicle_id ON public.vehicle_stickers(vehicle_id);

-- ─── 13. VEHICLE STICKER COUNTS (materialized view / table) ──
CREATE TABLE IF NOT EXISTS public.vehicle_sticker_counts (
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  tag_name text NOT NULL,
  tag_sentiment text,
  count int DEFAULT 0,
  PRIMARY KEY (vehicle_id, tag_name)
);

ALTER TABLE public.vehicle_sticker_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read sticker counts" ON public.vehicle_sticker_counts;
CREATE POLICY "Anyone can read sticker counts" ON public.vehicle_sticker_counts
  FOR SELECT USING (true);

-- ─── 14. PROFILE VIEWS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_at timestamptz DEFAULT now() NOT NULL,
  view_date date DEFAULT CURRENT_DATE
);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile views" ON public.profile_views;
CREATE POLICY "Users can read own profile views" ON public.profile_views
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Anyone can insert profile views" ON public.profile_views;
CREATE POLICY "Anyone can insert profile views" ON public.profile_views
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON public.profile_views(profile_id);

-- ============================================================
-- DONE! All critical missing tables created.
-- ============================================================
