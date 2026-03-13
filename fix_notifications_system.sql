/*
  # Fix Notifications System - Complete Overhaul

  ## Critical Issues Fixed
  1. Creates missing notifications table
  2. Removes duplicate badge notification trigger
  3. Prevents persistent badge notifications on reload
  4. Adds proper indexes for performance
  5. Cleans up duplicate notifications

  ## Changes
  - Creates notifications table with all required fields
  - Drops duplicate trigger that was creating duplicate badge notifications
  - Adds indexes for better query performance
  - Ensures RLS is properly configured
  - Deduplicates existing notifications
*/

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL DEFAULT 'Notification',
  message text NOT NULL,
  link_type text,
  link_id text,
  link_url text,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create RLS policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- DROP THE DUPLICATE TRIGGER that creates duplicate badge notifications
DROP TRIGGER IF EXISTS on_badge_awarded_notify ON public.user_badges;
DROP FUNCTION IF EXISTS notify_badge_award();

-- Update check_and_award_badge function to prevent duplicate notifications
CREATE OR REPLACE FUNCTION check_and_award_badge(
  p_user_id uuid,
  p_badge_group text,
  p_count integer
) RETURNS void AS $$
DECLARE
  v_badge_id uuid;
  v_badge_name text;
  v_tier text;
  v_description text;
  v_newly_awarded boolean := false;
BEGIN
  SELECT id, name, tier, description
  INTO v_badge_id, v_badge_name, v_tier, v_description
  FROM badges
  WHERE badge_group = p_badge_group
    AND p_count >= tier_threshold
    AND tier_threshold IS NOT NULL
  ORDER BY tier_threshold DESC
  LIMIT 1;

  IF v_badge_id IS NOT NULL THEN
    INSERT INTO user_badges (user_id, badge_id, earned_at)
    VALUES (p_user_id, v_badge_id, NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING
    RETURNING true INTO v_newly_awarded;

    IF v_newly_awarded THEN
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = p_user_id
          AND type = 'badge_awarded'
          AND link_id = v_badge_id::text
          AND created_at > NOW() - INTERVAL '1 minute'
      ) THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          link_type,
          link_id,
          is_read,
          created_at
        ) VALUES (
          p_user_id,
          'badge_awarded',
          'New Badge Unlocked!',
          'You earned the ' || v_badge_name || ' badge! ' || COALESCE(v_description, ''),
          'badge',
          v_badge_id::text,
          false,
          NOW()
        );
      END IF;
    END IF;

    DELETE FROM user_badges
    WHERE user_id = p_user_id
      AND badge_id IN (
        SELECT id FROM badges
        WHERE badge_group = p_badge_group
          AND id != v_badge_id
      );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_and_award_badge TO authenticated, service_role;

-- Clean up duplicate notifications
DELETE FROM public.notifications
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, type, link_id
             ORDER BY created_at ASC
           ) as rn
    FROM public.notifications
    WHERE type IN ('badge_awarded', 'badge_unlocked', 'badge_received')
  ) t
  WHERE t.rn > 1
);
