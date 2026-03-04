# Spot Workflow Fixes - Action Items

## Issue Summary
The spot workflow has several issues that need to be fixed:

1. ✅ **License plate display** - FIXED (plate number now visible)
2. ⏳ **Database function error** - SQL script provided below
3. ❌ **Ratings not displaying** - Will work after database fix
4. ❌ **Reviews not counting** - Will work after database fix
5. ❌ **Bumper stickers not showing** - Need to verify after database fix

## REQUIRED: Run This SQL Script

**You MUST run this in your Supabase SQL Editor before the spot workflow will work:**

```sql
-- Drop existing functions
DROP FUNCTION IF EXISTS check_and_award_badge(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS check_and_award_badges(UUID, TEXT);

-- Create the badge auto-award function
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID, p_action TEXT)
RETURNS TABLE(badge_id TEXT, badge_name TEXT, badge_tier TEXT) AS $$
DECLARE
  activity_count INTEGER;
  badge_rec RECORD;
  v_badge_group TEXT;
BEGIN
  -- Map action to badge_group
  v_badge_group := CASE p_action
    WHEN 'spot' THEN 'spotter'
    WHEN 'review' THEN 'reviewer'
    WHEN 'post' THEN 'content_creator'
    WHEN 'comment' THEN 'commenter'
    WHEN 'follow' THEN 'followers'
    WHEN 'like' THEN 'reactor'
    WHEN 'photo' THEN 'photographer'
    WHEN 'mod' THEN 'builder'
    ELSE NULL
  END;

  IF v_badge_group IS NULL THEN
    RETURN;
  END IF;

  -- Count user's activity based on action type
  CASE p_action
    WHEN 'spot' THEN
      SELECT COUNT(*) INTO activity_count
      FROM spot_history
      WHERE spotter_id = p_user_id;

    WHEN 'review' THEN
      SELECT COUNT(*) INTO activity_count
      FROM reviews
      WHERE author_id = p_user_id;

    WHEN 'post' THEN
      SELECT COUNT(*) INTO activity_count
      FROM posts
      WHERE author_id = p_user_id;

    WHEN 'comment' THEN
      SELECT COUNT(*) INTO activity_count
      FROM post_comments
      WHERE author_id = p_user_id;

    WHEN 'follow' THEN
      SELECT COUNT(*) INTO activity_count
      FROM follows
      WHERE follower_id = p_user_id;

    WHEN 'like' THEN
      SELECT COUNT(*) INTO activity_count
      FROM reactions
      WHERE user_id = p_user_id;

    WHEN 'photo' THEN
      SELECT COUNT(*) INTO activity_count
      FROM spot_history
      WHERE spotter_id = p_user_id
        AND photo_url IS NOT NULL;

    WHEN 'mod' THEN
      SELECT COUNT(*) INTO activity_count
      FROM modifications m
      INNER JOIN vehicles v ON m.vehicle_id = v.id
      WHERE v.owner_id = p_user_id;

    ELSE
      activity_count := 0;
  END CASE;

  -- Find and award qualifying badges
  FOR badge_rec IN
    SELECT b.id, b.name, b.tier, b.tier_threshold
    FROM badges b
    WHERE b.badge_group = v_badge_group
      AND b.tier_threshold IS NOT NULL
      AND b.tier_threshold <= activity_count
      AND NOT EXISTS (
        SELECT 1 FROM user_badges ub
        WHERE ub.user_id = p_user_id AND ub.badge_id = b.id
      )
    ORDER BY b.tier_threshold DESC
  LOOP
    -- Award the badge
    INSERT INTO user_badges (user_id, badge_id, earned_at)
    VALUES (p_user_id, badge_rec.id, NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING;

    -- Return the awarded badge info
    badge_id := badge_rec.id::TEXT;
    badge_name := badge_rec.name;
    badge_tier := badge_rec.tier;
    RETURN NEXT;

    -- Remove lower tier badges from same group
    DELETE FROM user_badges
    WHERE user_id = p_user_id
      AND badge_id IN (
        SELECT id FROM badges
        WHERE badge_group = v_badge_group
          AND tier_threshold < badge_rec.tier_threshold
      );
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_and_award_badges TO authenticated, service_role;

COMMENT ON FUNCTION check_and_award_badges IS 'Checks user activity and awards appropriate tiered badges';
```

## Steps to Fix

### 1. Run the SQL Script
- Go to your Supabase Dashboard
- Navigate to SQL Editor
- Paste the entire SQL script above
- Click "Run" or press Cmd/Ctrl + Enter
- Verify it completes without errors

### 2. Test the Spot Workflow
After running the SQL:
1. Go to the Spot tab
2. Enter a license plate (e.g., "YADIG" in IL)
3. Search for the vehicle
4. Click "SPOT & REVIEW"
5. Fill out the form with:
   - Driver rating (1-5 stars)
   - Driving rating (1-5 stars)
   - Vehicle rating (1-5 stars)
   - Sentiment (Love/Hate)
   - Optional comment
6. Submit

### 3. Verify the Fix
After submitting, check:
- ✅ No error messages
- ✅ Vehicle profile shows correct spot count
- ✅ Vehicle profile shows average rating (not 0.0)
- ✅ Vehicle profile shows review count
- ✅ Bumper stickers appear (if any were auto-assigned)

## What Was Fixed

### Code Changes
1. **LicensePlateDisplay.tsx** - Updated text colors for better visibility
   - Illinois plate: Changed from `text-red-700` to `text-gray-900`
   - Added text shadow for better readability
   - Fixed several other states with low contrast

### Database Changes (SQL Script)
2. **check_and_award_badges function** - Fixed function signature
   - Old (broken): `check_and_award_badge(uuid, text, integer)`
   - New (working): `check_and_award_badges(uuid, text)`
   - Function now correctly counts user activities and awards badges

## Open Items

Once you confirm the SQL script has been run, let me know and I'll help you:
1. Test the complete workflow end-to-end
2. Verify ratings are displaying correctly
3. Check if bumper stickers are being auto-assigned
4. Fix any remaining issues

## Notes

- The ratings ARE being calculated correctly in the code (lines 499-505 of VehicleDetailPage.tsx)
- The stickers component IS working (VehicleStickersDisplay.tsx)
- The main blocker was the database function error preventing reviews from being created
- Once the SQL script is run, all downstream issues should resolve
