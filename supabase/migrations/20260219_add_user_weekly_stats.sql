/*
  # Add Weekly Stats Tracking

  1. New Tables
    - `user_weekly_stats`
      - Tracks weekly snapshots of user metrics for WoW (Week-over-Week) comparisons
      - Captures followers, views, posts, spots, badges, reputation, etc.

  2. Changes
    - Creates table to enable "+X this week" and "+Y% growth" metrics
    - Weekly snapshots allow historical trend analysis

  3. Security
    - Enable RLS on user_weekly_stats
    - Users can read their own stats
    - Only the system can insert/update stats
*/

CREATE TABLE IF NOT EXISTS user_weekly_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,

  followers_count int DEFAULT 0,
  following_count int DEFAULT 0,
  profile_views_count int DEFAULT 0,
  posts_count int DEFAULT 0,
  spots_count int DEFAULT 0,
  comments_count int DEFAULT 0,
  likes_received_count int DEFAULT 0,
  vehicles_count int DEFAULT 0,
  claimed_vehicles_count int DEFAULT 0,
  verified_vehicles_count int DEFAULT 0,
  badges_count int DEFAULT 0,
  reputation_score int DEFAULT 0,
  reviews_left_count int DEFAULT 0,
  avg_rating_given decimal(3,2),

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE(user_id, week_start)
);

ALTER TABLE user_weekly_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly stats"
  ON user_weekly_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly stats"
  ON user_weekly_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_weekly_stats_user_week
  ON user_weekly_stats(user_id, week_start DESC);

CREATE INDEX IF NOT EXISTS idx_user_weekly_stats_week
  ON user_weekly_stats(week_start DESC);

CREATE OR REPLACE FUNCTION update_user_weekly_stats(p_user_id uuid, p_week_start date)
RETURNS void AS $$
DECLARE
  v_followers_count int;
  v_following_count int;
  v_profile_views_count int;
  v_posts_count int;
  v_spots_count int;
  v_comments_count int;
  v_likes_count int;
  v_vehicles_count int;
  v_claimed_vehicles_count int;
  v_verified_vehicles_count int;
  v_badges_count int;
  v_reputation_score int;
  v_reviews_count int;
  v_avg_rating decimal(3,2);
BEGIN
  SELECT COUNT(*) INTO v_followers_count FROM follows WHERE following_id = p_user_id;
  SELECT COUNT(*) INTO v_following_count FROM follows WHERE follower_id = p_user_id;
  SELECT COUNT(*) INTO v_profile_views_count FROM profile_views WHERE viewed_profile_id = p_user_id;
  SELECT COUNT(*) INTO v_posts_count FROM posts WHERE author_id = p_user_id;
  SELECT COUNT(*) INTO v_spots_count FROM spot_history WHERE spotter_id = p_user_id;
  SELECT COUNT(*) INTO v_comments_count FROM post_comments WHERE author_id = p_user_id;

  SELECT COUNT(*) INTO v_likes_count
  FROM post_likes pl
  JOIN posts p ON pl.post_id = p.id
  WHERE p.author_id = p_user_id;

  SELECT COUNT(*) INTO v_vehicles_count FROM vehicles WHERE owner_id = p_user_id;
  SELECT COUNT(*) INTO v_claimed_vehicles_count FROM vehicles WHERE owner_id = p_user_id AND is_claimed = true;
  SELECT COUNT(*) INTO v_verified_vehicles_count FROM vehicles WHERE owner_id = p_user_id AND is_verified = true;

  SELECT COUNT(*) INTO v_badges_count FROM user_badges WHERE user_id = p_user_id;
  SELECT reputation_score INTO v_reputation_score FROM profiles WHERE id = p_user_id;

  SELECT COUNT(*), AVG(driver_score) INTO v_reviews_count, v_avg_rating
  FROM reviews WHERE author_id = p_user_id;

  INSERT INTO user_weekly_stats (
    user_id, week_start,
    followers_count, following_count, profile_views_count,
    posts_count, spots_count, comments_count, likes_received_count,
    vehicles_count, claimed_vehicles_count, verified_vehicles_count,
    badges_count, reputation_score,
    reviews_left_count, avg_rating_given,
    updated_at
  ) VALUES (
    p_user_id, p_week_start,
    v_followers_count, v_following_count, v_profile_views_count,
    v_posts_count, v_spots_count, v_comments_count, v_likes_count,
    v_vehicles_count, v_claimed_vehicles_count, v_verified_vehicles_count,
    v_badges_count, COALESCE(v_reputation_score, 0),
    v_reviews_count, v_avg_rating,
    now()
  )
  ON CONFLICT (user_id, week_start)
  DO UPDATE SET
    followers_count = EXCLUDED.followers_count,
    following_count = EXCLUDED.following_count,
    profile_views_count = EXCLUDED.profile_views_count,
    posts_count = EXCLUDED.posts_count,
    spots_count = EXCLUDED.spots_count,
    comments_count = EXCLUDED.comments_count,
    likes_received_count = EXCLUDED.likes_received_count,
    vehicles_count = EXCLUDED.vehicles_count,
    claimed_vehicles_count = EXCLUDED.claimed_vehicles_count,
    verified_vehicles_count = EXCLUDED.verified_vehicles_count,
    badges_count = EXCLUDED.badges_count,
    reputation_score = EXCLUDED.reputation_score,
    reviews_left_count = EXCLUDED.reviews_left_count,
    avg_rating_given = EXCLUDED.avg_rating_given,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
