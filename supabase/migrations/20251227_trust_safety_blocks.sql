/*
  # Trust, Safety & Moderation System

  1. New Tables
    - user_blocks (block users from messaging/seeing content)
    - reports (report posts, comments, profiles)
    - rate_limits (track rate limiting)

  2. Schema Changes
    - Add delayed_until to posts (safety time delay for spotted cars only)

  3. Security
    - Full RLS on all tables
    - Block checking in posts/comments queries

  4. Functions
    - is_user_blocked() - Check block status
    - check_rate_limit() - Enforce rate limits
    - calculate_safety_delay() - Random 2-4 hour delay for spotted cars

  5. AI Moderation (TODO)
    - Integrate with moderation_queue for automated content review
    - Flagging system for inappropriate content
*/

-- =====================================================
-- 1. USER BLOCKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id),
  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create blocks"
  ON user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can view own blocks"
  ON user_blocks FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can delete own blocks"
  ON user_blocks FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Admins can view all blocks"
  ON user_blocks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 2. REPORTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('post', 'comment', 'profile')),
  content_id uuid NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),

  CONSTRAINT unique_report UNIQUE (reporter_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_content ON reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 3. RATE LIMITS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('post', 'message', 'comment', 'spot')),
  action_timestamp timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON rate_limits(user_id, action_type, action_timestamp DESC);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System manages rate limits"
  ON rate_limits FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Admins can view rate limits"
  ON rate_limits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 4. ADD SAFETY DELAY TO POSTS (FOR SPOTTED CARS)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'delayed_until'
  ) THEN
    ALTER TABLE posts ADD COLUMN delayed_until timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_delayed_until ON posts(delayed_until);

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Drop existing function with old parameter names
DROP FUNCTION IF EXISTS check_rate_limit(uuid, text, integer, integer);

CREATE OR REPLACE FUNCTION is_user_blocked(blocker uuid, blocked uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks
    WHERE blocker_id = blocker AND blocked_id = blocked
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculate_safety_delay()
RETURNS timestamptz AS $$
BEGIN
  -- Random delay between 2-4 hours (7200-14400 seconds)
  RETURN now() + (random() * 7200 + 7200) * interval '1 second';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_action_type text,
  p_max_actions int,
  p_window_minutes int
)
RETURNS boolean AS $$
DECLARE
  action_count int;
BEGIN
  SELECT COUNT(*)
  INTO action_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND action_timestamp > now() - (p_window_minutes || ' minutes')::interval;

  RETURN action_count < p_max_actions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_rate_limit_action(
  p_user_id uuid,
  p_action_type text
)
RETURNS void AS $$
BEGIN
  INSERT INTO rate_limits (user_id, action_type)
  VALUES (p_user_id, p_action_type);

  -- Clean up old records (older than 24 hours)
  DELETE FROM rate_limits
  WHERE action_timestamp < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. UPDATE POSTS RLS TO RESPECT BLOCKS AND DELAYS
-- =====================================================

DROP POLICY IF EXISTS "Posts are viewable by all users" ON posts;
DROP POLICY IF EXISTS "Public posts are visible to all" ON posts;
DROP POLICY IF EXISTS "Users can view all posts" ON posts;
DROP POLICY IF EXISTS "Posts visible with blocks and delays respected" ON posts;

CREATE POLICY "Posts visible with blocks and delays respected"
  ON posts FOR SELECT
  TO authenticated
  USING (
    -- Post is either not delayed OR delay has expired
    (delayed_until IS NULL OR delayed_until <= now())
    AND
    -- Post author hasn't blocked current user
    NOT EXISTS (
      SELECT 1 FROM user_blocks
      WHERE blocker_id = posts.author_id
      AND blocked_id = auth.uid()
    )
    AND
    -- Current user hasn't blocked post author
    NOT EXISTS (
      SELECT 1 FROM user_blocks
      WHERE blocker_id = auth.uid()
      AND blocked_id = posts.author_id
    )
  );

-- =====================================================
-- 7. UPDATE COMMENTS RLS (IF TABLE EXISTS)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'comments'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Comments are viewable by all users" ON comments;
    DROP POLICY IF EXISTS "Public comments are visible to all" ON comments;
    DROP POLICY IF EXISTS "Users can view all comments" ON comments;
    DROP POLICY IF EXISTS "Comments visible with blocks respected" ON comments;

    -- Create new policy
    EXECUTE 'CREATE POLICY "Comments visible with blocks respected"
      ON comments FOR SELECT
      TO authenticated
      USING (
        NOT EXISTS (
          SELECT 1 FROM user_blocks
          WHERE blocker_id = comments.author_id
          AND blocked_id = auth.uid()
        )
        AND
        NOT EXISTS (
          SELECT 1 FROM user_blocks
          WHERE blocker_id = auth.uid()
          AND blocked_id = comments.author_id
        )
      )';
  END IF;
END $$;

-- =====================================================
-- 8. TRIGGER: AUTO-SET SAFETY DELAY FOR SPOTTED CARS
-- =====================================================

CREATE OR REPLACE FUNCTION set_post_safety_delay()
RETURNS TRIGGER AS $$
BEGIN
  -- Only apply delay to spotted cars (not user's own posts)
  -- 'spotting' = someone else's car (needs 2-4 hour delay)
  -- 'photo' = user's own car (no delay needed)
  IF NEW.post_type = 'spotting' THEN
    NEW.delayed_until := calculate_safety_delay();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_safety_delay_trigger ON posts;

CREATE TRIGGER set_safety_delay_trigger
  BEFORE INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION set_post_safety_delay();

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION is_user_blocked(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_safety_delay() TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(uuid, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION record_rate_limit_action(uuid, text) TO authenticated;

-- =====================================================
-- 10. AI MODERATION NOTES (TODO)
-- =====================================================

/*
  NEXT STEPS FOR AI MODERATION:

  1. Enhance moderation_queue table to track AI confidence scores
  2. Add automated flagging rules:
     - Profanity detection
     - PII detection (phone numbers, emails, addresses)
     - Inappropriate content detection
  3. Create webhook for real-time moderation
  4. Add appeal workflow for false positives
  5. Track moderation metrics for continuous improvement

  WORKFLOW:
  - Post/comment created -> Added to moderation_queue
  - AI moderates content -> Sets moderation_status and confidence
  - High confidence auto-approve/reject
  - Low confidence flag for human review
  - Track all decisions for appeal process
*/
