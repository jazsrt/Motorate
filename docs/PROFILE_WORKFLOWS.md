# Profile & Garage Workflow Documentation

## Overview
MotoRated has three distinct profile/garage interfaces, each serving a different purpose:

1. **ProfilePage** - Your complete personal dashboard
2. **MyGaragePage** - Focused garage management interface
3. **UserProfilePage** - Public profile view (what others see)

---

## 1. ProfilePage Workflow (`#profile`)

### Access Points
- Bottom navigation "Profile" icon (logged in users only)
- Direct URL: `/#profile`

### User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                    USER NAVIGATES TO PROFILE                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CHECK AUTHENTICATION                      │
│  • Must be logged in                                        │
│  • Must have verified email (if email provider)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    LOAD PROFILE DATA                         │
│  1. Profile info (handle, avatar, bio, stats)               │
│  2. MotoRated Score calculation                             │
│  3. Driver ratings & cool factor                            │
│  4. Badges (earned + in-progress)                           │
│  5. Vehicles from garage                                    │
│  6. Social stats (followers, following)                     │
│  7. Recent posts                                            │
│  8. Profile views analytics                                 │
│  9. Active challenges/quests                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DISPLAY DASHBOARD                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  HEADER SECTION                                      │  │
│  │  • Profile photo (click to upload)                   │  │
│  │  • Handle + Verified badge                           │  │
│  │  • Verification tier badge                           │  │
│  │  • Edit profile button                               │  │
│  │  • QR code for sharing                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SCORES & RATINGS                                    │  │
│  │  • MotoRated Score (circular gauge)                  │  │
│  │  • Reputation Score                                  │  │
│  │  • Driver Rating (speedometer)                       │  │
│  │  • Cool Factor                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PROFILE INSIGHTS (collapsible)                      │  │
│  │  • Profile views (total, last 7 days)                │  │
│  │  • Recent visitors                                   │  │
│  │  • Tag breakdown (JDM, Euro, Muscle, etc.)           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SOCIAL STATS                                        │  │
│  │  • Followers (clickable)                             │  │
│  │  • Following (clickable)                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BADGES SECTION                                      │  │
│  │  • Earned badges (with tiers)                        │  │
│  │  • Progress on locked badges                         │  │
│  │  • Click to see all badges                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  VEHICLES SECTION                                    │  │
│  │  • Grid of your vehicles                             │  │
│  │  • Click vehicle → VehicleDetailPage                 │  │
│  │  • Add new vehicle button                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  RECENT POSTS                                        │  │
│  │  • Your latest posts/content                         │  │
│  │  • Like/comment functionality                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ACTIONS                                             │  │
│  │  • Settings                                          │  │
│  │  • Sign Out                                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Available Actions

#### 1. Edit Profile
```
Click "Edit Profile" button
        ↓
Opens EditProfileModal
        ↓
User can update:
  • Handle (unique)
  • Bio
  • Social links (Instagram, TikTok, Spotify)
  • Location
        ↓
Save changes → Updates profiles table → Refreshes display
```

#### 2. Upload Profile Photo
```
Click on profile photo/avatar
        ↓
Opens PhotoUpload component
        ↓
User selects image
        ↓
Optimizes image (resize, compress)
        ↓
Uploads to Supabase Storage (avatars bucket)
        ↓
Updates profiles.avatar_url
        ↓
Refreshes display
```

#### 3. View Profile Insights
```
Click "Profile Insights" section
        ↓
Expands to show:
  • Total profile views
  • Views last 7 days
  • Recent visitors (avatars + handles)
  • Tag breakdown chart
        ↓
Calls get_profile_view_stats() function
Calls get_recent_visitors() function
```

#### 4. View Badges
```
Click "View All Badges" or badge category
        ↓
Navigate to BadgesPage (#badges)
        ↓
Shows all badge categories with progress
```

