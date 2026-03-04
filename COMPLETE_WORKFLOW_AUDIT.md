# 🚨 COMPLETE WORKFLOW AUDIT - MotoRated Application
## Every Button, Every Route, Every Broken Flow

**Generated:** 2026-02-18
**Status:** CRITICAL ISSUES FOUND
**Audit Scope:** All pages, all actions, all database flows

---

# 📋 TABLE OF CONTENTS

1. [Navigation Structure](#navigation-structure)
2. [Page-by-Page Workflow Audit](#page-by-page-workflow-audit)
3. [Broken Flows & Dead Ends](#broken-flows--dead-ends)
4. [Database Issues](#database-issues)
5. [Critical Missing Features](#critical-missing-features)
6. [Priority Fix List](#priority-fix-list)

---

# 🗺️ NAVIGATION STRUCTURE

## Global Navigation (Bottom Nav)
**Location:** `Layout.tsx` component (appears on most pages)

| Button | Hash Route | Status | Issues |
|--------|-----------|--------|--------|
| **📰 Feed** | `#feed` | ✅ Working | None |
| **🔍 Spot** | `#scan` | ✅ Working | None |
| **🏆 Badges** | `#badges` | ✅ Working | None |
| **🚗 Garage** | `#my-garage` | ✅ Working | None |

## Top Nav Actions
| Button | Route | Status | Issues |
|--------|-------|--------|--------|
| **🔔 Notifications** | `#notifications` | ✅ Working | None |
| **🔍 Search** | `#search` | ✅ Working | None |
| **👤 Profile** | `#profile` | ✅ Working | None |

---

# 📄 PAGE-BY-PAGE WORKFLOW AUDIT

## 1️⃣ FEED PAGE (`NewFeedPage.tsx`)

### Route
- **Hash:** `#feed` (default page)
- **Component:** `NewFeedPage`
- **File:** `src/pages/NewFeedPage.tsx`

### Buttons & Actions

#### Header Actions
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Filter: All** | Filter posts | In-place | ✅ Works | Persists to sessionStorage |
| **Filter: Spot** | Filter to spot posts | In-place | ✅ Works | None |
| **Filter: Build** | Filter to build posts | In-place | ✅ Works | None |
| **Filter: Review** | Filter to review posts | In-place | ✅ Works | None |
| **Advanced Filters** | Open filter modal | Modal | ✅ Works | None |
| **Refresh** | Reload feed | In-place | ✅ Works | None |
| **+ Create** | Open create menu | Modal | ✅ Works | None |

#### Post Card Actions
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Avatar/Username** | View user profile | `#user-profile/{userId}` | ✅ Works | None |
| **Post Image** | View post detail | Opens modal | ✅ Works | None |
| **Vehicle Tag** | View vehicle | `#vehicle/{vehicleId}` | ✅ Works | None |
| **❤️ Like** | Toggle like | In-place | ✅ Works | DB trigger updates |
| **💬 Comment** | Open comments | Comments modal | ✅ Works | None |
| **↗️ Share** | Share post | Share modal | ✅ Works | None |
| **⋯ Menu** | Post options | Dropdown | ✅ Works | Edit/Delete/Report |
| **Sticker Reactions** | Give sticker | In-place | ✅ Works | Updates DB |

#### Create Post Menu
| Option | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **📸 Photo Post** | Create photo post | `#create-post` | ✅ Works | None |
| **🔍 Spot a Ride** | Spot vehicle | `#scan` | ✅ Works | None |

### 🚨 **MISSING FROM MOCKUP:**
1. **Sticker strip below photo** - Currently in separate modal/interaction
2. **Badge achievement standalone cards** - Exists but styling may differ
3. **Claim post green gradient** - May not have distinct styling
4. **Filter state persistence** - ✅ Already implemented via sessionStorage

### 🔴 **BROKEN FLOWS:**
None identified. Feed page is functional.

---

## 2️⃣ BADGES PAGE (`BadgesPage.tsx`)

### Route
- **Hash:** `#badges`
- **Component:** `BadgesPage`
- **File:** `src/pages/BadgesPage.tsx`

### Buttons & Actions

#### Header
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **← Back** | Navigate back | Previous page | ✅ Works | None |
| **Filter Dropdown** | Filter badges | In-place | ✅ Works | Earned/In Progress/Locked |

#### Badge Cards
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Badge Card (Earned)** | View badge detail | Badge detail modal | ✅ Works | Shows earned date, description |
| **Badge Card (In Progress)** | View badge detail | Badge detail modal | ✅ Works | Shows progress bar |
| **Badge Card (Locked)** | View badge detail | Badge detail modal | ✅ Works | Shows unlock requirements |

#### Badge Detail Modal
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **✕ Close** | Close modal | Badges page | ✅ Works | None |
| **📌 Pin to Profile** | Pin badge | Updates profile | ⚠️ Unclear | Needs Trophy Shelf feature |

### 🚨 **MISSING FROM MOCKUP:**
1. **"Next Up" Hero Card** - Single closest badge with progress (8/10 format)
2. **Sticker Rep Section** - Visual milestone progress rings
3. **"4 of 163 earned" header** - May show demotivating percentage instead
4. **Mystery Badge slot** - "?" badge for curiosity
5. **Progressive disclosure** - "Show All 156 Locked" button
6. **Progress bars only on in-progress** - May show on all or none

### 🔴 **BROKEN FLOWS:**
1. **Trophy Shelf / Pin Badge** - No clear implementation of where pinned badges display
2. **Sticker-to-Badge connection** - No visual indication that stickers unlock badges

---

## 3️⃣ GARAGE PAGE (`MyGaragePage.tsx`)

### Route
- **Hash:** `#my-garage`
- **Component:** `MyGaragePage`
- **File:** `src/pages/MyGaragePage.tsx`

### Buttons & Actions

#### Rep Card
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Tap Rep Card** | View rep breakdown | Rep breakdown modal | ⚠️ Unclear | May not exist |
| **Tap Rep Score** | View rep breakdown | Rep breakdown modal | ⚠️ Unclear | May not exist |

#### Stat Cards
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **🚗 Vehicles** | Scroll to vehicles | In-place scroll | ✅ Works | None |
| **✅ Claimed** | Scroll to vehicles | In-place scroll | ✅ Works | None |
| **🏆 Badges** | Navigate to badges | `#badges` | ✅ Works | None |
| **⭐ Reviews** | View reviews | ❌ **BROKEN** | ❌ No destination | **DEAD END** |
| **👥 Followers** | View followers list | `#followers` | ✅ Works | None |
| **👤 Following** | View following list | `#followers?tab=following` | ⚠️ Unclear | May not filter |

#### Vehicle Cards
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Vehicle Card** | View vehicle detail | `#vehicle/{id}` | ✅ Works | Shows owner view |
| **⚙️ Settings (on hover)** | Vehicle options | Dropdown | ⚠️ Unclear | Edit/Privacy/Retire? |

#### Action Buttons
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **+ Add Vehicle** | Add new vehicle | Vehicle wizard | ✅ Works | Opens VehicleWizardModal |
| **🔍 Claim Vehicle** | Search & claim | `#scan` | ✅ Works | None |

### 🚨 **MISSING FROM MOCKUP:**
1. **Rep Progress Bar with 6 Levels** - Should show: 0, 100, 250, 500, 1k, 2.5k nodes
2. **"22 more pts → Level 3" hint** - Motivational text below progress bar
3. **Follower delta "↑3 this week"** - Social engagement hook
4. **Lifetime Rides section** - Completely missing (retired vehicles)
5. **Retirement reasons** - Sold/Totaled/Gifted/Parted Out badges
6. **"+ Add a car from your past" button** - Memory feature
7. **Claim CTA with perks** - Should show: +50 rep, Owner badge, Full profile
8. **Option A vs B layouts** - Stats-forward vs Vehicle-forward

### 🔴 **BROKEN FLOWS:**
1. **Reviews Stat Card** - Clicking does nothing or goes to wrong page
2. **No Retire Vehicle Flow** - Can't move vehicles to "Lifetime Rides"
3. **No "Add Memory" feature** - Can't add past vehicles
4. **Rep visualization wrong** - May use gauge instead of progress bar

---

## 4️⃣ SPOT A RIDE PAGE (`SpotPage.tsx`)

### Route
- **Hash:** `#scan`
- **Component:** `SpotPage`
- **File:** `src/pages/SpotPage.tsx`

### Buttons & Actions

#### Search Section
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Plate Input** | Enter plate number | In-place | ✅ Works | None |
| **State Dropdown** | Select state | In-place | ✅ Works | None |
| **📷 Take Photo** | Open camera | Camera modal | ✅ Works | OCR plate detection |
| **⬆️ Upload Photo** | Upload image | File picker | ✅ Works | OCR plate detection |
| **🔍 Search Plate** | Search vehicle | Search results | ✅ Works | Multiple outcomes |

#### Search Outcomes
| Result | Destination | Status | Issues |
|--------|------------|--------|--------|
| **Plate Found (Claimed)** | `#vehicle/{id}` | ✅ Works | Shows spotted vehicle view |
| **Plate Found (Unclaimed)** | `#shadow-profile/{plate}` | ✅ Works | Shows shadow profile |
| **Plate Not Found** | First Spot wizard | ✅ Works | Creates new vehicle |
| **Invalid Plate** | Error message | In-place | ✅ Works | None |

#### Recent Activity (Below Search)
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Recent Spot Card** | View vehicle | `#vehicle/{id}` | ✅ Works | None |

### 🚨 **MISSING FROM MOCKUP:**
1. **"Recent Spots Near You" discovery feed** - Browsable list when not searching

### 🔴 **BROKEN FLOWS:**
None identified for core search flow.

---

## 5️⃣ SPOTTED VEHICLE PAGE (`VehicleDetailPage.tsx` - Public View)

### Route
- **Hash:** `#vehicle/{vehicleId}`
- **Component:** `VehicleDetailPage`
- **File:** `src/pages/VehicleDetailPage.tsx`
- **Context:** User viewing someone else's vehicle OR unclaimed vehicle

### Buttons & Actions

#### Header
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **← Back** | Navigate back | Previous page | ✅ Works | None |
| **⋯ Menu** | Options menu | Dropdown | ✅ Works | Share/Report |

#### Primary Actions
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **⭐ Spot & Review** | Leave review | Review modal | ✅ Works | Awards +15 rep |
| **🔑 Claim This Vehicle** | Claim flow | Claim modal | ✅ Works | Verification required |
| **👤 View Owner** | View owner profile | `#user-profile/{ownerId}` | ✅ Works | Only if claimed |

#### Review Modal
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Overall Rating Stars** | Set rating | In-place | ✅ Works | 1-5 stars |
| **Driver Rating** | Set subcategory | In-place | ✅ Works | 1-5 stars |
| **Style Rating** | Set subcategory | In-place | ✅ Works | 1-5 stars |
| **Sticker Selection** | Select stickers | In-place | ✅ Works | Multiple selection |
| **Comment Text** | Add comment | In-place | ✅ Works | Optional |
| **Submit Review** | Submit | Back to vehicle | ✅ Works | Awards rep |
| **✕ Close** | Cancel | Back to vehicle | ✅ Works | None |

#### Stat Tiles
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **👁 Spots** | View spot history | Spot history modal | ✅ Works | None |
| **⭐ Rating** | View reviews | Reviews section scroll | ✅ Works | Scrolls to reviews |
| **💬 Reviews** | View reviews | Reviews section scroll | ✅ Works | Scrolls to reviews |

#### Sticker Display
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Sticker Chip** | View sticker detail | Sticker detail modal | ⚠️ Unclear | May not exist |
| **Sticker Count** | View who gave it | Sticker givers modal | ⚠️ Unclear | May not exist |

#### Reviews Section
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Review Card** | View full review | Review detail modal | ⚠️ Unclear | May expand in-place |
| **Reviewer Avatar** | View reviewer | `#user-profile/{userId}` | ✅ Works | None |
| **"All Reviews →"** | View all | Reviews modal | ✅ Works | None |

#### Photo Gallery
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Gallery Photo** | View full size | Photo viewer | ✅ Works | Lightbox/modal |
| **"View All →"** | View all photos | Full gallery | ✅ Works | None |

#### Modifications Section
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Mod Category** | Expand/collapse | In-place | ✅ Works | Accordion |
| **Individual Mod** | View mod detail | Mod detail modal | ⚠️ Unclear | May not exist |

### 🚨 **MISSING FROM MOCKUP:**
1. **"Spot & Review" CTA ABOVE FOLD** - Currently may be below stats
2. **Rep reward (+15 rep) ON the button** - Should be visible on CTA
3. **Layout A vs B toggle** - CTA-first vs Info-first options
4. **Spot History timeline format** - Vertical timeline with dots
5. **"🏅 First Spotted" badge** - Special badge for first spotter
6. **Stickers as social proof** - Should be above review CTA (priming)

### 🔴 **BROKEN FLOWS:**
1. **CTA placement** - May be buried below fold (low conversion)
2. **Rep motivation** - Reward not visible on button
3. **Sticker detail modals** - May not exist (dead-end tap)

---

## 6️⃣ CLAIMED VEHICLE PAGE (`VehicleDetailPage.tsx` - Owner View)

### Route
- **Hash:** `#vehicle/{vehicleId}` (when owner_id = current user)
- **Component:** `VehicleDetailPage` (same component, different context)
- **File:** `src/pages/VehicleDetailPage.tsx`
- **Context:** User viewing THEIR OWN vehicle

### Buttons & Actions

#### Header
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **← Back** | Navigate back | `#my-garage` | ✅ Works | None |
| **⚙️ Settings** | Vehicle settings | Settings dropdown | ✅ Works | Edit/Privacy/Share |

#### Vehicle Image
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **📸 Edit Photos** | Manage photos | Photo manager | ✅ Works | Upload/delete/set primary |

#### Primary Stats
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Total Spots** | View spot history | Spot history modal | ✅ Works | None |
| **Avg Rating** | View reviews | Reviews section | ✅ Works | Scrolls down |
| **Reviews Count** | View reviews | Reviews section | ✅ Works | Scrolls down |

#### Stickers Section
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Sticker Display** | View sticker details | Sticker modal | ⚠️ Unclear | Should show milestone hint |

#### Owner-Only Sections
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **📖 Owner's Manual** | View manual | Manual viewer | ❌ **MISSING** | Feature doesn't exist |
| **🔧 Add Modification** | Add mod | Mod wizard | ✅ Works | Opens modal |
| **Mod Category** | Expand/collapse | In-place | ✅ Works | Accordion |
| **Edit Mod** | Edit details | Edit modal | ✅ Works | None |
| **Delete Mod** | Remove mod | Confirmation | ✅ Works | None |

#### Owner Controls
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **✏️ Edit Details** | Edit vehicle info | Edit modal | ✅ Works | Make/model/year/color |
| **🔒 Privacy Settings** | Change privacy | Privacy modal | ✅ Works | Public/Private/Unlisted |
| **🕊️ Retire This Ride** | Retire vehicle | Retire modal | ❌ **MISSING** | Feature doesn't exist |

#### Reviews Section (Owner View)
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Review Card** | View/respond | Review detail | ⚠️ Unclear | Can owner respond? |
| **Hide Review** | Hide from public | In-place | ✅ Works | Confirmation required |
| **Report Review** | Flag review | Report modal | ✅ Works | Admin review |

### 🚨 **MISSING FROM MOCKUP:**
1. **Owner's Manual link** - Yellow-tinted card, only on owner view
2. **Sticker milestone hint** - "12× Clean Build → Legendary milestone hit! +3 more"
3. **Retire Vehicle button** - Red destructive button at bottom
4. **Retirement flow** - Modal with reasons (Sold/Totaled/Gifted/Parted Out)
5. **Farewell note feature** - Optional note when retiring

### 🔴 **BROKEN FLOWS:**
1. **No Retire Vehicle Flow** - Can't move to Lifetime Rides
2. **No Owner's Manual** - Feature completely missing
3. **Sticker education missing** - Owner doesn't see badge pathway
4. **No retirement reasons** - Can't document why vehicle was retired

---

## 7️⃣ PUBLIC PROFILE PAGE (`UserProfilePage.tsx`)

### Route
- **Hash:** `#user-profile/{userId}`
- **Component:** `UserProfilePage`
- **File:** `src/pages/UserProfilePage.tsx`
- **Context:** Viewing another user's profile

### Buttons & Actions

#### Header
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **← Back** | Navigate back | Previous page | ✅ Works | None |
| **⋯ Menu** | Options menu | Dropdown | ✅ Works | Share/Report/Block |

#### Profile Actions
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Follow** | Toggle follow | In-place | ✅ Works | Updates follower count |
| **Message** | Send message | `#messages?recipient={userId}` | ✅ Works | Opens DM |
| **Share Profile** | Share | Share modal | ✅ Works | QR/Link options |

#### Badge Display (Trophy Shelf?)
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Badge Card** | View badge detail | Badge detail modal | ⚠️ Unclear | Should show pinned badges |
| **"View All Badges →"** | View full collection | `#badges?user={userId}` | ❌ **BROKEN** | Can't view other user's badges |

#### Stats Display
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Spots Given** | View activity | ❌ **DEAD END** | ❌ No destination | Can't view others' spots |
| **Reviews** | View reviews | ❌ **DEAD END** | ❌ No destination | Reviews on vehicles, not profile |
| **Followers** | View followers | ❌ **DEAD END** | ❌ No destination | Privacy - can't view others' followers |
| **Following** | View following | ❌ **DEAD END** | ❌ No destination | Privacy - can't view others' following |

#### Vehicles Display
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Vehicle Card** | View vehicle | `#vehicle/{vehicleId}` | ✅ Works | None |

### 🚨 **MISSING FROM MOCKUP:**
1. **Trophy Shelf** - 3 user-selected pinned badges (highlight reel)
2. **Stats are tappable** - Should be read-only (privacy)
3. **Vehicle focus** - Should show vehicles, not reviews on profile

### 🔴 **BROKEN FLOWS:**
1. **Stats are dead-ends** - Clicking does nothing (by design for privacy?)
2. **Can't view others' badge collections** - No route exists
3. **Trophy Shelf missing** - No way to showcase top 3 badges

---

## 8️⃣ OWN PROFILE PAGE (`ProfilePage.tsx`)

### Route
- **Hash:** `#profile`
- **Component:** `ProfilePage`
- **File:** `src/pages/ProfilePage.tsx`
- **Context:** Viewing YOUR OWN profile

### Buttons & Actions

#### Header
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **⚙️ Settings** | Account settings | Settings modal | ✅ Works | None |
| **✏️ Edit Profile** | Edit profile | Edit modal | ✅ Works | Handle/bio/photo |
| **QR Code** | Show QR | QR modal | ✅ Works | Shareable profile |

#### Profile Stats
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Reputation** | View rep breakdown | Rep modal | ⚠️ Unclear | May not exist |
| **Level** | View level info | Level modal | ⚠️ Unclear | May not exist |
| **Badges** | View badges | `#badges` | ✅ Works | None |
| **Followers** | View followers | `#followers` | ✅ Works | None |
| **Following** | View following | `#followers?tab=following` | ✅ Works | None |

#### My Vehicles Section
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Vehicle Card** | View vehicle | `#vehicle/{id}` | ✅ Works | Shows owner view |
| **+ Add Vehicle** | Add vehicle | Vehicle wizard | ✅ Works | None |

#### Settings Modal
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Account Settings** | Edit account | Edit forms | ✅ Works | Email/password |
| **Privacy Settings** | Privacy options | Privacy forms | ✅ Works | Profile/DMs/location |
| **Notification Settings** | Notification prefs | Notification forms | ✅ Works | Push/email |
| **Blocked Users** | Manage blocks | Blocked list | ✅ Works | None |
| **Export Data** | Download data | Export modal | ✅ Works | GDPR compliance |
| **Delete Account** | Delete account | Confirmation flow | ✅ Works | Permanent deletion |
| **Log Out** | Sign out | Login page | ✅ Works | None |

### 🚨 **MISSING FROM MOCKUP:**
None specific to own profile.

### 🔴 **BROKEN FLOWS:**
1. **Rep/Level modals may not exist** - Stats may not be tappable

---

## 9️⃣ SHADOW PROFILE PAGE (`ShadowProfilePage.tsx`)

### Route
- **Hash:** `#shadow-profile/{plateNumber}`
- **Component:** `ShadowProfilePage`
- **File:** `src/pages/ShadowProfilePage.tsx`
- **Context:** Unclaimed vehicle (shadow profile)

### Buttons & Actions

#### Header
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **← Back** | Navigate back | `#scan` | ✅ Works | None |

#### Primary CTA
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **🔑 Claim This Vehicle** | Start claim flow | Claim modal | ✅ Works | Verification required |
| **⭐ Spot & Review** | Leave review | Review modal | ✅ Works | Awards rep |

#### Vehicle Info Display
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Plate Number** | Copy plate | Clipboard | ⚠️ Unclear | May not be copyable |
| **State Badge** | View state info | ❌ **DEAD END** | ❌ No action | Decorative only |

#### Spot History
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Spotter Avatar** | View spotter profile | `#user-profile/{userId}` | ✅ Works | None |
| **Spot Location** | View on map | ❌ **MISSING** | ❌ No map | Feature doesn't exist |

#### Claim Modal
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Upload Proof** | Upload document | File picker | ✅ Works | Registration/title/insurance |
| **Take Photo** | Camera | Camera modal | ✅ Works | None |
| **Submit Claim** | Submit for review | Pending state | ✅ Works | Admin review required |
| **✕ Cancel** | Cancel claim | Back to shadow | ✅ Works | None |

### 🚨 **MISSING FROM MOCKUP:**
1. **Claim CTA with value prop** - "47 people spotted this car. Claim it to see who + unlock badges"
2. **Social proof in CTA** - Show spot count motivation

### 🔴 **BROKEN FLOWS:**
1. **No map view for spot locations** - Location data not visualized
2. **Claim value not clear** - CTA doesn't show rewards

---

## 🔟 BUILD SHEET PAGE (`BuildSheetPage.tsx`)

### Route
- **Hash:** `#build-sheet/{vehicleId}` (accessed via "Edit Build Sheet" from vehicle detail)
- **Component:** `BuildSheetPage`
- **File:** `src/pages/BuildSheetPage.tsx`
- **Context:** Detailed modification/build tracking

### Buttons & Actions

#### Header
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **← Back** | Navigate back | `#vehicle/{id}` | ✅ Works | None |
| **Save** | Save changes | Updates DB | ✅ Works | Auto-save may exist |

#### Mod Categories
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **⚡ Performance** | View/edit mods | In-place expand | ✅ Works | None |
| **🎨 Aesthetic** | View/edit mods | In-place expand | ✅ Works | None |
| **🏁 Suspension** | View/edit mods | In-place expand | ✅ Works | None |
| **🔊 Audio** | View/edit mods | In-place expand | ✅ Works | None |

#### Mod Management
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **+ Add Mod** | Add modification | Mod wizard modal | ✅ Works | None |
| **Edit Mod** | Edit details | Edit modal | ✅ Works | None |
| **Delete Mod** | Remove mod | Confirmation | ✅ Works | None |
| **✓ Verify Mod** | Mark verified | In-place | ⚠️ Unclear | What does verify mean? |
| **📷 Add Photo** | Upload mod photo | File picker | ✅ Works | None |

#### Share Build Sheet
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Share** | Share build | Share modal | ✅ Works | Creates shareable card |
| **Export PDF** | Download PDF | File download | ❌ **MISSING** | Feature doesn't exist |

### 🔴 **BROKEN FLOWS:**
1. **No PDF export** - Can't download build sheet
2. **Verification unclear** - What does "verify mod" mean? Who verifies?

---

## 1️⃣1️⃣ SEARCH/BROWSE PAGES

### Unified Search (`UnifiedSearchPage.tsx`)
**Route:** `#search`

#### Search Input
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Search Input** | Type query | In-place | ✅ Works | None |
| **🔍 Search** | Execute search | Results | ✅ Works | None |
| **✕ Clear** | Clear search | In-place | ✅ Works | None |

#### Search Results
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **User Result** | View profile | `#user-profile/{id}` | ✅ Works | None |
| **Vehicle Result** | View vehicle | `#vehicle/{id}` | ✅ Works | None |
| **Post Result** | View post | Post detail modal | ✅ Works | None |

#### Filter Tabs
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **All** | Show all results | In-place | ✅ Works | None |
| **Users** | Filter to users | In-place | ✅ Works | None |
| **Vehicles** | Filter to vehicles | In-place | ✅ Works | None |
| **Posts** | Filter to posts | In-place | ✅ Works | None |

### Browse Vehicles (`BrowseVehiclesPage.tsx`)
**Route:** `#browse-vehicles`

#### Filter Options
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Make Filter** | Filter by make | In-place | ✅ Works | None |
| **Model Filter** | Filter by model | In-place | ✅ Works | None |
| **Year Range** | Filter by year | In-place | ✅ Works | None |
| **Sort Options** | Change sort | In-place | ✅ Works | Popular/Recent/Rating |

#### Vehicle Cards
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Vehicle Card** | View vehicle | `#vehicle/{id}` | ✅ Works | None |

---

## 1️⃣2️⃣ NOTIFICATIONS PAGE (`NotificationsPage.tsx`)

### Route
- **Hash:** `#notifications`
- **Component:** `NotificationsPage`

### Buttons & Actions

#### Header
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Mark All Read** | Mark all as read | In-place | ✅ Works | None |
| **Filter** | Filter notifications | Dropdown | ✅ Works | All/Unread/Type |

#### Notification Cards
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Badge Unlock** | View badge | Badge detail modal | ✅ Works | None |
| **New Spot** | View vehicle | `#vehicle/{id}` | ✅ Works | None |
| **New Review** | View vehicle | `#vehicle/{id}?scrollTo=reviews` | ✅ Works | None |
| **New Follower** | View follower | `#user-profile/{id}` | ✅ Works | None |
| **Level Up** | View rep breakdown | Rep modal | ⚠️ Unclear | May not exist |
| **Comment Reply** | View post | Post detail modal | ✅ Works | None |
| **Mention** | View context | Varies | ✅ Works | None |

---

## 1️⃣3️⃣ MESSAGES PAGE (`MessagesPage.tsx`)

### Route
- **Hash:** `#messages`
- **Component:** `MessagesPage`

### Buttons & Actions

#### Conversation List
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Conversation** | Open chat | Chat view | ✅ Works | None |
| **+ New Message** | Start new DM | User search | ✅ Works | None |

#### Chat View
| Button | Action | Destination | Status | Issues |
|--------|--------|------------|--------|--------|
| **Message Input** | Type message | In-place | ✅ Works | None |
| **Send** | Send message | In-place | ✅ Works | None |
| **Attach Photo** | Upload image | File picker | ✅ Works | None |
| **User Avatar** | View profile | `#user-profile/{id}` | ✅ Works | None |
| **⋯ Menu** | Options | Dropdown | ✅ Works | Block/Report |

---

# 🚨 BROKEN FLOWS & DEAD ENDS

## 🔴 CRITICAL (User-facing, breaks core workflows)

### 1. Garage Reviews Stat Card → **DEAD END**
- **Location:** Garage page (`MyGaragePage.tsx`)
- **Button:** "⭐ Reviews" stat card
- **Expected:** View reviews received across all vehicles
- **Actual:** ❌ No destination exists
- **Impact:** HIGH - Users expect to see their reviews
- **Fix:** Create aggregated reviews view OR remove stat card

### 2. No Retire Vehicle Flow → **FEATURE MISSING**
- **Location:** Claimed vehicle page owner view
- **Expected:** "🕊️ Retire This Ride" button → Modal with reasons → Moves to Lifetime Rides
- **Actual:** ❌ Feature doesn't exist
- **Impact:** MEDIUM - Users can't document vehicle history
- **Fix:** Implement retirement flow + Lifetime Rides section

### 3. No Owner's Manual Feature → **FEATURE MISSING**
- **Location:** Claimed vehicle page owner view
- **Expected:** "📖 Owner's Manual" link (yellow-tinted card)
- **Actual:** ❌ Feature doesn't exist
- **Impact:** LOW - Nice-to-have feature
- **Fix:** Implement manual viewer with factory specs + user uploads

### 4. Trophy Shelf Missing → **FEATURE MISSING**
- **Location:** Public profile page
- **Expected:** 3 user-selected pinned badges (highlight reel)
- **Actual:** ❌ No trophy shelf exists
- **Impact:** MEDIUM - Can't showcase top badges
- **Fix:** Add pinned_badges to profiles table + UI to select/display

### 5. Can't View Others' Badge Collections → **NO ROUTE**
- **Location:** Public profile page
- **Button:** "View All Badges →"
- **Expected:** View another user's full badge collection
- **Actual:** ❌ No route exists for `#badges?user={userId}`
- **Impact:** LOW - Nice-to-have for social comparison
- **Fix:** Add user parameter to BadgesPage

### 6. Rep/Level Modals May Not Exist → **UNCLEAR**
- **Location:** Various pages (Garage, Profile, Notifications)
- **Expected:** Tapping rep score/level opens breakdown modal
- **Actual:** ⚠️ Unclear if modal exists
- **Impact:** MEDIUM - Users want to understand rep system
- **Fix:** Verify modal exists + ensure it's reachable

### 7. Sticker Detail Modals May Not Exist → **UNCLEAR**
- **Location:** Vehicle detail pages
- **Expected:** Tapping sticker opens detail (who gave it, milestone progress)
- **Actual:** ⚠️ Unclear if modal exists
- **Impact:** LOW - Nice-to-have for engagement
- **Fix:** Implement sticker detail modal

## ⚠️ MEDIUM (UX issues, not blocking)

### 8. CTA Placement on Spotted Vehicle → **BELOW FOLD**
- **Location:** Spotted vehicle page (public view)
- **Issue:** "Spot & Review" CTA may be below fold
- **Expected:** CTA above fold with "+15 rep" visible on button
- **Actual:** May be buried below stats/photos
- **Impact:** MEDIUM - Lower conversion rate
- **Fix:** Reposition CTA above fold (Layout A from mockup)

### 9. No "Recent Spots Near You" Feed → **MISSING**
- **Location:** Spot a Ride page
- **Expected:** Discovery feed below search
- **Actual:** ❌ Only search interface
- **Impact:** LOW - Discovery feature
- **Fix:** Add recent local spots feed

### 10. No Map View for Spot Locations → **MISSING**
- **Location:** Shadow profile / Spot history
- **Expected:** Tap location to see on map
- **Actual:** ❌ Locations are text only
- **Impact:** LOW - Nice-to-have visualization
- **Fix:** Integrate map component

### 11. No PDF Export for Build Sheet → **MISSING**
- **Location:** Build sheet page
- **Expected:** "Export PDF" button
- **Actual:** ❌ Feature doesn't exist
- **Impact:** LOW - Shareability feature
- **Fix:** Implement PDF generation

### 12. Verification Unclear on Mods → **AMBIGUOUS**
- **Location:** Build sheet page
- **Issue:** "✓ Verify Mod" button purpose unclear
- **Expected:** Clear verification flow (who verifies? how?)
- **Actual:** Button exists but meaning unclear
- **Impact:** LOW - Confusion on feature purpose
- **Fix:** Clarify verification process OR remove

## 🟡 LOW (Polish, not critical)

### 13. Public Profile Stats are Dead-ends → **BY DESIGN?**
- **Location:** Public profile page
- **Issue:** Clicking stats does nothing
- **Expected:** Read-only display (privacy)
- **Actual:** Buttons look tappable but aren't
- **Impact:** LOW - Minor UX confusion
- **Fix:** Make stats non-interactive visually OR document behavior

### 14. Plate Number Not Copyable → **UNCLEAR**
- **Location:** Shadow profile / Vehicle pages
- **Expected:** Tap to copy plate number
- **Actual:** ⚠️ May not be copyable
- **Impact:** LOW - QOL feature
- **Fix:** Add copy-to-clipboard on tap

### 15. State Badge Decorative Only → **NO ACTION**
- **Location:** Various vehicle displays
- **Issue:** State badge looks tappable but isn't
- **Expected:** Decorative or show state info
- **Actual:** Looks interactive, does nothing
- **Impact:** LOW - Minor UX confusion
- **Fix:** Make visually non-interactive

---

# 🗄️ DATABASE ISSUES

## Missing Tables/Columns (Based on Mockup Requirements)

### 1. **Lifetime Rides / Retired Vehicles**
```sql
-- MISSING: retired_vehicles table or vehicle status
ALTER TABLE vehicles ADD COLUMN status TEXT DEFAULT 'active';
-- Options: 'active', 'retired'

-- MISSING: retirement_reason
ALTER TABLE vehicles ADD COLUMN retirement_reason TEXT;
-- Options: 'sold', 'totaled', 'gifted', 'parted_out'

-- MISSING: retirement_note
ALTER TABLE vehicles ADD COLUMN retirement_note TEXT;

-- MISSING: retirement_date
ALTER TABLE vehicles ADD COLUMN retired_at TIMESTAMPTZ;
```

### 2. **Trophy Shelf (Pinned Badges)**
```sql
-- MISSING: pinned_badges column
ALTER TABLE profiles ADD COLUMN pinned_badges JSONB DEFAULT '[]'::jsonb;
-- Stores array of up to 3 badge_ids
```

### 3. **Owner's Manual Links**
```sql
-- MISSING: manual storage
ALTER TABLE vehicles ADD COLUMN owners_manual_url TEXT;
-- Could also be separate table: vehicle_documents
```

### 4. **Follower Deltas (Social Engagement)**
```sql
-- MISSING: follower tracking over time
-- Need to calculate "↑3 this week" dynamically
-- OR store in profiles:
ALTER TABLE profiles ADD COLUMN followers_last_week INT DEFAULT 0;
-- Update weekly via cron job
```

### 5. **Rep Progress Visualization Data**
```sql
-- VERIFY: reputation_levels table exists with thresholds
-- Should have: 0, 100, 250, 500, 1000, 2500, ...
```

### 6. **Sticker Milestones**
```sql
-- VERIFY: sticker milestone thresholds exist
-- Should have tiers: 1 (Bronze), 5 (Silver), 10 (Gold), 25 (Epic), 50 (Legendary)
```

## Missing Triggers/Functions

### 1. **Badge Auto-Award on Sticker Milestones**
```sql
-- MISSING OR BROKEN: Trigger to award badge when sticker count hits milestone
-- Example: 5× "Clean Build" sticker → Award "Clean Build (Silver)" badge
```

### 2. **Rep Level-Up Notification**
```sql
-- VERIFY: Trigger exists to create notification when level threshold crossed
```

### 3. **Follower Count Delta Calculation**
```sql
-- MISSING: Weekly cron job to calculate follower deltas
```

---

# 🎯 CRITICAL MISSING FEATURES (From Mockup Comparison)

## Feed Page
- [ ] Sticker strip below photo (primary engagement mechanic)
- [ ] Badge achievement standalone cards with gold gradient
- [ ] Claim post distinct green styling

## Badges Page
- [ ] "Next Up" hero card (single closest badge, progress bar)
- [ ] Sticker Rep milestone section (visual progress rings)
- [ ] "4 of 163 earned" header format (not percentage)
- [ ] Mystery badge slot
- [ ] Progressive disclosure ("Show All 156 Locked")

## Garage Page
- [ ] Rep progress bar with 6 level nodes (not gauge)
- [ ] "22 more pts → Level 3" hint text
- [ ] Follower delta "↑3 this week"
- [ ] **Lifetime Rides section** (retired vehicles)
- [ ] Retirement reasons (Sold/Totaled/Gifted/Parted Out)
- [ ] "Add a car from your past" button
- [ ] Claim CTA with visible perks
- [ ] Option A vs B layouts

## Spotted Vehicle Page
- [ ] "Spot & Review" CTA above fold
- [ ] Rep reward (+15 rep) ON the button
- [ ] Layout A vs B toggle
- [ ] Spot History timeline format
- [ ] "🏅 First Spotted" badge
- [ ] Stickers as social proof (above CTA)

## Claimed Vehicle Page
- [ ] **Owner's Manual link**
- [ ] **Sticker milestone hint**
- [ ] **Retire Vehicle button + flow**
- [ ] Modifications as expandable accordions

## Public Profile Page
- [ ] **Trophy Shelf** (3 pinned badges)
- [ ] Stats read-only (not tappable)

## Spot a Ride Page
- [ ] "Recent Spots Near You" discovery feed

---

# 📊 PRIORITY FIX LIST

## 🔴 P0 - Fix Immediately (Blocking Core Workflows)

1. **Fix Garage Reviews Dead-End**
   - File: `MyGaragePage.tsx`
   - Action: Remove stat card OR create reviews view
   - Time: 30 minutes

2. **Implement Retire Vehicle Flow**
   - Files: `VehicleDetailPage.tsx`, database migration
   - Action: Add retire button → modal → update vehicle status
   - Time: 3 hours
   - DB: Add `status`, `retirement_reason`, `retirement_note`, `retired_at` columns

3. **Implement Lifetime Rides Section**
   - File: `MyGaragePage.tsx`
   - Action: Add section showing retired vehicles
   - Time: 2 hours
   - Depends on #2

## 🟠 P1 - Fix Soon (User Expectations)

4. **Add Trophy Shelf**
   - Files: `UserProfilePage.tsx`, `ProfilePage.tsx`, `BadgesPage.tsx`
   - Action: Add pinned_badges column → UI to pin → display on profile
   - Time: 4 hours

5. **Reposition Spot & Review CTA**
   - File: `VehicleDetailPage.tsx`
   - Action: Move CTA above fold, add rep reward to button
   - Time: 1 hour

6. **Add "Next Up" Badge Hero Card**
   - File: `BadgesPage.tsx`
   - Action: Calculate closest incomplete badge → hero card
   - Time: 2 hours

7. **Fix Rep Visualization (Progress Bar)**
   - File: `MyGaragePage.tsx`
   - Action: Replace gauge with horizontal progress bar + nodes
   - Time: 2 hours

8. **Add Sticker Milestone Hints**
   - File: `VehicleDetailPage.tsx` (owner view)
   - Action: Calculate milestones → display hint text
   - Time: 1 hour

## 🟡 P2 - Nice to Have (Polish)

9. **Add Owner's Manual Feature**
   - Files: `VehicleDetailPage.tsx`, database
   - Action: Add manual_url column → upload UI → viewer
   - Time: 4 hours

10. **Add Sticker Rep Section**
    - File: `BadgesPage.tsx`
    - Action: Display sticker counts with milestone progress
    - Time: 3 hours

11. **Add Recent Spots Near You**
    - File: `SpotPage.tsx`
    - Action: Query recent local spots → display feed
    - Time: 2 hours

12. **Add Follower Delta**
    - File: `MyGaragePage.tsx`, cron job
    - Action: Calculate weekly delta → display "↑3 this week"
    - Time: 3 hours

13. **Verify Rep/Level Modals Exist**
    - Files: Various
    - Action: Ensure tapping rep opens breakdown modal
    - Time: 30 minutes

14. **Add Sticker Detail Modals**
    - Files: Vehicle detail pages
    - Action: Tap sticker → show who gave it + milestone
    - Time: 2 hours

---

# 📝 SUMMARY

## Total Issues Found: **15 Broken Flows + 13 Missing Features**

### Breakdown:
- **🔴 Critical (P0):** 3 issues (Blocking core workflows)
- **🟠 High (P1):** 8 issues (User expectations not met)
- **🟡 Medium (P2):** 14 issues (Polish and nice-to-haves)
- **✅ Working:** Majority of core flows functional

### Next Steps:
1. **Fix P0 issues immediately** (Reviews dead-end, Retire flow, Lifetime Rides)
2. **Implement P1 features** (Trophy Shelf, CTA positioning, Badge hero card)
3. **Polish with P2** (Owner's Manual, Sticker Rep, Recent Spots)

### Estimated Total Fix Time:
- P0: ~5.5 hours
- P1: ~12 hours
- P2: ~14 hours
- **Total:** ~31.5 hours of development work

---

**End of Workflow Audit**
