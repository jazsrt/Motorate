# Badge Auto-Award Function Corrections

## Issues Found and Fixed

### Critical Column Name Mismatches

The original `badge_auto_award_function.sql` had **one critical error** that would cause all badge counts to return 0:

#### 1. Reviews Table Column Name ❌ FIXED

**WRONG:**
```sql
WHEN 'review' THEN
  SELECT COUNT(*) INTO activity_count
  FROM reviews
  WHERE user_id = p_user_id;  -- WRONG COLUMN NAME
```

**CORRECT:**
```sql
WHEN 'review' THEN
  SELECT COUNT(*) INTO activity_count
  FROM reviews
  WHERE author_id = p_user_id;  -- CORRECT COLUMN NAME
```

**Evidence:**
- `supabase/migrations/20251123031023_create_carma_schema.sql:141` shows:
  ```sql
  CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,  ← author_id
    ...
  )
  ```

### Verified Correct Table/Column Names

All other table/column names in the function are **CORRECT**:

| Action Type | Table | Column | Status |
|-------------|-------|--------|--------|
| `spot` | `spot_history` | `spotter_id` | ✅ CORRECT |
| `review` | `reviews` | `author_id` | ✅ **FIXED** |
| `post` | `posts` | `author_id` | ✅ CORRECT |
| `comment` | `post_comments` | `author_id` | ✅ CORRECT |
| `follow` | `follows` | `follower_id` | ✅ CORRECT |
| `like` | `reactions` | `user_id` | ✅ CORRECT |
| `photo` | `spot_history` | `spotter_id` + `photo_url` | ✅ CORRECT |
| `mod` | `modifications` | `user_id` | ✅ CORRECT |

### Evidence Sources

1. **spot_history table** - Confirmed from code usage in:
   - `src/pages/BadgesPage.tsx:171`
   - `src/pages/MyGaragePage.tsx:325`
   - `src/pages/QuickSpotReviewPage.tsx:168`
   - `supabase/migrations/20260219_add_user_weekly_stats.sql:87`

2. **reviews table** - Confirmed from:
   - `supabase/migrations/20251123031023_create_carma_schema.sql:138-149`
   - Uses `author_id` column

3. **posts table** - Confirmed from:
   - `supabase/migrations/20251123220225_add_photo_posts_social_features.sql:44-55`
   - Uses `author_id` column

4. **post_comments table** - Confirmed from:
   - `supabase/migrations/20251123220225_add_photo_posts_social_features.sql:69-75`
   - Uses `author_id` column

5. **follows table** - Confirmed from:
   - `supabase/migrations/20251123220225_add_photo_posts_social_features.sql:33-39`
   - Uses `follower_id` column

6. **modifications table** - Confirmed from:
   - `supabase/migrations/20251123031023_create_carma_schema.sql:261-268`
   - Uses `user_id` column (NO vehicle_id foreign key to owner)

## Files Created

1. **migrations/badge_auto_award_function_CORRECTED.sql** - The corrected SQL migration
2. **BADGE_AUTO_AWARD_CORRECTIONS.md** (this file) - Documentation of all corrections

## What You Need To Do

### Step 1: Run the Corrected SQL Migration

Go to **Supabase Dashboard → SQL Editor** and run the file:
```
migrations/badge_auto_award_function_CORRECTED.sql
```

This will:
- Drop any existing versions of the function
- Create the corrected version with proper column names
- Grant necessary permissions

### Step 2: Verify Function Exists

Run this to confirm:
```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'check_and_award_badges';
```

You should see one row with the function name.

### Step 3: Test the Function

Try calling it manually:
```sql
-- Replace with your actual user ID
SELECT * FROM check_and_award_badges(
  'your-user-id-here'::uuid,
  'review'
);
```

### Step 4: Wire Badge Checks Into Your App

After the SQL is deployed, you need to wire badge checks into your action handlers. I'll do this for you automatically once you confirm the SQL is deployed.

The badge checks should be added after:
- Creating a post
- Creating a comment
- Following someone
- Liking/reacting to content
- Creating a spot
- Creating a review

## Summary

**Only 1 critical fix was needed:** The `reviews` table uses `author_id` not `user_id`.

All other table and column names were already correct. The function is now ready to deploy!