#### 5. View Vehicle
```
Click on any vehicle card
        ↓
Navigate to VehicleDetailPage (#vehicle-detail?id=...)
        ↓
Shows full vehicle details, build sheet, posts
```

#### 6. View Followers/Following
```
Click on follower/following count
        ↓
Navigate to FollowersPage (#followers or #following)
        ↓
Shows list of users with follow/unfollow controls
```

#### 7. Sign Out
```
Click "Sign Out" button
        ↓
Calls supabase.auth.signOut()
        ↓
Clears session
        ↓
Redirects to LoginPage
```

### Real-Time Updates
```
ProfilePage subscribes to:
  1. Badges table changes → Auto-refresh badge display
  2. Vehicles table changes → Auto-refresh vehicle grid
  3. Badge unlock notifications → Show BadgeUnlockModal
```

---

## 2. MyGaragePage Workflow (`#my-garage`)

### Access Points
- Main menu "My Garage" link
- Direct URL: `/#my-garage`

### User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                 USER NAVIGATES TO MY GARAGE                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CHECK AUTHENTICATION                      │
│  • Must be logged in                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    LOAD GARAGE DATA                          │
│  1. Profile (handle, avatar, bio, stats)                    │
│  2. All vehicles (claimed + shadow)                         │
│  3. Garage badges (not all badges)                          │
│  4. Social stats (followers, following, views)              │
│  5. Profile completion percentage                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DISPLAY GARAGE INTERFACE                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PROFILE HEADER (GarageProfileHeader)                │  │
│  │  • Avatar with edit icon                             │  │
│  │  • Handle + verified badge                           │  │
│  │  • Bio with edit icon                                │  │
│  │  • Social stats (followers, following, views)        │  │
│  │  • Privacy toggle (Public/Private profile)           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PROFILE COMPLETION (collapsible)                    │  │
│  │  • Progress bar (0-100%)                             │  │
│  │  • Checklist:                                        │  │
│  │    ☑ Profile photo uploaded                          │  │
│  │    ☑ Bio added                                       │  │
│  │    ☑ At least one vehicle claimed                    │  │
│  │    ☐ Social links added                              │  │
│  │    ☐ Build sheet completed                           │  │
│  │  • Badges earned for completion milestones           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GARAGE SECTION (GarageSection)                      │  │
│  │  • "Add Vehicle" button                              │  │
│  │  • Filter/sort controls                              │  │
│  │                                                       │  │
│  │  VEHICLE GRID (GarageVehicleGrid)                    │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │  │
│  │  │  Vehicle 1  │ │  Vehicle 2  │ │  Vehicle 3  │   │  │
│  │  │             │ │             │ │             │   │  │
│  │  │ [CLAIMED]   │ │ [VERIFIED]  │ │ [SHADOW]    │   │  │
│  │  │ Public 👁    │ │ Private 🔒  │ │ Unclaimed   │   │  │
│  │  │             │ │             │ │             │   │  │
│  │  │ Edit • View │ │ Edit • View │ │ Claim       │   │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘   │  │
│  │                                                       │  │
│  │  Each card shows:                                    │  │
│  │  • Vehicle photo                                     │  │
│  │  • Make/Model/Year                                   │  │
│  │  • License plate (blurred if shadow)                 │  │
│  │  • Status badge (Claimed/Verified/Shadow)            │  │
│  │  • Privacy icon (public/private)                     │  │
│  │  • Action buttons (Edit, View, Claim)                │  │
│  │  • Stickers collected                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GARAGE BADGES SECTION                               │  │
│  │  • Collector badges (1 car, 5 cars, 10 cars)         │  │
│  │  • Enthusiast badges (verified, modified, etc.)      │  │
│  │  • Progress indicators                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PRIVACY & EXPORT (GaragePrivacyExport)              │  │
│  │  • Export garage data (CSV download)                 │  │
│  │  • Privacy settings per vehicle                      │  │
│  │  • Data portability info                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Available Actions

