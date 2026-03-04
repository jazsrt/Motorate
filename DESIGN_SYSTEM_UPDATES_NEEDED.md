# Design System Updates Required

## Summary
The user provided a comprehensive design system document with 10 specific prompts to update the MotoRate app to match a consistent dark-themed automotive design system.

## Critical Issues Identified

### 1. Feed Page (NewFeedPage.tsx) - ✅ STARTED
- Header updated with proper filters
- Need to update PostCard component structure
- Remove blue emoji circles
- Simplify post card layout

### 2. Spot Page (SpotPage.tsx) - PENDING
- Update page header
- Fix search inputs (side by side)
- Add recent spots section
- Update card designs

### 3. Garage Page (MyGaragePage.tsx) - CRITICAL
- **Tab visibility bug**: Inactive tabs are invisible (need `text-white/70` instead of gray)
- Fix profile header
- Update stat cards with proper icons
- Fix vehicle grid (2 columns)
- Update rep card design

### 4. Badge Auto-Awarding System - HIGH PRIORITY
- Create SQL function `check_and_award_badges`
- Create `useBadgeChecker` hook
- Wire badge checks to user actions (spot, review, post, comment, follow, like)
- Add welcome badge on signup

### 5. Vehicle Detail Page (VehicleDetailPage.tsx) - PENDING
- Update page structure
- Add owner vs non-owner views
- Update CTAs and stat cards
- Add stickers, reviews, spot history sections

### 6. Public Profile Page (UserProfilePage.tsx) - PENDING
- Update profile hero
- Add trophy shelf (equipped badges)
- Fix 4-column stats
- Update vehicle grid

### 7. Quick Spot Upgrade Flow - PENDING
- Verify success modal
- Ensure UPDATE not INSERT for full reviews
- Check navigation handler

## Design System Rules (CRITICAL)

### Colors
```
Page background:     #060d18
Card background:     #0c1828
Input background:    #111f33
Border default:      #1c3050
Border hover:        #25405e
Text primary:        #ddeeff
Text secondary:      #7da8d0
Text muted:          #3d6080
Blue accent:         #3b82f6
Purple accent:       #8b5cf6
Gold:                #f59e0b
```

### Gradients
```
Primary CTA:     linear-gradient(135deg, #3b82f6, #8b5cf6)
Gold accent:     linear-gradient(135deg, #f59e0b, #f97316)
```

### Typography
- Headings/numbers: `font-heading` (Rajdhani)
- Body text: `font-sans` (Barlow)

### Forbidden
- ❌ Emoji in UI
- ❌ Amber/orange/red hero gradients
- ❌ Purple/indigo unless specified
- ❌ `font-black` (use `font-bold` max)

## Next Steps

1. Fix Garage Page tab visibility (CRITICAL - users can't navigate)
2. Implement badge auto-awarding system
3. Update Spot Page layout
4. Update Vehicle Detail Page
5. Update Profile Page
6. Verify Quick Spot flow

## Files to Modify Priority List

1. **src/pages/MyGaragePage.tsx** - Tab visibility bug
2. **src/hooks/useBadgeChecker.ts** - Create badge system
3. **src/pages/SpotPage.tsx** - Layout fixes
4. **src/pages/VehicleDetailPage.tsx** - Structure updates
5. **src/pages/UserProfilePage.tsx** - Profile updates
6. **src/components/PostCard.tsx** - Feed card updates
