# Garage Page Implementation - Step-by-Step Guide

## What I've Completed

### ✅ 1. Database Schema Review
I've reviewed all metrics across your database migrations and identified:

**Current Tracked Metrics:**
- **Social**: Followers, Following, Profile Views
- **Content**: Posts, Spots, Comments, Likes Received
- **Vehicles**: Total, Claimed, Verified
- **Gamification**: Badges, Reputation Score, Stickers
- **Reviews**: Reviews Left, Average Rating Given

**Reputation Formula Confirmed:**
- Posts: 10 pts each
- Comments: 3 pts each
- Likes: 5 pts each
- Badges: 20 pts each
- Verifications: 50 pts each
- Positive Stickers: 2 pts each
- Negative Stickers: -5 pts each

### ✅ 2. Created RepBreakdownModal Component
**Location**: `/src/components/RepBreakdownModal.tsx`

**Features**:
- Shows total reputation score
- Breaks down all 7 point sources
- Displays count × multiplier = points for each
- Car-inspired gradient design
- Matches "Spot a Ride" modal styling
- Loads data from database tables

### ✅ 3. Created GarageStatsModal Base Component
**Location**: `/src/components/GarageStatsModal.tsx`

**Features**:
- Reusable modal for all stat displays
- Supports WoW (Week-over-Week) changes with up/down indicators
- Responsive mobile/desktop layout
- Slide-up animation
- Can show multiple stats with trends

### ✅ 4. Created Weekly Stats Migration
**Migration File**: `supabase/migrations/20260219_add_user_weekly_stats.sql`

**What It Does**:
- Creates `user_weekly_stats` table
- Tracks snapshots of all metrics weekly
- Enables "+X this week" comparisons
- Includes helper function `update_user_weekly_stats()`
- Properly secured with RLS policies

## What You Need To Do

### Step 1: Apply the SQL Migration

Run this SQL migration to enable week-over-week tracking:

```bash
# You need to apply the migration in supabase/migrations/20260219_add_user_weekly_stats.sql
```

The migration creates:
- `user_weekly_stats` table
- RLS policies for security
- Helper function to populate weekly stats

### Step 2: Create Remaining Modal Components

I've created the base components, but you'll need these additional modals:

**A. Vehicles Modal**
- Show breakdown by verification tier (Shadow/Conditional/Standard/Verified)
- Recent additions
- WoW change

**B. Spots Modal**
- Total spots with thumbnails
- Most spotted vehicle
- Recent spots
- WoW change

**C. Badges Modal**
- Total badges by category
- Rarity breakdown (Common/Uncommon/Rare/Epic/Legendary)
- Recent badges earned
- Progress to next badge

**D. Reviews Modal**
- Total reviews left
- Average rating given
- Recent reviews
- WoW change

**E. Views Modal**
- Total profile views
- **WoW metrics (e.g., "+12 this week", "+10%")**
- Recent viewers
- Peak day

**F. Credibility Modal**
- Review credibility score
- **Accurate rating distribution from reviews table**
- **Total reviews left (from reviews WHERE author_id = user)**
- Credibility factors
- Tips to improve

### Step 3: Update MyGaragePage.tsx

**Changes Needed:**

1. **Import the new modals**
```typescript
import { RepBreakdownModal } from '../components/RepBreakdownModal';
import { GarageStatsModal } from '../components/GarageStatsModal';
```

2. **Add modal state**
```typescript
const [showRepBreakdown, setShowRepBreakdown] = useState(false);
const [showVehiclesModal, setShowVehiclesModal] = useState(false);
const [showSpotsModal, setShowSpotsModal] = useState(false);
const [showBadgesModal, setShowBadgesModal] = useState(false);
const [showReviewsModal, setShowReviewsModal] = useState(false);
const [showViewsModal, setShowViewsModal] = useState(false);
const [showCredibilityModal, setShowCredibilityModal] = useState(false);
```

3. **Load WoW data**
```typescript
const [weeklyChange, setWeeklyChange] = useState({
  followers: 0,
  views: 0,
  spots: 0,
  posts: 0,
  badges: 0,
  vehicles: 0
});

async function loadWeeklyChanges() {
  const thisWeekStart = getWeekStart(new Date());
  const lastWeekStart = getWeekStart(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const [thisWeek, lastWeek] = await Promise.all([
    supabase.from('user_weekly_stats').select('*').eq('user_id', user.id).eq('week_start', thisWeekStart).maybeSingle(),
    supabase.from('user_weekly_stats').select('*').eq('user_id', user.id).eq('week_start', lastWeekStart).maybeSingle()
  ]);

  if (thisWeek.data && lastWeek.data) {
    setWeeklyChange({
      followers: thisWeek.data.followers_count - lastWeek.data.followers_count,
      views: thisWeek.data.profile_views_count - lastWeek.data.profile_views_count,
      // ... etc
    });
  }
}
```