#### 1. Toggle Profile Privacy
```
Click privacy toggle in header
        ↓
Update profiles.is_private (true/false)
        ↓
Effect:
  • Private: Only followers can view your profile/vehicles
  • Public: Anyone can view your profile/vehicles
        ↓
Shows confirmation toast
```

#### 2. Add New Vehicle
```
Click "Add Vehicle" button
        ↓
Opens VehicleWizardModal
        ↓
User enters:
  1. License plate
  2. VIN (optional)
  3. Make/Model/Year
  4. Photos
        ↓
Creates vehicle record
        ↓
Option to claim immediately if unclaimed
        ↓
Refreshes vehicle grid
```

#### 3. Edit Vehicle
```
Click "Edit" on vehicle card
        ↓
Opens VehicleProfileModal with edit mode
        ↓
User can update:
  • Photos
  • Build sheet details
  • Modifications
  • Stickers
  • Privacy setting (public/private)
        ↓
Save → Updates vehicle record → Refreshes grid
```

#### 4. View Vehicle Details
```
Click vehicle card or "View" button
        ↓
Navigate to VehicleDetailPage
        ↓
Shows full vehicle profile with tabs:
  • Gallery
  • Build Sheet
  • Modifications
  • Posts
  • Stickers
```

#### 5. Claim Shadow Vehicle
```
Click "Claim" on shadow vehicle
        ↓
Opens ClaimVehicleModal
        ↓
User must:
  1. Prove ownership (upload documents)
  2. Submit verification claim
        ↓
Creates record in verification_claims table
        ↓
Admin reviews claim
        ↓
If approved:
  • vehicle.owner_id = user.id
  • vehicle.is_claimed = true
  • Triggers badge checks
```

#### 6. Edit Profile Info
```
Click edit icon next to bio/avatar
        ↓
Opens EditProfileModal or PhotoUpload
        ↓
Update profile fields
        ↓
Save → Refreshes header
```

#### 7. Export Garage Data
```
Click "Export Data" button
        ↓
Calls exportGarageData() function
        ↓
Generates CSV with:
  • All vehicle details
  • Badges earned
  • Profile stats
        ↓
Downloads file: motorated-garage-{date}.csv
```

#### 8. Toggle Vehicle Privacy
```
In vehicle edit mode:
Toggle "Make Public/Private" switch
        ↓
Updates vehicles.is_private
        ↓
Effect:
  • Private: Only you can see this vehicle
  • Public: Visible on your public profile
```

### Real-Time Updates
```
MyGaragePage subscribes to:
  1. Vehicles table → Auto-refresh grid when vehicles added/updated
  2. Badges table → Update badge display
  3. Verification claims → Show status updates when claims processed
```

---

## 3. UserProfilePage Workflow (`#user-profile?userId=...`)

### Access Points
- Click any username anywhere in app
- Click avatar in feed/comments
- Search results
- Followers/following lists
- Direct URL: `/#user-profile?userId={uuid}`

### User Journey

```
┌─────────────────────────────────────────────────────────────┐
│              USER CLICKS ON ANOTHER USER'S PROFILE          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CHECK AUTHENTICATION                      │
│  • Must be logged in to view profiles                       │
│  • Cannot view your own profile here (redirects to #profile)│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    LOAD USER DATA                            │
│  1. Target user's profile                                   │
│  2. Check if blocked (by you or them)                       │
│  3. Check follow relationship                               │
│  4. Check privacy settings                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
                        ┌─────────┐
                        │ BLOCKED?│
                        └─────────┘
                         ↙       ↘
                    YES ↙         ↘ NO
                       ↓           ↓
         ┌──────────────────┐    ┌─────────────────────────────┐
         │ SHOW BLOCKED MSG │    │    CHECK PRIVACY SETTING    │
         │ "User unavailable"│    └─────────────────────────────┘
         └──────────────────┘                   ↓
                                      ┌─────────────────┐
                                      │ PROFILE PRIVATE?│
                                      └─────────────────┘
                                       ↙              ↘
                                  YES ↙                ↘ NO
                                     ↓                  ↓
                        ┌─────────────────────┐  ┌──────────────────┐
                        │ ARE YOU A FOLLOWER? │  │ SHOW FULL PROFILE│
                        └─────────────────────┘  └──────────────────┘
                         ↙                  ↘
                    YES ↙                    ↘ NO
                       ↓                      ↓
         ┌─────────────────────┐   ┌──────────────────────┐
         │ SHOW FULL PROFILE   │   │ SHOW LIMITED VIEW    │
         └─────────────────────┘   │ (PrivacyGate)        │
                                   │ • Basic info only     │
                                   │ • Follow button       │
                                   │ • Blurred content     │
                                   └──────────────────────┘
```

