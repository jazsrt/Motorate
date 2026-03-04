# Shadow Profile to Claimed Vehicle Workflow

## Overview
This document explains how shadow profiles work, what happens when users claim vehicles, and how the system displays claimed vs unclaimed vehicles.

## Shadow Profile States

### 1. **Unclaimed/Shadow State**
When someone searches for a license plate that exists in the system but isn't claimed:

**What They See:**
- Basic vehicle information (year, make, model, color)
- Photos and reviews from other users
- Average rating and spot count
- "CLAIM THIS VEHICLE" button prominently displayed
- Limited profile information (no owner name/bio/photo)

**What They Can Do:**
- View the shadow profile
- Rate the vehicle
- Add photos/comments
- Report the vehicle
- **Click "Claim This Vehicle"** to start the claiming process

**Database State:**
```
vehicles table:
- owner_id: NULL
- is_claimed: false
- plate_hash: [hashed plate]
```

---

### 2. **Pending Claim State**
After a user submits a claim with verification documents:

**What The Claimer Sees:**
- Vehicle appears in **MyGarage** with "PENDING" badge
- Yellow banner: "Claim Under Review"
- Message: "Documents are being verified. You'll be notified within 24-48 hours."
- Can view the vehicle but cannot edit/delete yet
- Vehicle is NOT fully theirs until admin approves

**What Others See:**
- Still see the shadow profile
- "CLAIM THIS VEHICLE" button is now disabled/hidden
- May show "Claim Pending" status

**Database State:**
```
vehicles table:
- owner_id: NULL (still not owned)
- is_claimed: false (not yet claimed)

verification_claims table:
- vehicle_id: [vehicle id]
- user_id: [claimer id]
- status: 'pending'
- documents: [uploaded docs]
```

---

### 3. **Approved/Claimed State**
After admin approves the claim:

**What The Owner Sees:**
- Vehicle appears in **MyGarage** with "VERIFIED" badge
- Full editing capabilities:
  - Add/edit photos
  - Update vehicle details
  - Add modifications
  - Make vehicle private/public
  - Delete vehicle
- Vehicle is now **fully theirs**

**What Others See When Searching:**
- Now see the **full user profile** instead of shadow profile
- Owner's name, handle, bio, location, profile photo
- Owner's other vehicles (if public)
- Owner's badges and reputation
- Can follow the owner
- Can view the owner's garage

**Database State:**
```
vehicles table:
- owner_id: [owner's user id]
- is_claimed: true
- claimed_at: [timestamp]
- verification_status: 'verified'

verification_claims table:
- status: 'approved'
- reviewed_by: [admin id]
- reviewed_at: [timestamp]
```

---

## Navigation Flow

### When Someone Searches for a Plate

```
SEARCH PLATE
    ↓
Found in DB?
    ↓
YES → Is Claimed? → NO → Show Shadow Profile → "Claim This Vehicle" button
          ↓
         YES → Navigate to Owner's Profile → Show Claimed Vehicle Card
```

### When Clicking on a Claimed Vehicle

**Option 1: Navigate to Owner's Full Profile**
```
Click Vehicle Card → Navigate to ProfilePage(/profile/[owner_id])
                   → Shows full owner profile with all vehicles
                   → This vehicle is highlighted or shown first
```

**Option 2: Navigate to Vehicle Detail Page**
```
Click Vehicle Card → Navigate to VehicleDetailPage(/vehicle/[vehicle_id])
                   → Shows detailed vehicle view
                   → Shows owner info in sidebar
                   → Link to "View Owner's Garage"
```

### When Clicking "Claim This Vehicle"

```
Click "Claim This Vehicle"
    ↓
ClaimVehicleModal Opens
    ↓
User Uploads Documents:
    - Registration
    - Insurance
    - Vehicle Photo
    - Selfie with Vehicle
    ↓
Submit Claim
    ↓
Claim Status: PENDING
    ↓
Vehicle appears in MyGarage with "PENDING" badge
    ↓
[Wait for Admin Review]
    ↓
Admin Approves → Vehicle becomes VERIFIED in MyGarage
              → owner_id updated to user's ID
              → is_claimed = true
              → Full editing capabilities enabled
```

