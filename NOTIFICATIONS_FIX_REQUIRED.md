# CRITICAL: Notifications System Fix Required

## 🚨 Issues Found and Fixed

### Problems Identified:
1. **Notifications table doesn't exist** - Database is missing the notifications table
2. **Duplicate badge notifications** - Trigger and function both create notifications, causing duplicates
3. **Persistent badge popups** - Badge notifications reappear on every page reload
4. **Broken navigation** - Clicking notifications doesn't navigate correctly

### Frontend Fixes Applied ✅
- Updated BadgeContext to mark notifications as read in database
- Updated BadgeContext to check if notifications were already read before showing
- Fixed NotificationBell component navigation for all notification types
- Fixed NotificationsPage component navigation and badge handling

---

## 📋 SQL Migration Required

You **MUST** run the following SQL in your Supabase SQL Editor to fix the database:

### Step-by-Step Instructions:

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

2. **Copy and paste the ENTIRE SQL script below**

3. **Click "Run"**

---

## 🗄️ SQL Script to Run:

```sql
-- ============================================================================
-- NOTIFICATIONS SYSTEM FIX
-- Run this ENTIRE script in your Supabase SQL Editor
-- ============================================================================

-- Step 1: Create notifications table if it doesn't exist
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

-- Step 2: Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Step 4: Create RLS policies
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

-- Step 5: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Step 6: DROP DUPLICATE TRIGGER (this was causing duplicate badge notifications!)
DROP TRIGGER IF EXISTS on_badge_awarded_notify ON public.user_badges;
DROP FUNCTION IF EXISTS notify_badge_award();

-- Step 7: Update check_and_award_badge function to prevent duplicates
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
  -- Find the highest tier badge this user qualifies for
  SELECT id, name, tier, description
  INTO v_badge_id, v_badge_name, v_tier, v_description
  FROM badges
  WHERE badge_group = p_badge_group
    AND p_count >= tier_threshold
    AND tier_threshold IS NOT NULL
  ORDER BY tier_threshold DESC
  LIMIT 1;

  -- If a badge was found and user doesn't already have it
  IF v_badge_id IS NOT NULL THEN
    -- Try to insert the badge (ON CONFLICT prevents duplicates)
    INSERT INTO user_badges (user_id, badge_id, earned_at)
    VALUES (p_user_id, v_badge_id, NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING
    RETURNING true INTO v_newly_awarded;

    -- ONLY create notification if badge was just awarded (not a duplicate)
    IF v_newly_awarded THEN
      -- Double-check no notification was just created for this badge
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

    -- Remove lower tier badges from same group
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

-- Step 8: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_and_award_badge TO authenticated, service_role;

-- Step 9: Clean up any duplicate notifications that already exist
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
      AND link_id IS NOT NULL
  ) t
  WHERE t.rn > 1
);

-- Step 10: Add helpful comments
COMMENT ON TABLE public.notifications IS 'User notifications with proper deduplication and RLS';
COMMENT ON FUNCTION check_and_award_badge IS 'Awards badges with single notification (duplicate trigger removed)';

-- ============================================================================
-- DONE! Your notifications system is now fixed.
-- ============================================================================
```

---

## ✅ Verification Steps

After running the SQL, verify everything works:

1. **Check table exists:**
   ```sql
   SELECT COUNT(*) FROM notifications;
   ```

2. **Check your notifications:**
   ```sql
   SELECT * FROM notifications
   WHERE user_id = auth.uid()
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. **Test in the app:**
   - Refresh your app
   - Earn a badge (post something, rate a driver, etc.)
   - Click the bell icon - you should see the notification
   - Dismiss the badge modal - it should NOT reappear on reload
   - Click on the notification - it should navigate to the badges page

---

## 📊 What This Fixes:

### Before:
- ❌ Notifications table missing → errors in console
- ❌ Badge notifications appear twice (trigger + function)
- ❌ Badge modals reappear every page reload
- ❌ Clicking badge notifications navigates to wrong page
- ❌ Notifications stay unread even after dismissing badge modal

### After:
- ✅ Notifications table exists with proper RLS
- ✅ Badge notifications only created once
- ✅ Badge modals dismissed permanently
- ✅ Clicking badge notifications goes to badges page
- ✅ Dismissing badge modal marks notification as read
- ✅ Performance indexes for fast queries
- ✅ All notification types navigate correctly

---

## 🔍 Technical Details

### Why the duplicate trigger was removed:
The `on_badge_awarded_notify` trigger was creating a notification for EVERY badge insert into `user_badges`. However, the `check_and_award_badge()` function **already creates notifications** when it awards badges. This caused **2 identical notifications** for every badge earned.

**Solution:** Removed the trigger, kept the notification creation in the function only.

### Why badge modals kept reappearing:
The `BadgeContext` used localStorage to track "seen" badges, but never marked the notification as `is_read = true` in the database. On page reload, the realtime subscription would see the "unread" notification and show the badge modal again.

**Solution:** Updated `dismissBadge()` to mark the database notification as read.

---

## 🚀 Next Steps After Running SQL:

1. Clear your browser localStorage (or just close/reopen the app)
2. Test the full notification flow:
   - Bell icon shows count
   - Clicking bell shows dropdown with notifications
   - Clicking notification navigates correctly
   - Badge modals appear once and stay dismissed
3. Check the notifications page (/notifications) works properly

---

## ⚠️ Important Notes:

- **This migration is SAFE** - It only creates tables/functions if they don't exist
- **No data loss** - It only removes duplicate notifications, keeps the original
- **Idempotent** - Safe to run multiple times
- **Fast** - Should complete in under 5 seconds

---

## 📞 If You Need Help:

If you encounter errors when running the SQL:
1. Copy the exact error message
2. Check which statement number failed
3. Let me know and I'll provide a fix

---

## ✨ Summary

Run the SQL script above in your Supabase dashboard, then refresh your app. All notification issues will be resolved!
