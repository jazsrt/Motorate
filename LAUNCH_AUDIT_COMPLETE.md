# MOTORATE — COMPLETE PRODUCTION LAUNCH AUDIT
**Date:** 2026-03-23
**Auditor:** Claude (Principal Engineer / Senior Product Designer / QA Lead / Launch Manager)
**Source of Truth:** `motorate-all pages mockup.html`, `CLAUDE.md`, `MOTORATE-MASTER-OPEN-ITEMS.md`

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Application Map](#2-application-map)
3. [UI / Design System Violations](#3-ui--design-system-violations)
4. [Workflow Gaps & Broken Flows](#4-workflow-gaps--broken-flows)
5. [Full Issue Register](#5-full-issue-register)
6. [Consolidated Open Items (Code + Backlog)](#6-consolidated-open-items)
7. [Launch Roadmap](#7-launch-roadmap)
8. [Claude Code Fix Plan](#8-claude-code-fix-plan)
9. [QA Smoke Test Plan](#9-qa-smoke-test-plan)
10. [Release Checklist](#10-release-checklist)
11. [Highest-Risk Unknowns](#11-highest-risk-unknowns)

---

# 1. EXECUTIVE SUMMARY

## Launch Readiness Verdict: NOT READY

There are 12 critical blockers that must be resolved before any user sees the app. The application has strong architectural bones — vehicle-first data model, separation of Track Vehicle / Follow Owner, correct 11-tier reputation system (Permit through Iconic), and a working spot flow. However, navigation does not match the design source of truth, core workflows are broken or unreachable, and security/compliance issues exist.

## Issue Counts

| Severity | Count |
|----------|-------|
| Critical | 12 |
| High     | 16 |
| Medium   | 15 |
| Low      | 9 |
| **TOTAL** | **52** |

## Top Blockers (must fix before launch)

1. Bottom nav tabs do not match mockup — Badges is missing, Search is in the wrong position
2. Create Post has zero UI entry points — owners cannot create content
3. OAuth users get auto-generated handles with no way to customize — OnboardingPage exists but is unreachable
4. DetailedSpot upgrade path drops `upgradeFromQuickSpot` and `existingReviewId` props — creates duplicate spots
5. `check_and_award_badges` SQL function never deployed to Supabase — badges never auto-award
6. CSP `font-src` missing `data:` — fonts may not render
7. CSP `connect-src` missing `https://api.auto.dev` — plate lookup breaks silently in production
8. `.env` contains real API keys in the project directory
9. 331 `console.log` statements across 81 files in production code
10. Layout.tsx uses Tailwind classes and CSS variables in violation of V11 "ALL inline styles" rule

---

# 2. APPLICATION MAP

## Codebase Statistics

| Category | Count |
|----------|-------|
| Pages | 37 |
| Components (total) | 102 |
| Hooks | 10 |
| Lib files | 49 |
| Contexts | 4 |
| Type definitions | 4 |
| Config files | 2 |
| Edge functions | 13 |
| Test files | 3 |
| **Total src files** | **~211** |

## Pages (37)

```
src/pages/AdminDashboard.tsx
src/pages/AlbumsPage.tsx
src/pages/AuthCallbackPage.tsx
src/pages/BadgeTestingPage.tsx
src/pages/BadgesPage.tsx
src/pages/BrowseVehiclesPage.tsx
src/pages/BuildSheetPage.tsx
src/pages/ChallengesPage.tsx
src/pages/ConfirmVehiclePage.tsx
src/pages/CreatePostPage.tsx
src/pages/DetailedSpotAndReviewPage.tsx
src/pages/EventsPage.tsx
src/pages/FollowersPage.tsx
src/pages/GloveboxPage.tsx
src/pages/InitAdminPage.tsx
src/pages/LoginPage.tsx
src/pages/MessagesPage.tsx
src/pages/MyGaragePage.tsx
src/pages/NewFeedPage.tsx
src/pages/NotificationsPage.tsx
src/pages/OnboardingPage.tsx
src/pages/PremiumPage.tsx
src/pages/PrivacyPolicy.tsx
src/pages/ProfilePage.tsx
src/pages/QuickSpotPage.tsx
src/pages/QuickSpotReviewPage.tsx
src/pages/RankingsPage.tsx
src/pages/RegisterPage.tsx
src/pages/ResetPasswordPage.tsx
src/pages/SafetyPage.tsx
src/pages/SearchPage.tsx
src/pages/SpotPage.tsx
src/pages/TermsOfService.tsx
src/pages/UnclaimedProfilePage.tsx
src/pages/UnifiedSearchPage.tsx
src/pages/UserProfilePage.tsx
src/pages/VehicleDetailPage.tsx
src/pages/VerifyEmailPage.tsx
```

## Components (102)

### Root level (79 files)
```
AddRetiredVehicleModal, AllReviewsModal, AutocompleteInput, Badge, BadgeCoin, BadgeDisplay,
BadgeIcon, BadgeUnlockModal, BlockUserButton, CameraCaptureModal, ClaimVehicleModalVerification,
CommentsModal, CompetitiveRankBar, CompletedReviewModal, Confetti, DisputeReviewModal,
EditCommentModal, EditPostModal, EditProfileModal, Feed, FollowButton, GarageSection,
GuestBottomNav, GuestJoinModal, InstallPrompt, Layout, LicensePlate, LiveStatsBar, Logo,
ModList, ModerationStatus, NearMissBadgeNudge, NotificationBell, OnboardingFlow, PhotoLightbox,
PlateFoundClaimed, PlateFoundUnclaimed, PlateNotFound, PlateSearch, PostCard, PrivacyGate,
ProfileInsights, PushNotificationPrompt, RateDriverModal, RateLimitError, ReactionButton,
RepHeroCard, ReportModal, ReportStolenModal, ReputationScore, RetireVehicleModal,
ReviewProfileSection, SearchFilters, ShareBuildCard, ShareButton, ShareCardGenerator,
StarRating, StarRatingInput, StatGauge, StickerSelector, StickerSlab, SuggestedUsers,
TierBadge, Toast, UserAvatar, UserQuickModal, VehicleFollowButton, VehicleQuickModal,
VehicleStats, VehicleStickerSelector, VehicleStickersDisplay, VerifiedBadge,
VerifyOwnershipModal, VideoPlayer, VinClaimModal
```

### Subdirectories
- `badges/` — BadgeCelebration, BadgeChip, BadgeCoin, BadgeList (4 files)
- `feed/` — CompetitionStrip, CompetitiveRankBar, FeedPostCard (3 files)
- `gauges/` — ArcGauge, DashLight, DigitalDisplay, ReputationGauge, SpeedometerGauge, index (6 files)
- `spot/` — CameraModal (1 file)
- `ui/` — EmptyState, ErrorBoundary, LoadingScreen, LoadingSpinner, Modal, ModalShell, PostCardSkeleton, Skeleton (8 files)

## Routing Architecture

- Custom hash-based router in `App.tsx` (not React Router, despite it being in dependencies)
- `parseUrl()` function handles deep links: `#/vehicle/{id}`, `#/user-profile/{id}`, `#/shadow/{plate}`, `#/post/{id}`
- Navigation via `handleNavigate(page, data)` function
- Lazy loading via `React.lazy()` + `Suspense` for most pages
- Page type union: 33 distinct page keys

## Navigation Structure

### Bottom Nav (as implemented)
```
Feed (LayoutGrid) | Rank (Activity) | [Camera FAB] | Search | Garage (Home)
```

### Bottom Nav (per HTML mockup — source of truth)
```
Feed (Grid) | Rank (Activity) | [Spot crosshair FAB] | Garage (Home) | Badges (Medal)
```

### Header
- Logo (left, navigates to feed)
- Search icon (right)
- Notification bell (right)

### Pages accessible ONLY via deep navigation (no nav button)
- Profile (inside Garage)
- CreatePost (UNREACHABLE — see CR-002)
- Messages, Followers, Albums, Settings, Premium, Events, Safety, Challenges

## Supabase Edge Functions (13)
```
calculate-reputation, detect-vehicle, evaluate-dispute, export-user-data, get-admin-stats,
hash-plate, lookup-plate, moderate-content, reset-badges, send-push-notification,
setup-admin, update-follower-snapshots, verify-document
```

Known deployment status:
- `lookup-plate` — deployed (Auto.dev integration)
- `hash-plate` — NOT deployed (client-side hashing used instead)
- `calculate-reputation` — NOT deployed
- Others — unknown

## Key Technical Stack
- React 18.3 + Vite 5.4 + TypeScript 5.5
- Supabase (auth, DB, storage, edge functions)
- Tailwind CSS 3.4 (but V11 rules say "no Tailwind")
- Lucide React icons
- Framer Motion animations
- Tesseract.js OCR
- Recharts
- Leaflet maps
- Sentry error tracking

---

# 3. UI / DESIGN SYSTEM VIOLATIONS

The HTML mockup (`motorate-all pages mockup.html`) defines 15 screens. Each screen was compared against the implementation.

## DSV-001: Bottom nav does not match mockup
- **ID:** CR-001 + CR-011
- **Severity:** Critical
- **Type:** Design Violation
- **Launch Blocker:** Yes
- **Area:** Navigation
- **Files:** `src/components/Layout.tsx` lines 109-116
- **Evidence:** Mockup bottom nav on ALL 15 screens: `Feed | Rank | [Spot] | Garage | Badges`. Implementation: `Feed | Rank | [Spot] | Search | Garage`.
- **Expected:** 5th tab is Badges (medal icon). Search is in header only.
- **Actual:** 5th tab is Garage. 4th tab is Search. Badges has no nav entry.
- **Root cause:** Layout.tsx `navRight` array defines Search and Garage instead of Garage and Badges.
- **Fix:** Change `navRight` to `[{ id: 'my-garage', icon: Home, label: 'Garage' }, { id: 'badges', icon: Award, label: 'Badges' }]`. Award icon is already imported.
- **Effort:** S

## DSV-002: Spot FAB icon differs from mockup
- **ID:** HI-013
- **Severity:** High
- **Type:** Design Violation
- **Launch Blocker:** No
- **Files:** `src/components/Layout.tsx` line 175
- **Evidence:** Mockup uses crosshair/target icon (circle + 8 radiating lines). Implementation uses Camera icon from lucide-react.
- **Expected:** Crosshair SVG matching mockup `.bni-spot-btn` content
- **Actual:** `<Camera size={24} />`
- **Fix:** Replace Camera icon with crosshair SVG from mockup (circle cx=12 cy=12 r=3 + radiating paths)
- **Effort:** XS

## DSV-003: Feed missing Canvas/Stream dual mode
- **ID:** HI-001
- **Severity:** High
- **Type:** Design Violation
- **Launch Blocker:** No
- **Files:** `src/pages/NewFeedPage.tsx`
- **Evidence:** Mockup defines two feed modes with a toggle: Canvas (full-bleed TikTok-style snap scroll, progress bars, score overlay, action pills) and Stream (Instagram-style cards with story rail). Implementation has only a list feed with scope tabs.
- **Expected:** Canvas/Stream toggle, full-screen vehicle cards in Canvas mode
- **Actual:** Single list feed with Near Me / Following / Top Ranked tabs
- **Fix:** P2 post-launch. Canvas mode is a major feature build.
- **Effort:** XL

## DSV-004: Feed missing story rail
- **ID:** MD-004
- **Severity:** Medium
- **Type:** Design Violation
- **Launch Blocker:** No
- **Evidence:** Mockup Stream mode has `.story-rail` with circular vehicle thumbnails (orange ring = unseen, dim ring = seen). Implementation has no story component.
- **Effort:** L

## DSV-005: Feed post card structure differs from mockup
- **ID:** HI-002
- **Severity:** High
- **Type:** Design Violation
- **Launch Blocker:** No
- **Evidence:** Mockup `.pcard`: 80% width centered, rounded 14px, card header (avatar + vehicle name + rank pill), 1:1 aspect photo, brand/model overlay on photo, stat strip below (RP/Spots/Trackers), action row, spotter strip. Implementation `FeedPostCard`: full-width, signal strip, 300px image, overlaid vehicle identity, impact row. Different structure.
- **Effort:** L

## DSV-006: Feed scope tabs not in mockup
- **ID:** HI-014
- **Severity:** High
- **Type:** Design Violation
- **Launch Blocker:** No
- **Evidence:** Implementation has Near Me / Following / Top Ranked tabs. Mockup has Canvas/Stream toggle + Filter button + location pill. No scope tabs exist in the mockup.
- **Effort:** S

## DSV-007: Feed missing Filter drawer
- **ID:** HI-015
- **Severity:** High
- **Type:** Missing Feature
- **Launch Blocker:** No
- **Evidence:** Mockup has a `.filter-drawer` with Make, Type, Year filter pills and Apply/Clear actions. Implementation has no filter drawer.
- **Effort:** L

## DSV-008: Rankings podium contradiction
- **ID:** HI-003
- **Severity:** High
- **Type:** Product Decision Required
- **Launch Blocker:** No
- **Evidence:** The HTML mockup (line 1063) includes a `.podium` section with gold/silver/bronze pedestals showing vehicle thumbnails and names. But MASTER-OPEN-ITEMS explicitly says: "NO podium layouts in rankings." Implementation has NO podium (just a list), which follows the text rule but not the visual mockup.
- **Resolution needed:** Owner must decide which is canonical. Implementation currently follows the text rule. No code change unless mockup is chosen.
- **Effort:** XS (decision only)

## DSV-009: Badges page layout differs from mockup
- **ID:** MD-005 + MD-006
- **Severity:** Medium
- **Type:** Design Violation
- **Launch Blocker:** No
- **Evidence:** Mockup: donut progress chart (60% earned), count (36 badges), horizontal category tabs (All/Spotting/Ranking/Social/Garage/Elite), 3-column hexagon grid with rarity colors and progress bars. Implementation: Earned/In Progress/Locked section tabs with 4-column badge grids.
- **Effort:** M

## DSV-010: Garage page not implemented per mockup
- **ID:** MD-001
- **Severity:** Medium
- **Type:** Design Violation
- **Launch Blocker:** No
- **Evidence:** Mockup: reduced hero (175px), avatar+name+tier+RP overlay, explicit "Follow Owner" + "Message" button row, stat bar (Vehicles/Spots/Followers/Badges), horizontal fleet scroll with 195px photo tiles, fleet-add dashed tile. Implementation: prompt 5 (Garage page polish) was never implemented per IMPLEMENTATION_STATUS.md.
- **Effort:** L

## DSV-011: Vehicle profile page not implemented per mockup
- **ID:** MD-002
- **Severity:** Medium
- **Type:** Design Violation
- **Launch Blocker:** No
- **Evidence:** Mockup: 310px hero image, back/share buttons, verification badge, make/model/year overlay, score row (RP + rank), CTAs (Track Vehicle + Encounter), stat strip (Spots/Trackers/Enc./RP), owner strip with separate Follow Owner button, follow-note explaining difference, photo strip, specs grid (3-col), encounter rows. Prompt 7 was never implemented.
- **Effort:** L

## DSV-012: Profile page not implemented per mockup
- **ID:** MD-003 + MD-014
- **Severity:** Medium
- **Type:** Design Violation
- **Launch Blocker:** No
- **Evidence:** Mockup: 190px hero, avatar overlapping bottom, name + handle + tier badge, stat bar (Vehicles/Spots/Badges/Followers), bio, 4 tabs (Fleet/Spots/Badges/Activity), fleet tiles, recent badges hexagons. Prompt 8 was never implemented.
- **Effort:** L

## DSV-013: Garage page "Follow Owner" row from mockup
- **ID:** MD-012
- **Severity:** Medium
- **Type:** Design Violation
- **Launch Blocker:** No
- **Evidence:** Mockup has explicit "Follow Owner" + "Message" row below hero with explanatory note: "Following the owner shows their full fleet activity. To track a specific car, visit that vehicle's profile." This dual-action pattern is a core product rule. Implementation needs audit to confirm this exists on the garage/profile page for OTHER users.
- **Effort:** M

## DSV-014: Layout.tsx uses Tailwind classes and CSS variables
- **ID:** CR-010
- **Severity:** Critical
- **Type:** Design Violation
- **Launch Blocker:** Yes
- **Files:** `src/components/Layout.tsx`
- **Evidence:** CLAUDE.md: "ALL inline styles. No Tailwind classes, no CSS variables (var(--xxx))." Layout.tsx uses: `className="topbar"`, `className="bot-nav"`, `className="flex items-center gap-3"` (Tailwind), `color: 'var(--accent)'`, `color: 'var(--t4)'` (CSS vars).
- **Fix:** Convert all className to inline styles. Replace all `var()` with hex values from V11 spec.
- **Effort:** M

## DSV-015: Manifest theme_color is blue
- **ID:** LO-001
- **Severity:** Low
- **Type:** Bug
- **Launch Blocker:** No
- **Files:** `public/manifest.json` line 8
- **Evidence:** `"theme_color": "#3b82f6"` (Tailwind blue). Should be `"#F97316"` (MotoRate orange) or `"#0a0a0a"` (dark).
- **Fix:** Change to `"#F97316"`
- **Effort:** XS

## DSV-016: PWA icons use old "motorated" branding
- **ID:** LO-002
- **Severity:** Low
- **Type:** Bug
- **Launch Blocker:** No
- **Files:** `public/manifest.json`, `public/motorated-icon-192.png`, `public/motorated-icon-512.png`
- **Evidence:** Files named `motorated-icon` not `motorate-icon`. Both icon files DO exist. The naming is cosmetic but inconsistent with current branding.
- **Effort:** XS

## DSV-017: Login page V11 redesign incomplete
- **ID:** MD-011
- **Severity:** Medium
- **Type:** Design Violation
- **Launch Blocker:** No
- **Evidence:** Mockup login: dark theme auth panel with car background, Rajdhani wordmark with orange R, email/password fields, sign-in button, divider "or", Google OAuth button, switch to register. Implementation matches general structure but MASTER-OPEN-ITEMS notes OAuth buttons broke after redesign.
- **Effort:** M

---

# 4. WORKFLOW GAPS & BROKEN FLOWS

## WF-001: Create Post has NO UI entry point
- **ID:** CR-002
- **Severity:** Critical
- **Launch Blocker:** Yes
- **Area:** Post creation
- **Files:** `src/components/Layout.tsx`, `src/App.tsx`, `src/pages/CreatePostPage.tsx`
- **Evidence:** Bottom nav center FAB navigates to `scan` (SpotPage). CreatePostPage is fully built (photo/video upload, vehicle tagging, location, privacy levels, rate limiting, reputation awards) but there is NO button, link, or menu item anywhere in the main navigation that routes to `create-post`. The only reference is in AlbumsPage.tsx line 206.
- **Repro:** Open app. Try to create a post (not a spot). No path exists.
- **Expected:** A "New Post" or "+" button accessible from feed, profile, or garage.
- **Actual:** CreatePostPage is orphaned. Owners cannot create content about their vehicles.
- **Root cause:** When the bottom nav was redesigned, the create-post entry point was lost.
- **Fix:** Add a "New Post" button to MyGaragePage header or ProfilePage. Or add it as a secondary action on the spot FAB (long-press or menu).
- **Effort:** S

## WF-002: OAuth users get auto-generated handle with no edit flow
- **ID:** CR-003
- **Severity:** Critical
- **Launch Blocker:** Yes
- **Area:** Authentication / Onboarding
- **Files:** `src/contexts/AuthContext.tsx` lines 41-51, `src/pages/OnboardingPage.tsx` (583 lines, complete but unreachable), `src/components/OnboardingFlow.tsx` (disabled, contains only `export {}`)
- **Evidence:** AuthContext.tsx line 42-44: when no profile exists, auto-generates handle from email prefix (`john_doe_123@gmail.com` becomes `john_doe_123`). OnboardingPage.tsx has a complete 2-step flow (handle selection + optional vehicle claim) but is never imported or routed to in App.tsx. OnboardingFlow.tsx is explicitly disabled.
- **Repro:** Sign in with Google OAuth for the first time. User lands on feed with auto-generated handle. No prompt to customize.
- **Expected:** New OAuth users should see OnboardingPage to choose their handle.
- **Actual:** Users get stuck with email-derived handle forever (unless they find EditProfileModal).
- **Root cause:** OnboardingFlow was disabled but OnboardingPage was never wired into App.tsx as replacement.
- **Fix:** In App.tsx, after the email verification check (line 344), add: if `profile?.onboarding_completed === false`, render `<OnboardingPage>`.
- **Effort:** M

## WF-003: DetailedSpot upgrade path drops critical props
- **ID:** CR-004
- **Severity:** Critical
- **Launch Blocker:** Yes
- **Area:** Spot flow
- **Files:** `src/App.tsx` lines 384-397
- **Evidence:** When QuickSpotReviewPage reward block navigates to `detailed-review` with `upgradeFromQuickSpot: true` and `existingReviewId`, App.tsx line 221 stores this in `wizardReviewData`. But lines 386-394 render DetailedSpotAndReviewPage WITHOUT forwarding those two props.
- **Repro:** Complete a Quick Spot. Click "Full Spot +5 RP" on the reward block. The DetailedSpotAndReviewPage renders but `upgradeFromQuickSpot` defaults to `false`, causing a NEW spot_history entry + review instead of upgrading the existing one. Duplicate spot.
- **Expected:** `upgradeFromQuickSpot={wizardReviewData.upgradeFromQuickSpot}` and `existingReviewId={wizardReviewData.existingReviewId}` passed.
- **Actual:** Props not forwarded. Defaults to new spot creation.
- **Fix:** Add two props to the JSX at App.tsx line ~386:
  ```
  upgradeFromQuickSpot={wizardReviewData.upgradeFromQuickSpot}
  existingReviewId={wizardReviewData.existingReviewId}
  ```
- **Effort:** XS

## WF-004: Badge auto-award SQL function not deployed
- **ID:** CR-005
- **Severity:** Critical
- **Launch Blocker:** Yes
- **Area:** Backend / Badges
- **Files:** `src/hooks/useBadgeChecker.ts`, 11 call sites across the codebase, `migrations/badge_auto_award_function_FINAL.sql`
- **Evidence:** `check_and_award_badges` RPC is called in QuickSpotReviewPage, DetailedSpotAndReviewPage, CreatePostPage, CommentsModal, FollowButton, RateDriverModal, reactions.ts, useBadgeChecker.ts. All calls are wrapped in try/catch that silently swallow errors. IMPLEMENTATION_STATUS.md confirms the SQL was never run.
- **Repro:** Perform any action (spot, post, comment, follow, like). Badge never awards. No error visible to user.
- **Expected:** Badges auto-award on milestone actions.
- **Actual:** RPC 400 error silently caught. No badges ever awarded.
- **Fix:** Run `badge_auto_award_function_FINAL.sql` in Supabase SQL Editor. Verify: `SELECT proname FROM pg_proc WHERE proname = 'check_and_award_badges'`
- **Effort:** S

## WF-005: CSP blocks `data:` fonts
- **ID:** CR-006
- **Severity:** Critical
- **Launch Blocker:** Yes
- **Area:** Security / Rendering
- **Files:** `index.html` line 20
- **Evidence:** CSP: `font-src 'self' https://fonts.gstatic.com`. Missing `data:`. Libraries like framer-motion or Tesseract.js may inject base64 fonts which get blocked. MASTER-OPEN-ITEMS flags: "Font CSP block — base64 fonts blocked by font-src policy. Rajdhani/Barlow may not be rendering."
- **Expected:** All V11 fonts render: Rajdhani, Barlow, Barlow Condensed, JetBrains Mono.
- **Actual:** Fonts may fall back to system fonts, destroying the entire visual design.
- **Fix:** Change to: `font-src 'self' https://fonts.gstatic.com data:`
- **Effort:** XS

## WF-006: CSP blocks Auto.dev API
- **ID:** CR-007
- **Severity:** Critical
- **Launch Blocker:** Yes
- **Area:** Security / Spot flow
- **Files:** `index.html` line 20
- **Evidence:** CSP `connect-src`: `'self' https://*.supabase.co wss://*.supabase.co https://data.opendatasoft.com https://vpic.nhtsa.dot.gov https://source.unsplash.com`. `https://api.auto.dev` is NOT listed. MASTER-OPEN-ITEMS marks "CSP updated to include https://api.auto.dev" as completed — this is incorrect.
- **Repro:** Search a plate. Auto.dev lookup silently fails due to CSP violation.
- **Expected:** Plate lookup returns vehicle data.
- **Actual:** Fetch blocked by CSP. Silent failure, no vehicle data returned.
- **Fix:** Add `https://api.auto.dev` to connect-src.
- **Effort:** XS

## WF-007: Real API keys in .env file
- **ID:** CR-008
- **Severity:** Critical
- **Launch Blocker:** Yes (security)
- **Area:** Security
- **Files:** `.env`
- **Evidence:** `.env` contains: Supabase anon key, VAPID public/private keys, Auto.dev API key. MASTER-OPEN-ITEMS says ".env confirmed gitignored" and this was marked completed. The file exists in the project directory.
- **Fix:** Verify `.gitignore` contains `.env`. Run `git status` to confirm it is not tracked. If it was ever committed, rotate all keys.
- **Effort:** XS

## WF-008: Console.log statements in production
- **ID:** CR-009
- **Severity:** Critical
- **Launch Blocker:** Yes
- **Area:** Performance / Security
- **Files:** 81 files across `src/`
- **Evidence:** 331 total `console.log/warn/error/debug/info` occurrences. These leak internal state, error details, and data structures to browser devtools. `vite-plugin-remove-console` exists in devDependencies but may not be configured.
- **Fix:** Enable the plugin in `vite.config.ts`. Add to plugins array: `removeConsole()` (imported from `vite-plugin-remove-console`).
- **Effort:** XS

## WF-009: Facebook OAuth handler exists but no button rendered
- **ID:** CR-012
- **Severity:** Critical
- **Launch Blocker:** No
- **Area:** Authentication
- **Files:** `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`
- **Evidence:** LoginPage has `handleOAuthSignIn` that accepts `'google' | 'facebook'`. Google button renders (line ~210). No Facebook button exists in JSX. RegisterPage same pattern. MASTER-OPEN-ITEMS notes: "Google/Facebook OAuth buttons broke after redesign and were partially fixed but not confirmed working."
- **Fix:** Either add Facebook OAuth button or remove the handler to avoid confusion.
- **Effort:** S

## WF-010: Full Spot missing Suspension and Presence ratings
- **ID:** HI-004
- **Severity:** High
- **Launch Blocker:** No
- **Area:** Spot flow
- **Files:** `src/pages/DetailedSpotAndReviewPage.tsx`
- **Evidence:** MASTER-OPEN-ITEMS: "Full Spot adds Looks, Sound, Suspension, Presence." Implementation has Looks, Sound, Condition. Missing: Suspension, Presence.
- **Fix:** Add two more StarRow fields for Suspension and Presence. Add columns or use existing DB fields.
- **Effort:** M

## WF-011: Stock images not auto-populating
- **ID:** HI-005
- **Severity:** High
- **Launch Blocker:** No
- **Area:** Vehicle data
- **Evidence:** MASTER-OPEN-ITEMS: "stock_image_url field exists in DB. GPT image lookup is the next step to actually populate the field." Auto.dev returns VIN data but no images. No image population pipeline exists.
- **Effort:** L

## WF-012: Spot workflow collects ratings before vehicle confirmed
- **ID:** HI-008
- **Severity:** High
- **Launch Blocker:** No
- **Area:** UX
- **Evidence:** MASTER-OPEN-ITEMS: "Ratings/photo being collected before vehicle identity is confirmed." The wizard goes: plate search -> vehicle data entry (if new) -> ratings. Users may be rating before knowing what vehicle they're looking at.
- **Effort:** L

## WF-013: VinClaimModal dead-end when onViewVehicle not provided
- **ID:** MD-015
- **Severity:** Medium
- **Launch Blocker:** No
- **Area:** UX
- **Files:** `src/components/VinClaimModal.tsx` line 496
- **Evidence:** After successful VIN claim (step='done'), the "View Vehicle Profile" button only renders if `onViewVehicle` prop is defined. If missing, user sees only the X close button. No way to navigate to their newly verified vehicle.
- **Fix:** Make onViewVehicle required, or add fallback navigation.
- **Effort:** S

## WF-014: CompletedReviewModal loads full feed behind overlay
- **ID:** MD-010
- **Severity:** Medium
- **Launch Blocker:** No
- **Area:** UX / Performance
- **Files:** `src/App.tsx` lines 501-502
- **Evidence:** When `currentPage === 'completed-review'`, the page content is `NewFeedPage` with `CompletedReviewModal` overlaid. The entire feed loads behind the modal (wasted work, may flash).
- **Fix:** Show a minimal backdrop instead of loading the full feed.
- **Effort:** S

## WF-015: GuestJoinModal uses window.location.reload()
- **ID:** LO-008
- **Severity:** Low
- **Launch Blocker:** No
- **Files:** `src/components/GuestJoinModal.tsx` line 11
- **Evidence:** "Create Account" button does `window.location.reload()`. All client state is lost.
- **Fix:** Use proper navigation to auth flow.
- **Effort:** XS

## WF-016: OnboardingPage exists but is dead code
- **ID:** HI-012
- **Severity:** High
- **Launch Blocker:** No
- **Files:** `src/pages/OnboardingPage.tsx` (583 lines)
- **Evidence:** Complete 2-step flow: handle selection with uniqueness validation, optional vehicle claim with registration upload and OCR verification. Never referenced in App.tsx. Could be wired in to fix WF-002.
- **Effort:** S (to wire in)

---

# 5. FULL ISSUE REGISTER

| ID | Title | Severity | Type | Area | Blocker | Effort |
|----|-------|----------|------|------|---------|--------|
| CR-001 | Bottom nav tabs do not match mockup (Badges missing) | Critical | Design Violation | Navigation | Yes | S |
| CR-002 | Create Post has no UI entry point | Critical | Missing Feature | Post creation | Yes | S |
| CR-003 | OAuth handle creation flow missing (OnboardingPage unreachable) | Critical | Broken Flow | Auth | Yes | M |
| CR-004 | DetailedSpot upgrade drops upgradeFromQuickSpot + existingReviewId | Critical | Bug | Spot flow | Yes | XS |
| CR-005 | check_and_award_badges SQL function not deployed | Critical | Backend | Badges | Yes | S |
| CR-006 | CSP font-src missing data: directive | Critical | Bug | Rendering | Yes | XS |
| CR-007 | CSP connect-src missing api.auto.dev | Critical | Bug | Spot flow | Yes | XS |
| CR-008 | .env contains real API keys in project dir | Critical | Security | Infra | Yes | XS |
| CR-009 | 331 console.log statements in production code | Critical | Performance | Infra | Yes | XS |
| CR-010 | Layout.tsx uses Tailwind + CSS vars (V11 violation) | Critical | Design Violation | Navigation | Yes | M |
| CR-011 | Mockup has Badges in bottom nav, impl has Search | Critical | Design Violation | Navigation | Yes | S |
| CR-012 | Facebook OAuth handler exists but no UI button | Critical | Missing Feature | Auth | No | S |
| HI-001 | Feed missing Canvas/Stream dual mode | High | Design Violation | Feed | No | XL |
| HI-002 | Feed post card structure differs from mockup | High | Design Violation | Feed | No | L |
| HI-003 | Rankings podium contradiction (mockup has it, text rule prohibits) | High | Product Decision | Rankings | No | XS |
| HI-004 | Full Spot missing Suspension + Presence ratings | High | Missing Feature | Spot flow | No | M |
| HI-005 | Stock images not auto-populating (GPT lookup not built) | High | Missing Feature | Vehicles | No | L |
| HI-006 | Badge images (40 PNGs) not wired into BadgeCoin | High | Missing Feature | Badges | No | M |
| HI-007 | rating_look/looks_rating dual column coalesce incomplete | High | Data | Feed/Queries | No | M |
| HI-008 | Spot workflow collects ratings before vehicle identity confirmed | High | UX | Spot flow | No | L |
| HI-009 | Plate visibility model decision pending | High | Product Decision | Privacy | No | XS |
| HI-010 | hash-plate edge function never deployed (client-side hashing) | High | Security | Infra | No | M |
| HI-011 | Owner cannot change vehicle primary photo | High | Missing Feature | Garage | No | M |
| HI-012 | OnboardingPage (583 lines) exists but is dead/unreachable | High | Dead Code | Auth | No | S |
| HI-013 | Spot FAB icon is Camera, mockup shows crosshair/target | High | Design Violation | Navigation | No | XS |
| HI-014 | Feed scope tabs (Near Me/Following/Top) not in mockup | High | Design Violation | Feed | No | S |
| HI-015 | Feed missing Filter drawer (Make/Type/Year per mockup) | High | Missing Feature | Feed | No | L |
| HI-016 | CSP connect-src marked done in backlog but actually missing | High | Process | Docs | No | XS |
| MD-001 | Garage page design prompt 5 not implemented | Medium | Missing Feature | Garage | No | L |
| MD-002 | Vehicle detail page prompt 7 not implemented | Medium | Missing Feature | Vehicle | No | L |
| MD-003 | Public profile page prompt 8 not implemented | Medium | Missing Feature | Profile | No | L |
| MD-004 | Feed missing story rail (mockup has vehicle stories) | Medium | Design Violation | Feed | No | L |
| MD-005 | Badges page categories differ from mockup (tabs vs horizontal cats) | Medium | Design Violation | Badges | No | M |
| MD-006 | Badges page hex grid differs from implementation tabs layout | Medium | Design Violation | Badges | No | M |
| MD-007 | sticker_name vs tag_name audit incomplete | Medium | Data | Stickers | No | S |
| MD-008 | Notifications do not deep-link to vehicle/ranking | Medium | UX | Notifications | No | M |
| MD-009 | External sharing not built | Medium | Missing Feature | Social | No | L |
| MD-010 | CompletedReviewModal loads full feed behind overlay | Medium | UX | Spot flow | No | S |
| MD-011 | Login page V11 redesign incomplete | Medium | Design Violation | Auth | No | M |
| MD-012 | Mockup garage has Follow Owner + Message row; impl needs verify | Medium | Design Violation | Garage | No | M |
| MD-013 | Mockup garage has fleet tiles (195px scroll); impl needs verify | Medium | Design Violation | Garage | No | M |
| MD-014 | Mockup profile has Fleet/Spots/Badges/Activity tabs | Medium | Design Violation | Profile | No | M |
| MD-015 | VinClaimModal dead-end when onViewVehicle missing | Medium | UX | Claim flow | No | S |
| LO-001 | Manifest theme_color is blue (#3b82f6) not orange | Low | Bug | PWA | No | XS |
| LO-002 | PWA icon files use "motorated" prefix (old brand) | Low | Bug | PWA | No | XS |
| LO-003 | Vercel deployment not configured | Low | Infra | Deploy | No | S |
| LO-004 | Anti-bot protection not implemented | Low | Security | Auth | No | M |
| LO-005 | Weekly Pulse owner stats not built | Low | Feature | Profile | No | L |
| LO-006 | Lifetime Rides / retired vehicle section not built | Low | Feature | Garage | No | L |
| LO-007 | Micro-interaction polish not done (animations, transitions) | Low | UX | Global | No | M |
| LO-008 | GuestJoinModal uses window.location.reload() | Low | UX | Auth | No | XS |
| LO-009 | calculate-reputation edge function not deployed | Low | Backend | Infra | No | S |

---

# 6. CONSOLIDATED OPEN ITEMS

## From MASTER-OPEN-ITEMS.md (still unresolved)

| Item | Status | Maps to |
|------|--------|---------|
| GPT image lookup for stock_image_url | Not started | HI-005 |
| Plate search 400 error (bad columns) | Needs verification — `spots_count` IS in columns, may be DB-side | Unknown-1 |
| VehicleDetailPage 'Platinum' crash | Resolved — VerificationTier handles Platinum | Closed |
| check_and_award_badges RPC 400 | SQL not deployed | CR-005 |
| Post button has no UI entry point | Confirmed missing | CR-002 |
| OAuth handle setup missing | Confirmed — OnboardingPage unreachable | CR-003 |
| Font CSP block | Confirmed — data: missing from font-src | CR-006 |
| PWA icon size mismatch | Icons exist, naming uses "motorated" prefix | LO-002 |
| sticker_name vs tag_name | Partially fixed, needs full audit | MD-007 |
| rating_look/looks_rating coalesce | Incomplete | HI-007 |
| Rankings page rebuild | Partially done — shows vehicles, no podium, but structure differs from mockup | HI-003 |
| Badge/tier system overhaul | Resolved in code — tiers are correct (Permit through Iconic) | Closed |
| Friends + Vehicle Follows | Resolved in code — VehicleFollowButton + FollowButton are separate | Closed |
| Spot workflow step order | Still wrong per MASTER-OPEN-ITEMS | HI-008 |
| Plate visibility model decision | Still pending | HI-009 |
| V11 mockup alignment | Major gaps identified (see Section 3) | Multiple DSVs |
| Badge images not wired | Still unwired | HI-006 |
| Tier-colored progress bars | Not built | MD-005 |
| Login page V11 redesign | Incomplete | MD-011 |
| Owner photo update | Not built | HI-011 |
| External sharing | Not built | MD-009 |
| Notifications deep-link | Not built | MD-008 |
| hash-plate edge function | Not deployed | HI-010 |
| calculate-reputation edge function | Not deployed | LO-009 |
| Console.log removal | Not done | CR-009 |
| Vercel deployment | Not configured | LO-003 |

## From IMPLEMENTATION_STATUS.md (still unresolved)

| Item | Status |
|------|--------|
| Badge SQL function deployment | Not run |
| Prompt 4 — Spot page layout | Not implemented |
| Prompt 5 — Garage/Profile polish | Not implemented |
| Prompt 7 — Vehicle detail page | Not implemented |
| Prompt 8 — Public profile page | Not implemented |
| Prompt 9 — Claimed vehicle page | Not implemented |
| Prompt 10 — Quick spot upgrade | Partially implemented (reward block exists) |

## From Code Audit (new findings)

| Finding | Maps to |
|---------|---------|
| Bottom nav wrong — Badges missing, Search in wrong spot | CR-001, CR-011 |
| Spot FAB icon wrong (Camera vs crosshair) | HI-013 |
| OnboardingPage exists (583 lines) but unreachable | HI-012 |
| DetailedSpot prop forwarding bug | CR-004 |
| CSP connect-src missing api.auto.dev (marked done but actually missing) | CR-007, HI-016 |
| 331 console.log statements | CR-009 |
| Feed scope tabs not in mockup | HI-014 |
| Feed missing filter drawer from mockup | HI-015 |
| GuestJoinModal page reload hack | LO-008 |
| VinClaimModal dead-end | MD-015 |
| CompletedReviewModal loads feed behind overlay | MD-010 |

---

# 7. LAUNCH ROADMAP

## P0 — Launch Blockers (must fix before any user sees the app)

| # | Task | Issue IDs | Effort | Files |
|---|------|-----------|--------|-------|
| 1 | Fix CSP: add `data:` to font-src, add `https://api.auto.dev` to connect-src | CR-006, CR-007 | XS | `index.html` |
| 2 | Fix bottom nav: replace Search with Badges as 5th tab | CR-001, CR-011 | S | `src/components/Layout.tsx` |
| 3 | Fix DetailedSpot upgrade: forward upgradeFromQuickSpot + existingReviewId | CR-004 | XS | `src/App.tsx` |
| 4 | Deploy badge_auto_award SQL function to Supabase | CR-005 | S | Supabase SQL Editor |
| 5 | Add Create Post entry point (button in MyGaragePage or ProfilePage) | CR-002 | S | Page file + Layout |
| 6 | Wire OnboardingPage for OAuth users with onboarding_completed=false | CR-003 | M | `src/App.tsx` |
| 7 | Convert Layout.tsx to inline styles (remove Tailwind + var()) | CR-010 | M | `src/components/Layout.tsx` |
| 8 | Enable vite-plugin-remove-console in vite.config.ts | CR-009 | XS | `vite.config.ts` |
| 9 | Verify .env is in .gitignore, keys never committed to repo | CR-008 | XS | `.gitignore` |
| 10 | Fix manifest theme_color to #F97316 | LO-001 | XS | `public/manifest.json` |

## P1 — Pre-Launch Critical (fix before public launch)

| # | Task | Issue IDs | Effort |
|---|------|-----------|--------|
| 11 | Add Facebook OAuth button to Login/Register | CR-012 | S |
| 12 | Fix rating_look/looks_rating coalesce across all queries | HI-007 | M |
| 13 | Wire 40 badge PNG images into BadgeCoin | HI-006 | M |
| 14 | Change Spot FAB icon from Camera to crosshair/target per mockup | HI-013 | XS |
| 15 | Add Suspension + Presence rating fields to Full Spot | HI-004 | M |
| 16 | Audit sticker_name/tag_name on all remaining surfaces | MD-007 | S |
| 17 | Fix CSP connect-src status in MASTER-OPEN-ITEMS doc | HI-016 | XS |

## P2 — Post-Launch (design alignment + features)

| # | Task | Issue IDs | Effort |
|---|------|-----------|--------|
| 18 | Implement feed Canvas mode (TikTok-style snap scroll) | HI-001 | XL |
| 19 | Implement feed post card per mockup structure | HI-002 | L |
| 20 | Add feed story rail | MD-004 | L |
| 21 | Add feed filter drawer (Make/Type/Year) | HI-015 | L |
| 22 | Implement Garage page per mockup (prompt 5) | MD-001 | L |
| 23 | Implement Vehicle Detail per mockup (prompt 7) | MD-002 | L |
| 24 | Implement Profile page per mockup (prompt 8) | MD-003 | L |
| 25 | Deploy hash-plate edge function (move hashing server-side) | HI-010 | M |
| 26 | Build stock image auto-population (GPT image lookup) | HI-005 | L |
| 27 | Build notification deep-links to vehicle/ranking pages | MD-008 | M |
| 28 | Build owner photo update feature | HI-011 | M |
| 29 | Build external sharing (OG meta, deep links) | MD-009 | L |

## P3 — Backlog

| Task | Effort |
|------|--------|
| Anti-bot protection (Cloudflare Turnstile) | M |
| QR decal partnerships | L |
| Brand pages (manufacturer aggregation) | XL |
| Lifetime Rides / retired vehicle section | L |
| Weekly Pulse owner stats | L |
| Micro-interaction polish (animations) | M |
| Vercel deployment configuration | S |

---

# 8. CLAUDE CODE FIX PLAN

Execute in this exact order to minimize rework and dependency conflicts.

## Task 1 — Fix CSP (XS, 2 minutes)
**File:** `index.html` line 20

Find the `font-src` directive and change:
```
font-src 'self' https://fonts.gstatic.com;
```
to:
```
font-src 'self' https://fonts.gstatic.com data:;
```

Find the `connect-src` directive and add `https://api.auto.dev` to the list.

## Task 2 — Fix DetailedSpot upgrade props (XS, 2 minutes)
**File:** `src/App.tsx` around line 386

Current:
```tsx
<DetailedSpotAndReviewPage
  onNavigate={handleNavigate}
  wizardData={wizardReviewData.wizardData || wizardData}
  driverRating={wizardReviewData.driverRating || 0}
  drivingRating={wizardReviewData.drivingRating || 0}
  vehicleRating={wizardReviewData.vehicleRating || 0}
  sentiment={wizardReviewData.sentiment || 'love'}
  comment={wizardReviewData.comment}
/>
```

Add two props:
```tsx
  upgradeFromQuickSpot={wizardReviewData.upgradeFromQuickSpot}
  existingReviewId={wizardReviewData.existingReviewId}
```

## Task 3 — Fix bottom nav (S, 15 minutes)
**File:** `src/components/Layout.tsx`

Change lines 113-116:
```tsx
const navRight = [
  { id: 'my-garage' as const, icon: Home, label: 'Garage' },
  { id: 'badges' as const, icon: Award, label: 'Badges' },
];
```

Update the `currentPage` type in the LayoutProps interface to include `'badges'` (already included).

Change the Spot FAB icon from `<Camera>` to the crosshair SVG:
```tsx
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
  <circle cx="12" cy="12" r="3"/>
  <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
</svg>
```

## Task 4 — Enable console stripping (XS, 2 minutes)
**File:** `vite.config.ts`

Add the import and plugin:
```ts
import removeConsole from 'vite-plugin-remove-console';

// In plugins array:
plugins: [react(), removeConsole()]
```

## Task 5 — Fix manifest (XS, 1 minute)
**File:** `public/manifest.json`

Change `"theme_color": "#3b82f6"` to `"theme_color": "#F97316"`

## Task 6 — Add Create Post entry point (S, 15 minutes)
**File:** `src/pages/MyGaragePage.tsx` (or `ProfilePage.tsx`)

Add a "New Post" button in the page header area:
```tsx
<button
  onClick={() => onNavigate('create-post')}
  style={{
    padding: '8px 16px',
    background: '#F97316',
    border: 'none',
    borderRadius: 8,
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#000',
    cursor: 'pointer',
  }}
>
  New Post
</button>
```

## Task 7 — Wire OnboardingPage for OAuth users (M, 30 minutes)
**File:** `src/App.tsx`

Add lazy import:
```tsx
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
```

After the email verification check (around line 344), add:
```tsx
if (user && profile && !profile.onboarding_completed) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <OnboardingPage onComplete={async () => {
        await refreshProfile();
      }} />
    </Suspense>
  );
}
```

Verify OnboardingPage accepts `onComplete` prop and calls it on finish. If not, adjust the prop name to match what the component expects.

## Task 8 — Convert Layout.tsx to inline styles (M, 45 minutes)
**File:** `src/components/Layout.tsx`

Replace all `className` attributes with `style` attributes using V11 hex values:
- Replace `var(--accent)` with `#F97316`
- Replace `var(--t4)` with `#445566`
- Replace `className="topbar"` with equivalent inline styles
- Replace `className="bot-nav"` with equivalent inline styles
- Replace `className="flex items-center gap-3"` with `style={{ display: 'flex', alignItems: 'center', gap: 12 }}`
- Continue for all className and var() usage

## Task 9 — Deploy Badge SQL (S, 10 minutes)
1. Open Supabase Dashboard at `https://qxnnvnllwbykjzxqvqfi.supabase.co`
2. Go to SQL Editor
3. Copy contents of `migrations/badge_auto_award_function_FINAL.sql`
4. Run the script
5. Verify: `SELECT proname FROM pg_proc WHERE proname = 'check_and_award_badges';`

## Task 10 — Verify .env (XS, 2 minutes)
```bash
cat .gitignore | grep -c '.env'
git status --short .env
```
If .env shows as tracked, add to .gitignore and remove from tracking.

---

# 9. QA SMOKE TEST PLAN

## Authentication Flows
- [ ] Email registration with handle creation — verify handle saved to profiles table
- [ ] Email login — verify redirects to feed
- [ ] Google OAuth sign-in (new user) — verify OnboardingPage shows (after Task 7)
- [ ] Google OAuth sign-in (existing user) — verify goes to feed
- [ ] Password reset email sent and token flow works
- [ ] Email verification page shows for unverified email users
- [ ] VerifyEmailPage resend button works
- [ ] Logout works from ProfilePage/MyGaragePage

## Navigation
- [ ] Bottom nav: Feed tab active on load, navigates correctly
- [ ] Bottom nav: Rank tab navigates to RankingsPage
- [ ] Bottom nav: Spot FAB navigates to SpotPage
- [ ] Bottom nav: Garage tab navigates to MyGaragePage
- [ ] Bottom nav: Badges tab navigates to BadgesPage (after fix)
- [ ] Header: Search icon navigates to UnifiedSearchPage
- [ ] Header: Notification bell navigates to NotificationsPage
- [ ] Header: Logo navigates back to feed
- [ ] Back navigation works from every detail page
- [ ] Deep links work: `#/vehicle/{id}`, `#/user-profile/{id}`, `#/shadow/{plate}`, `#/post/{id}`
- [ ] Guest mode: vehicle detail, shadow profile, and post detail accessible without login

## Spot Flow (End-to-End)
- [ ] Open SpotPage from nav FAB
- [ ] Plate search via manual entry — state selector + plate input
- [ ] Camera scan plate detection (CameraModal)
- [ ] Auto.dev plate lookup resolves (requires CSP fix)
- [ ] New plate: QuickSpotPage vehicle entry form works
- [ ] ConfirmVehiclePage displays vehicle details correctly
- [ ] QuickSpotReviewPage: all three rating rows work (Driver/Driving/Vehicle)
- [ ] Sentiment selection (Love It / Hate It) required
- [ ] Photo upload works
- [ ] Sticker selection works
- [ ] Submit Quick Spot: spot_history, reviews, and posts rows created
- [ ] Inline reward block appears (NOT a modal) showing RP + vehicle name + milestone
- [ ] "Done" button navigates to feed
- [ ] "Full Spot +5 RP" navigates to DetailedSpotAndReviewPage with upgrade props
- [ ] DetailedSpotAndReviewPage: Looks/Sound/Condition ratings work
- [ ] Submit Full Spot: review UPGRADED (not duplicated) when upgradeFromQuickSpot=true
- [ ] Full Spot inline reward block appears with "View Vehicle" button
- [ ] Spot without photo: data saved to spot_history and reviews, but NO feed post created
- [ ] Spot with user photo: feed post created with user photo as image
- [ ] Spot with only stock image: feed post created with stock image
- [ ] No feed post renders as blank/dark placeholder tile

## Feed
- [ ] Feed loads on app start for authenticated users
- [ ] Spot posts show image as hero (not plate-centered)
- [ ] Make/model is visually primary text
- [ ] Plate is secondary/small text
- [ ] Impact signals visible (spot signal strip, RP, spot count)
- [ ] Quick Spot vs Full Spot differentiation visible
- [ ] Like button works (ReactionButton)
- [ ] Comment button opens CommentsModal
- [ ] Share button present
- [ ] Track button present for vehicle posts
- [ ] Author attribution visible
- [ ] Caption displayed (generic captions filtered out)
- [ ] Infinite scroll loads more posts
- [ ] Pull-to-refresh or refresh mechanism works

## Post Creation
- [ ] Navigate to Create Post from new entry point (after fix)
- [ ] Photo upload works (10MB limit enforced)
- [ ] Vehicle tagging dropdown shows claimed vehicles
- [ ] Location auto-detection works (fuzzed for privacy)
- [ ] Privacy level selector works (Public/Friends/Private)
- [ ] Submit creates post in posts table
- [ ] Reputation awarded (POST_CREATED action)
- [ ] Rate limiting enforced (3 posts per 10 minutes)
- [ ] Post appears in feed after refresh

## Vehicle Detail
- [ ] Navigate to vehicle detail from feed card tap
- [ ] Vehicle data loads (make, model, year, color, RP, spots_count)
- [ ] Hero image displays (profile_image_url or stock_image_url)
- [ ] Track Vehicle button works (VehicleFollowButton — separate from owner follow)
- [ ] Follow Owner button works (FollowButton — user-to-user)
- [ ] Sticker selector works
- [ ] Reviews section loads
- [ ] Photos section loads
- [ ] Build sheet link works (if claimed vehicle)
- [ ] Back navigation returns to previous page

## Badges
- [ ] Badges page loads from bottom nav (after fix)
- [ ] Badge grid displays with correct tab structure
- [ ] Badge auto-award fires after spot/post/comment/follow (after SQL deployment)
- [ ] Badge celebration overlay appears on unlock
- [ ] Badge progress tracking visible

## Profile and Garage
- [ ] View own profile from Garage
- [ ] Edit profile: handle, avatar, bio via EditProfileModal
- [ ] View garage with claimed vehicles
- [ ] Vehicle cards navigate to vehicle detail
- [ ] Other user profiles load correctly from search/feed
- [ ] Follow button on other user profiles works

## Rankings
- [ ] Rankings page loads from bottom nav
- [ ] Shows VEHICLES ranked by reputation_score (not users)
- [ ] Vehicle thumbnail, make/model, RP score displayed
- [ ] No podium layout (unless product decision changes)
- [ ] Scope tabs (City/State/National/Class) present

## Search
- [ ] Search accessible from header icon
- [ ] Vehicle search by make/model works
- [ ] User search by handle works
- [ ] Results navigate correctly (vehicle detail or user profile)

## Messages
- [ ] Messages page accessible from NotificationsPage or user profile
- [ ] Conversation creation works
- [ ] Message sending works
- [ ] File attachment works

## Notifications
- [ ] Notification bell shows count
- [ ] Notifications page loads
- [ ] Tapping notification navigates to correct destination (badge, vehicle, user)

## Edge Cases
- [ ] App works on mobile viewport (390px width)
- [ ] No horizontal scroll on any page
- [ ] Fonts render correctly: Rajdhani, Barlow, Barlow Condensed, JetBrains Mono (after CSP fix)
- [ ] No console errors in production build
- [ ] TypeScript compiles with `npx tsc --noEmit`
- [ ] Production build succeeds with `npm run build`

---

# 10. RELEASE CHECKLIST

## Pre-Deploy
- [ ] P0 Tasks 1-10 completed and code-reviewed
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] Badge SQL function deployed to Supabase and verified
- [ ] CSP directives verified (font-src has data:, connect-src has api.auto.dev)
- [ ] Console stripping plugin enabled and verified in production build
- [ ] `.env` confirmed in `.gitignore`, never committed to git history
- [ ] Bottom nav matches design: Feed / Rank / Spot / Garage / Badges
- [ ] Create Post is reachable from at least one surface
- [ ] OAuth onboarding flow works for new Google sign-in users
- [ ] DetailedSpot upgrade path tested end-to-end (no duplicate spots)
- [ ] All fonts render correctly in production build (test in incognito)
- [ ] Manifest theme_color is #F97316
- [ ] Spot FAB uses crosshair icon (per mockup)

## Deploy
- [ ] Deployment target configured (Vercel or similar)
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Environment variables set on hosting platform
- [ ] Domain configured
- [ ] SSL/HTTPS verified

## Post-Deploy
- [ ] Full smoke test plan executed on production URL
- [ ] RLS policies verified for: posts, vehicles, spot_history, reviews, profiles, reactions, post_comments, notifications
- [ ] Auto.dev API quota monitored (1,000/month free tier)
- [ ] Sentry error tracking configured and receiving events
- [ ] Push notification VAPID keys verified

---

# 11. HIGHEST-RISK UNKNOWNS

These items cannot be fully verified from frontend code alone and require database or infrastructure verification.

## 1. `spots_count` column existence in live DB
**Risk:** High
**Impact:** If column doesn't exist, every query using `VEHICLE_PUBLIC_COLUMNS` will 400 — breaking feed, rankings, vehicle detail, search, and more.
**Verification:** Run in Supabase SQL Editor:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'vehicles' AND column_name = 'spots_count';
```
**Note:** MASTER-OPEN-ITEMS flagged "Plate search 400 error — vehicle query selecting spots_count which don't exist in DB." This may still be true.

## 2. `check_and_award_badges` RPC function
**Risk:** Critical
**Impact:** Called in 11 locations. If function doesn't exist, all badge auto-awards silently fail.
**Verification:**
```sql
SELECT proname FROM pg_proc WHERE proname = 'check_and_award_badges';
```

## 3. Font rendering
**Risk:** High
**Impact:** If CSP blocks fonts AND Google Fonts CDN is slow/blocked, the entire V11 design system collapses to system fonts. The app will look completely wrong.
**Verification:** After CSP fix, test in incognito with DevTools Network tab. Verify Rajdhani, Barlow, Barlow Condensed, JetBrains Mono all load.

## 4. RLS policies
**Risk:** High
**Impact:** If any core table (posts, vehicles, spot_history, reviews, profiles, reactions, post_comments, notifications) has missing or overly restrictive RLS policies, features silently fail.
**Verification:** Run full RLS audit in Supabase Dashboard. Check SELECT/INSERT/UPDATE/DELETE policies for each table against the operations the frontend performs.

## 5. OnboardingPage integration risk
**Risk:** Medium
**Impact:** The file exists at 583 lines but was never connected to the router. It may have stale imports, wrong prop signatures, broken Supabase queries, or reference nonexistent edge functions (verify-document).
**Verification:** After wiring into App.tsx, test the full 2-step flow: handle selection, optional vehicle claim with registration upload.

## 6. Auto.dev API quota
**Risk:** Medium
**Impact:** Free tier is 1,000 lookups/month. Active users spotting vehicles could exhaust this in days. No rate limiting or fallback when quota is hit.
**Verification:** Monitor usage in Auto.dev dashboard. Add error handling for 429 responses.

## 7. Edge function deployment status
**Risk:** Medium
**Impact:** 13 edge functions exist in `supabase/functions/`. Only `lookup-plate` is confirmed deployed. `hash-plate` and `calculate-reputation` confirmed NOT deployed. The deployment status of the other 10 is unknown.
**Verification:** Run `supabase functions list` or check Supabase Dashboard > Edge Functions.

## 8. Supabase connection limits
**Risk:** Low-Medium
**Impact:** The feed loading function in `feed.ts` makes 3+ sequential DB queries per page load (posts + reactions + comments). Under load, this could hit Supabase free tier connection limits.
**Verification:** Monitor connection pool usage in Supabase Dashboard during load testing.

---

*End of audit. This document should be treated as the single source of truth for launch readiness. Every item above must be verified resolved before production deployment.*
