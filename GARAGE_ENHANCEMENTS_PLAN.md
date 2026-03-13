# Garage Page Enhancements - Implementation Plan

## Database Schema Review

### Current Metrics Tracked:
1. **Profiles Table**
   - `reputation_score` - Total rep points
   - `avg_driver_rating` - Average rating from reviews
   - `driver_rating_count` - Number of reviews received

2. **Social Metrics** (via relationships)
   - Followers count (`follows` table where `following_id = user`)
   - Following count (`follows` table where `follower_id = user`)
   - Profile views (`profile_views` table)

3. **Content Metrics**
   - Posts count (`posts` table)
   - Spot count (`spot_history` table)
   - Comments count (`post_comments` table)
   - Likes received (`post_likes` table where post author = user)

4. **Vehicle Metrics**
   - Total vehicles owned
   - Claimed vehicles
   - Verified vehicles

5. **Gamification Metrics**
   - Badges earned (`user_badges` table)
   - Stickers received on vehicles (`vehicle_stickers` table)

### Reputation Point Sources (Current Formula):
- Posts created: **×10 points**
- Comments left: **×3 points**
- Likes received: **×5 points**
- Badges earned: **×20 points**
- Vehicle verifications: **×50 points**
- Positive stickers: **×2 points**
- Negative stickers: **×-5 points**

## Required Enhancements

### 1. Rep Breakdown Modal ✅ CREATED
**Trigger**: Click on Rep score in Overview tab or "TAP FOR BREAKDOWN" on Rep tab
**Content**:
- Visual breakdown of reputation sources
- Posts: X × 10 = Y points
- Comments: X × 3 = Y points
- Likes: X × 5 = Y points
- Badges: X × 20 = Y points
- Verifications: X × 50 = Y points
- Positive Stickers: X × 2 = Y points
- Negative Stickers: X × -5 = Y points

### 2. Vehicles Modal (NEEDS CREATION)
**Trigger**: Click on "Vehicles" stat in Overview
**Content**:
- Total vehicles count
- Breakdown: Shadow / Conditional / Standard / Verified
- Recent additions
- WoW change

### 3. Spots Modal (NEEDS CREATION)
**Trigger**: Click on "Spots" stat in Overview
**Content**:
- Total spots created
- Recent spots with thumbnails
- Most spotted vehicle
- WoW change

### 4. Badges Modal (NEEDS CREATION)
**Trigger**: Click on "Badges" stat in Overview
**Content**:
- Total badges earned
- Breakdown by category
- Recent badges
- Rarity distribution

### 5. Reviews Modal (NEEDS CREATION)
**Trigger**: Click on "Reviews" stat in Overview
**Content**:
- Total reviews left
- Average rating given
- Recent reviews
- WoW change

### 6. Views Modal (NEEDS CREATION)
**Trigger**: Click on "Views" stat in Overview
**Content**:
- Total profile views
- **WoW change (e.g., +12 this week, +10%)**
- Recent viewers (if not anonymous)
- Peak viewing day

### 7. Credibility Modal (NEEDS CREATION)
**Trigger**: Click on "Credibility" stat in Overview
**Content**:
- Review credibility score
- **Total reviews left**
- **Accurate rating distribution from database**
- Factors affecting credibility
- Tips to improve

### 8. Rep Tab Enhancements (NEEDED)
- Add descriptions for each section
- Replace uneven bar chart with car-inspired gauge (speedometer/tachometer)
- Wire rating distribution to actual database queries

### 9. Overview Tab Changes (NEEDED)
- Move Stickers section from Rep tab to Overview tab
- All stats should open modals instead of routing

## Week-over-Week (WoW) Tracking

### Required Migration:
```sql
CREATE TABLE user_weekly_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,

  -- Counts
  followers_count int DEFAULT 0,
  following_count int DEFAULT 0,
  profile_views_count int DEFAULT 0,
  posts_count int DEFAULT 0,
  spots_count int DEFAULT 0,
  comments_count int DEFAULT 0,
  likes_received_count int DEFAULT 0,
  vehicles_count int DEFAULT 0,
  badges_count int DEFAULT 0,

  -- Reputation
  reputation_score int DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);
```

This would track snapshots weekly and allow:
- "+4 followers this week"
- "+10% profile views"
- "+2 badges earned"

## Design Pattern

All modals should follow the "Spot a Ride" modal design:
- Bottom sheet on mobile, centered on desktop
- Rounded top corners (rounded-t-3xl)
- Slide up animation
- Header with icon + title + close button
- Scrollable content area
- Stats cards with gradient backgrounds
- WoW indicators with up/down arrows

## Next Steps

1. ✅ Create RepBreakdownModal component
2. ✅ Create GarageStatsModal base component
3. Create specific modal variants (Vehicles, Spots, Badges, Reviews, Views, Credibility)
4. Create SQL migration for weekly stats tracking
5. Update Overview tab to use modals instead of routing
6. Move Stickers section to Overview
7. Update Rep tab with descriptions and new gauge
8. Wire accurate rating distribution data
9. Test all modals and WoW calculations