### Full Profile Display (Not Private OR Following)

```
┌─────────────────────────────────────────────────────────────┐
│                    USER PROFILE PAGE                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  HEADER                                              │  │
│  │  • Profile photo                                     │  │
│  │  • Handle + Verified badge                           │  │
│  │  • Verification tier badge                           │  │
│  │  • Bio                                               │  │
│  │  • Social links (clickable)                          │  │
│  │  • Follow button (or "Following" if already)         │  │
│  │  • Message button                                    │  │
│  │  • More menu (Block, Report)                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SCORES & RATINGS                                    │  │
│  │  • MotoRated Score                                   │  │
│  │  • Reputation Score                                  │  │
│  │  • Driver Rating                                     │  │
│  │  • Cool Factor                                       │  │
│  │  • "Rate This Driver" button                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SOCIAL STATS                                        │  │
│  │  • Followers (clickable)                             │  │
│  │  • Following (clickable)                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TABS: Garage | Posts | Badges                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GARAGE TAB                                          │  │
│  │  • Grid of PUBLIC vehicles only                      │  │
│  │  • Click vehicle → VehicleDetailPage                 │  │
│  │  • Shows verified badges on vehicles                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  POSTS TAB                                           │  │
│  │  • User's posts/content                              │  │
│  │  • Like/comment enabled                              │  │
│  │  • Sorted by recent                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BADGES TAB                                          │  │
│  │  • Earned badges showcase                            │  │
│  │  • Grouped by category                               │  │
│  │  • Shows tier levels                                 │  │
│  │  • No progress bars (only completed)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Available Actions

#### 1. Follow/Unfollow User
```
Click "Follow" button
        ↓
Insert into follows table:
  • follower_id = current user
  • following_id = target user
        ↓
Button changes to "Following"
        ↓
Triggers notification to target user
        ↓
Updates follower counts

Click "Following" button
        ↓
Shows confirmation dialog
        ↓
Delete from follows table
        ↓
Button changes to "Follow"
```

#### 2. Send Message
```
Click "Message" button
        ↓