---

## MyGarage Display Logic

**Current Implementation:**
```typescript
// Loads vehicles where owner_id = current user's ID
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .eq('owner_id', user.id);
```

**Enhanced Implementation (Includes Pending Claims):**
```typescript
// Option 1: Load owned vehicles + vehicles with pending claims
const [ownedVehicles, pendingClaims] = await Promise.all([
  // Fully owned vehicles
  supabase
    .from('vehicles')
    .select('*')
    .eq('owner_id', user.id),

  // Vehicles with pending claims
  supabase
    .from('verification_claims')
    .select('vehicle_id, vehicle:vehicles(*)')
    .eq('user_id', user.id)
    .eq('status', 'pending')
]);

// Combine and deduplicate
const allVehicles = [
  ...ownedVehicles.data,
  ...pendingClaims.data.map(c => ({
    ...c.vehicle,
    _claimStatus: 'pending'
  }))
];
```

---

## Key Differences: Shadow vs Claimed

| Feature | Shadow Profile | Claimed Profile |
|---------|---------------|-----------------|
| Owner Info | ❌ No owner displayed | ✅ Full owner profile |
| Owner Photo | ❌ Generic placeholder | ✅ User's profile photo |
| Bio/Location | ❌ Not shown | ✅ Shown if public |
| Claim Button | ✅ "Claim This Vehicle" | ❌ Not shown |
| Edit Vehicle | ❌ No one can edit | ✅ Owner can edit |
| Privacy Control | ❌ Always public | ✅ Owner can make private |
| Vehicle Delete | ❌ Cannot delete | ✅ Owner can delete |
| Profile Link | ❌ No profile to visit | ✅ Click to view owner's garage |

---

## Technical Implementation

### Database Functions Used

1. **`can_claim_vehicle(vehicle_id, user_id)`**
   - Checks if user can claim a vehicle
   - Returns success/error

2. **`submit_claim(vehicle_id, user_id, documents)`**
   - Creates verification_claims record
   - Uploads documents to storage
   - Sets status to 'pending'

3. **`approve_claim(claim_id, admin_id, notes)`**
   - Updates verification_claims.status to 'approved'
   - **Updates vehicles.owner_id to claiming user**
   - **Sets vehicles.is_claimed to true**
   - **Sets vehicles.verification_status to 'verified'**
   - Sends notification to user

4. **`reject_claim(claim_id, admin_id, notes)`**
   - Updates verification_claims.status to 'rejected'
   - Sends notification to user with reason
   - Vehicle remains unclaimed

---

## Visual States Summary

### Shadow Profile (Unclaimed)
```
┌─────────────────────────────────┐
│  [Generic Car Icon]             │
│                                 │
│  2020 Honda Civic              │
│  White • ⭐ 4.2 (12 reviews)   │
│                                 │
│  [CLAIM THIS VEHICLE]          │
│                                 │
│  Recent Activity:               │
│  - Photos from other users     │
│  - Reviews from other users    │
└─────────────────────────────────┘
```

### Claimed Profile (Verified Owner)
```
┌─────────────────────────────────┐
│  [@johndoe] [Profile Photo]     │
│  John Doe                       │
│  Chicago, IL                    │
│  "Car enthusiast since 2010"   │
│                                 │
│  🚗 Vehicles (3)                │
│  🏆 Badges (12)                 │
│  ⭐ Reputation: 4.8            │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 2020 Honda Civic ✓      │   │
│  │ [Owner's Photos]         │   │
│  │ [Edit] [Share] [Delete]  │   │
│  └─────────────────────────┘   │
│                                 │
│  [View Full Garage]            │
└─────────────────────────────────┘
```

---

## Current Issue & Fix

**Problem:** Vehicles with pending claims don't show in MyGarage because `owner_id` is NULL until admin approval.

**Solution:** Update MyGaragePage to load:
1. Vehicles where `owner_id = user.id` (owned vehicles)
2. Vehicles with pending verification claims for this user

This way users can track their pending claims in MyGarage while waiting for approval.