4. **Update Overview tab stats to open modals**

Change from:
```typescript
<div onClick={() => onNavigate?.('garage')}>
```

To:
```typescript
<div onClick={() => setShowVehiclesModal(true)}>
```

Do this for:
- Vehicles → `setShowVehiclesModal(true)`
- Spots → `setShowSpotsModal(true)`
- Badges → `setShowBadgesModal(true)`
- Reviews → `setShowReviewsModal(true)`
- Views → `setShowViewsModal(true)`
- Credibility → `setShowCredibilityModal(true)`

5. **Update Rep tab**

- Change "TAP FOR BREAKDOWN" to open `RepBreakdownModal`
- Add descriptions for each section
- Replace the bar chart with a speedometer gauge
- Wire rating distribution to actual database queries from `reviews` table

6. **Move Stickers Section**

Move the stickers display from Rep tab to Overview tab

### Step 4: Wire Review Ratings to Database

**Current Issue**: Rating distribution shows hardcoded values

**Fix Needed**: Query the actual reviews table

```typescript
// Get reviews WHERE author_id = userId
const { data: userReviews } = await supabase
  .from('reviews')
  .select('driver_score')
  .eq('author_id', userId);

// Calculate distribution
const distribution = {
  5: userReviews.filter(r => r.driver_score >= 90).length,
  4: userReviews.filter(r => r.driver_score >= 70 && r.driver_score < 90).length,
  3: userReviews.filter(r => r.driver_score >= 50 && r.driver_score < 70).length,
  2: userReviews.filter(r => r.driver_score >= 30 && r.driver_score < 50).length,
  1: userReviews.filter(r => r.driver_score < 30).length,
};
```

### Step 5: Fix Views Display Issue

**Current Issue**: Shows "0" but also "+12 week"

**Fix**:
1. Ensure `profile_views` table has data
2. Calculate WoW change correctly from `user_weekly_stats`
3. Show either "No views yet" or the actual count with WoW change

## Design Specifications

All modals should follow this pattern:

```typescript
- Mobile: Bottom sheet with slide-up animation (translate-y-full → translate-y-0)
- Desktop: Centered modal with fade-in
- Border radius: rounded-t-3xl on mobile, rounded-xl on desktop
- Header: Icon + Title + Close button
- Background: bg-surface with border-surfacehighlight
- Cards: bg-background with gradient accents
- WoW indicators: Green up arrow for positive, red down arrow for negative
```

## Testing Checklist

After implementation, test:
- [ ] All stat cards open correct modals
- [ ] Rep breakdown shows accurate calculations
- [ ] WoW changes display correctly (or "No data yet")
- [ ] Rating distribution matches database
- [ ] Total reviews count is accurate
- [ ] Views stat makes sense (no contradictions)
- [ ] Stickers appear in Overview tab
- [ ] Rep tab has descriptions
- [ ] Speedometer gauge works
- [ ] All modals close properly
- [ ] Mobile responsive design works

## Summary of Files

**Created:**
1. `/src/components/RepBreakdownModal.tsx` - Rep point breakdown
2. `/src/components/GarageStatsModal.tsx` - Reusable stats modal
3. `supabase/migrations/20260219_add_user_weekly_stats.sql` - WoW tracking
4. `/GARAGE_ENHANCEMENTS_PLAN.md` - Complete plan document
5. `/GARAGE_IMPLEMENTATION_STEPS.md` - This file

**Need Updates:**
1. `/src/pages/MyGaragePage.tsx` - Main implementation
2. Create 6 more specific modal components (Vehicles, Spots, Badges, Reviews, Views, Credibility)

## Open Items Requiring Your Confirmation

1. **Apply the SQL migration** - I cannot apply migrations directly. You need to run the migration in `supabase/migrations/20260219_add_user_weekly_stats.sql`

2. **Create remaining modal components** - I've created the base and RepBreakdown. The other 6 specific modals need to be created.

3. **Implement weekly stats population** - The migration creates the table and function, but you'll need to call `update_user_weekly_stats()` periodically (e.g., via a cron job or edge function).

4. **Test WoW calculations** - Need to populate some weekly data to test the "+X this week" displays.

Would you like me to proceed with creating all the remaining modal components and updating MyGaragePage.tsx now?