Navigate to MessagesPage (#messages)
        ↓
Opens conversation with user
        ↓
(If no conversation exists, creates new one)
```

#### 3. Rate Driver
```
Click "Rate This Driver" button
        ↓
Opens RateDriverModal
        ↓
User provides:
  • Driver rating (1-5 stars)
  • Optional comment
  • Context (spotted on road, event, etc.)
        ↓
Inserts into ratings table
        ↓
Triggers MotoRated score recalculation
        ↓
Updates profile display
```

#### 4. Block User
```
Click "..." menu → "Block User"
        ↓
Shows confirmation dialog
        ↓
Inserts into blocks table:
  • blocker_id = current user
  • blocked_id = target user
        ↓
Effect:
  • Target user cannot see your profile/content
  • You cannot see their profile/content
  • Removes follow relationship
        ↓
Redirects back to feed
```

#### 5. Report User
```
Click "..." menu → "Report User"
        ↓
Opens ReportModal
        ↓
User selects reason:
  • Harassment
  • Fake profile
  • Inappropriate content
  • Spam
  • Other
        ↓
Inserts into reports table
        ↓
Queues for admin review
        ↓
Shows success message
```

#### 6. View Vehicle
```
Click on any vehicle card
        ↓
Navigate to VehicleDetailPage
        ↓
Shows vehicle details (if public)
```

#### 7. Switch Tabs
```
Click "Garage" tab → Shows vehicles
Click "Posts" tab → Loads and displays posts
Click "Badges" tab → Shows earned badges
```

### Privacy Gate (Private Profile + Not Following)

```
┌─────────────────────────────────────────────────────────────┐
│                    PRIVACY GATE SCREEN                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • Profile photo (visible)                           │  │
│  │  • Handle + verified badge (visible)                 │  │
│  │  • Bio (visible)                                     │  │
│  │  • Follow button                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         🔒 THIS PROFILE IS PRIVATE                   │  │
│  │                                                       │  │
│  │  Follow this user to see their:                      │  │
│  │  • Vehicles                                          │  │
│  │  • Posts                                             │  │
│  │  • Badges                                            │  │
│  │  • Full ratings                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [ Follow User ]                                            │
└─────────────────────────────────────────────────────────────┘
```

### Profile View Tracking
```
When profile loads:
        ↓
Insert into profile_views table:
  • viewer_id = current user (or null if guest)
  • viewed_profile_id = target user
  • viewed_at = now()
        ↓
Constraint: UNIQUE(viewer_id, viewed_profile_id, date)
  • Only counts once per day per user
        ↓
Target user can see view stats in their ProfilePage insights
```

---

## Privacy & Security Matrix

| Viewer Status | Profile Public | Profile Private + Following | Profile Private + Not Following |
|---------------|----------------|-----------------------------|---------------------------------|
| **Profile Info** | Full | Full | Basic only (handle, avatar, bio) |
| **Vehicles** | Public vehicles only | All vehicles | None (locked) |
| **Posts** | All posts | All posts | None (locked) |
| **Badges** | Earned badges | Earned badges | None (locked) |
| **Ratings** | Full scores | Full scores | Hidden |
| **Follow Button** | Yes | Shows "Following" | Yes |
| **Message Button** | Yes | Yes | No |
| **Rate Driver** | Yes | Yes | No |

---

## Database Tables Used

### ProfilePage & MyGaragePage
- `profiles` - User profile data
- `vehicles` - User's vehicles
- `badges` - All available badges
- `user_badges` - Badges earned by user
- `follows` - Follower relationships
- `profile_views` - View tracking
- `posts` - User's content
- `ratings` - Driver ratings received

### UserProfilePage
- `profiles` - Target user's profile
- `vehicles` - Target user's public vehicles
- `user_badges` - Target user's earned badges
- `posts` - Target user's posts
- `follows` - Check relationship
- `blocks` - Check if blocked
- `profile_views` - Track this view
- `ratings` - For rating the user

### Privacy Enforcement
- `profiles.is_private` - Profile-level privacy
- `vehicles.is_private` - Vehicle-level privacy
- `blocks` - User blocking
- RLS policies on all tables

---

## Navigation Flow Summary

```
LOGGED IN USER JOURNEY:

View Own Profile:
  Bottom nav → ProfilePage → Full personal dashboard

Manage Garage:
  Menu → MyGaragePage → Garage management interface

View Others:
  Click username/avatar → UserProfilePage → Public view with privacy gates

Guest Journey:
  Can view shadow profiles but cannot access full features
  Prompted to sign up/login for interaction
```

---

## Next Steps

1. Run `SHOW_CONVERSATIONS_SCHEMA.sql` to verify messaging columns
2. Run `SECTION_5_MINIMAL_FIX.sql` to enhance UserProfilePage
3. Integrate Section 4: User Reviews System (on hold)
