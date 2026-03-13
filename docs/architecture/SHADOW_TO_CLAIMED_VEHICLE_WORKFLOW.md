# CARMA: Shadow Profile → Claimed Vehicle Workflow
## Complete End-to-End Implementation Export

**Last Updated:** January 28, 2026
**Status:** Production Implementation
**Scope:** All database schema, backend logic, frontend components, state management, and notification systems for the vehicle claiming workflow

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Database Schema & Relationships](#database-schema--relationships)
3. [Row-Level Security (RLS) Policies](#row-level-security-rls-policies)
4. [Backend API Endpoints & Edge Functions](#backend-api-endpoints--edge-functions)
5. [Frontend Components & Pages](#frontend-components--pages)
6. [Core Library Functions & Services](#core-library-functions--services)
7. [TypeScript Types & Interfaces](#typescript-types--interfaces)
8. [State Management & Hooks](#state-management--hooks)
9. [Routing & Navigation](#routing--navigation)
10. [Notification System](#notification-system)
11. [Admin/Moderation Workflow](#adminmoderation-workflow)
12. [Data Flow Diagrams](#data-flow-diagrams)
13. [Known Issues & Edge Cases](#known-issues--edge-cases)
14. [Security Considerations](#security-considerations)
15. [Complete File Reference](#complete-file-reference)

---

## EXECUTIVE SUMMARY

**Carma** is a privacy-first, gamified vehicle reputation platform. Users spot vehicles on the road and leave reviews (ratings, photos, comments). The core workflow transitions vehicles from **Shadow Profile** (community-discovered, owner unknown) to **Claimed** (owner verified) status.

### Verification Tiers

```
SHADOW (owner_id = NULL)
├─ Created when first review posted on unknown vehicle
├─ No owner, no special privileges
├─ Community rates: Look (0-100), Sound (0-100), Condition (0-100), Driving (0-100)
└─ Anyone can post reviews

STANDARD (owner_id = NOT NULL, verification_tier = 'standard')
├─ User claims vehicle with vehicle details confirmation
├─ Owner can: hide/delete pre-claim reviews (God Mode), edit build sheet
├─ Cannot delete post-claim reviews
└─ No "Verified Owner" badge displayed

VERIFIED (owner_id = NOT NULL, owner_proof_url set, verification_tier = 'verified')
├─ Owner verified via:
│  ├─ AI document verification (OpenAI Vision → VIN extraction & match)
│  └─ OR admin manual approval of submitted documents
├─ Owner gets "Verified Owner" badge
├─ Full review moderation access
└─ Proof stored securely in storage bucket
```

### Key Distinction: God Mode (Pre-Claim Review Deletion)

```
Pre-claim reviews (created BEFORE claimed_at):  ✓ Can be deleted by owner
Post-claim reviews (created AFTER claimed_at):  ✗ Can only be hidden (is_hidden_by_owner)
```

---

## DATABASE SCHEMA & RELATIONSHIPS

### 1. Core Tables

#### **profiles** - User Profiles
**File:** `/supabase/migrations/20251123031023_create_carma_schema.sql`

```sql
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text UNIQUE NOT NULL,
  avatar_url text,
  reputation_score int DEFAULT 0,
  carma_points int DEFAULT 0,
  location text,
  is_private boolean DEFAULT false,
  is_admin boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'User profiles linked to auth.users';
COMMENT ON COLUMN profiles.reputation_score IS 'Aggregate: sum of review helpfulness + badge count';
COMMENT ON COLUMN profiles.carma_points IS 'User CARMA points earned from reviews, badges, challenges';
COMMENT ON COLUMN profiles.handle IS '@username for public profile URL';
```

#### **vehicles** - Shadow/Claimed Vehicle Distinction
**File:** `/supabase/migrations/20251123031023_create_carma_schema.sql`

```sql
CREATE TABLE public.vehicles (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership & Claiming
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,  -- NULL = shadow vehicle
  is_claimed boolean NOT NULL DEFAULT false,
  claimed_at timestamptz,  -- When owner claimed (critical for God Mode)

  -- Identification (Never plaintext plate)
  plate_hash text NOT NULL UNIQUE,  -- SHA-256(state + plate)

  -- Vehicle Details
  year int,
  make text,
  model text,
  trim text,
  color text,
  stock_image_url text,

  -- Verification & Proof
  verification_tier varchar NOT NULL DEFAULT 'shadow',  -- shadow|standard|verified
  owner_proof_url text,  -- URL to stored registration/proof document

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT valid_tier CHECK (verification_tier IN ('shadow', 'standard', 'verified')),
  CONSTRAINT claimed_requires_owner CHECK (
    (is_claimed = false AND owner_id IS NULL) OR
    (is_claimed = true AND owner_id IS NOT NULL)
  )
);

CREATE INDEX vehicles_owner_id_idx ON public.vehicles(owner_id);
CREATE INDEX vehicles_plate_hash_idx ON public.vehicles(plate_hash);
CREATE INDEX vehicles_created_at_idx ON public.vehicles(created_at DESC);

COMMENT ON TABLE vehicles IS 'Vehicles: shadow (owner_id=NULL) or claimed (owner_id!=NULL)';
COMMENT ON COLUMN vehicles.plate_hash IS 'SHA-256 hash - NEVER store plaintext license plates';
COMMENT ON COLUMN vehicles.claimed_at IS 'Timestamp owner claimed - used for God Mode pre-claim review deletion';
COMMENT ON COLUMN vehicles.verification_tier IS 'shadow=unknown, standard=soft claim, verified=proof uploaded';
COMMENT ON COLUMN vehicles.owner_proof_url IS 'URL to registration document uploaded during verification';
```

#### **verification_claims** - Verification Document Submission & Admin Review
**File:** New migration required (if not exists)

```sql
CREATE TABLE IF NOT EXISTS public.verification_claims (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship to vehicle & user
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Document URLs (uploaded to 'verification-docs' storage)
  registration_url text,  -- REQUIRED - registration document
  insurance_url text,     -- OPTIONAL - insurance card
  photo_url text,         -- OPTIONAL - license plate/vehicle photo
  selfie_url text,        -- OPTIONAL - selfie with vehicle

  -- Admin Review
  status varchar NOT NULL DEFAULT 'pending',  -- pending|approved|rejected
  admin_notes text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT unique_pending_per_vehicle_user UNIQUE (vehicle_id, user_id)
    WHERE status = 'pending'
);

CREATE INDEX verification_claims_status_idx ON public.verification_claims(status);
CREATE INDEX verification_claims_user_id_idx ON public.verification_claims(user_id);
CREATE INDEX verification_claims_vehicle_id_idx ON public.verification_claims(vehicle_id);

COMMENT ON TABLE verification_claims IS 'User submissions for admin verification of vehicle ownership';
COMMENT ON COLUMN verification_claims.status IS 'pending=awaiting admin review, approved=verified_tier set, rejected=resubmit allowed';
```

#### **reviews** - Community Ratings (Modified for God Mode)
**File:** `/supabase/migrations/20251123031023_create_carma_schema.sql`

```sql
CREATE TABLE public.reviews (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Ratings (0-100)
  rating_look int CHECK (rating_look >= 0 AND rating_look <= 100),
  rating_sound int CHECK (rating_sound >= 0 AND rating_sound <= 100),
  rating_condition int CHECK (rating_condition >= 0 AND rating_condition <= 100),
  rating_driver int CHECK (rating_driver >= 0 AND rating_driver <= 100),

  -- Content
  text text,
  image_url text,
  location_label text,  -- Fuzzed location

  -- God Mode: Owner hiding reviews (post-claim only)
  is_hidden_by_owner boolean NOT NULL DEFAULT false,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reviews_vehicle_id_idx ON public.reviews(vehicle_id);
CREATE INDEX reviews_author_id_idx ON public.reviews(author_id);
CREATE INDEX reviews_created_at_idx ON public.reviews(created_at DESC);

COMMENT ON COLUMN reviews.is_hidden_by_owner IS 'Owner hiding review (only post-claim reviews can be hidden, not deleted)';
COMMENT ON TABLE reviews IS 'Community ratings: owned vehicles can hide (not delete) post-claim reviews; delete pre-claim via RLS God Mode';
```

#### **badges** - Achievement System
```sql
CREATE TABLE public.badges (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,  -- my-first-ride, verified-owner, etc.
  name text NOT NULL,
  icon text NOT NULL,  -- Lucide icon name
  type varchar NOT NULL,  -- good|bad|landmark|status
  description text,
  monthly_limit int DEFAULT -1,  -- -1 = unlimited
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN badges.slug IS 'Machine-readable ID for badge types';
COMMENT ON COLUMN badges.monthly_limit IS 'Awards per month per vehicle (-1=unlimited)';
```

**Key Badges:**
- `my-first-ride` - Awarded when user claims their first vehicle
- `verified-owner` - Awarded when vehicle reaches verified tier

#### **user_badges** - User Badge Inventory
```sql
CREATE TABLE public.user_badges (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);
```

#### **user_inventory** (Glovebox) - Badge Storage for Awarding
```sql
CREATE TABLE public.user_inventory (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  count_remaining int NOT NULL DEFAULT 0,
  last_reset timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

COMMENT ON COLUMN user_inventory.count_remaining IS 'Number of badges available to award (monthly replenish)';
```

#### **posts** - Photo-Based Spotting Posts
```sql
CREATE TABLE public.posts (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url text,
  video_url text,
  content_type varchar DEFAULT 'image',  -- image|video
  caption text,
  location_label text,
  rating_look int,
  rating_sound int,
  rating_condition int,
  rating_driver int,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

#### **admin_audit_log** - Admin Action Tracking
```sql
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  action_type varchar NOT NULL,  -- CLAIM_APPROVED, CLAIM_REJECTED, etc.
  target_user_id uuid,
  target_content_id text,
  description text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_log_admin_id_idx ON public.admin_audit_log(admin_id);
CREATE INDEX admin_audit_log_action_type_idx ON public.admin_audit_log(action_type);
```

### 2. Storage Buckets

```
'vehicles' - Verification proof documents
  Structure: {userId}/verification/{vehicleId}/{timestamp}.{ext}
  Accessed by: VerifyOwnershipModal, verify-document Edge Function

'verification-docs' - User-submitted claim documents
  Structure: {userId}/{vehicleId}/{document_type}
  Accessed by: ClaimVehicleModalVerification, admin dashboard

'posts' - Post images/videos
  Structure: {userId}/posts/{postId}/{timestamp}

'vehicle-images' - Owner vehicle photos
  Structure: {userId}/vehicles/{vehicleId}/{timestamp}
```

---

## ROW-LEVEL SECURITY (RLS) POLICIES

**File Location:** Migrations contain RLS setup

### Vehicles Table Policies

```sql
-- 1. PUBLIC READ - Anyone can view vehicles
CREATE POLICY "Anyone can view vehicles"
  ON public.vehicles FOR SELECT
  USING (true);

-- 2. CREATION - Anyone authenticated can create shadow vehicles
CREATE POLICY "Anyone can create shadow vehicles"
  ON public.vehicles FOR INSERT TO authenticated
  WITH CHECK (
    owner_id IS NULL AND
    verification_tier = 'shadow'
  );

-- 3. OWNER UPDATE - Only owners can update their vehicles
CREATE POLICY "Owners can update their vehicles"
  ON public.vehicles FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 4. ADMIN OVERRIDE - Admins can update for verification
CREATE POLICY "Admins can update vehicle verification"
  ON public.vehicles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );
```

### Reviews Table Policies

```sql
-- 1. PUBLIC READ - Anyone can view reviews
CREATE POLICY "Anyone can view non-hidden reviews"
  ON public.reviews FOR SELECT
  USING (is_hidden_by_owner = false);

-- 2. AUTHOR INSERT - Authors can create reviews
CREATE POLICY "Authors can insert reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- 3. AUTHOR DELETE - Authors can delete own reviews
CREATE POLICY "Authors can delete own reviews"
  ON public.reviews FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

-- 4. OWNER DELETE (GOD MODE) - Owners can delete PRE-CLAIM reviews ONLY
CREATE POLICY "Owners can delete pre-claim reviews (God Mode)"
  ON public.reviews FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = reviews.vehicle_id
        AND vehicles.owner_id = auth.uid()
        AND vehicles.claimed_at IS NOT NULL
        AND vehicles.claimed_at > reviews.created_at  -- CRITICAL: review BEFORE claim
    )
  );

-- 5. OWNER HIDE (POST-CLAIM ONLY) - Owners can set is_hidden_by_owner
CREATE POLICY "Owners can hide reviews on their vehicles"
  ON public.reviews FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = reviews.vehicle_id
        AND vehicles.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = reviews.vehicle_id
        AND vehicles.owner_id = auth.uid()
    )
  );
```

### Verification Claims Policies

```sql
-- 1. USERS INSERT - Users can submit claims for unclaimed vehicles
CREATE POLICY "Users can submit verification claims"
  ON public.verification_claims FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'pending' AND
    EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = vehicle_id
        AND (vehicles.owner_id IS NULL OR vehicles.owner_id = auth.uid())
    )
  );

-- 2. USERS SELECT - Users can view own claims
CREATE POLICY "Users can view own verification claims"
  ON public.verification_claims FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 3. ADMIN UPDATE - Admins can approve/reject claims
CREATE POLICY "Admins can review and update claims"
  ON public.verification_claims FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
```

---

## BACKEND API ENDPOINTS & EDGE FUNCTIONS

### Edge Functions

**Location:** `/tmp/cc-agent/63102870/project/supabase/functions/`

#### 1. **verify-document** - AI Document Verification

**File:** `verify-document/index.ts`

**Purpose:** Extract vehicle data from registration documents using OpenAI Vision, verify VIN match

**Invocation:**
```typescript
const { data, error } = await supabase.functions.invoke('verify-document', {
  body: {
    vehicleId: string,
    imageUrl: string,  // HTTPS URL to stored document
    documentType: 'registration' | 'insurance',
  }
});
```

**Returns:**
```typescript
{
  verified: boolean,
  confidence: number (0.0-1.0),
  reason?: string,
  extractedData?: {
    vin: string,
    make: string,
    model: string,
    year: number,
    plate: string,
    state: string,
    ownerName: string
  }
}
```

**Flow:**
1. Accepts HTTPS-only URLs (validates Supabase storage origin)
2. Calls OpenAI Vision API: `vision_v1/messages` endpoint
3. Prompt: Extract VIN, make, model, year, plate, state, owner name
4. Compares extracted VIN with vehicle.make/model/year in DB
5. Returns verified=true IF extracted_vin matches expected vehicle AND confidence >= 0.7
6. If mismatch: creates pending verification_claims record for manual admin review

**Security:**
- HTTPS-only URLs
- OpenAI API key in environment (not exposed)
- No plaintext plates stored
- CORS headers required

#### 2. **detect-vehicle** - Google Vision Image Analysis

**File:** `detect-vehicle/index.ts`

**Purpose:** Identify vehicle make, model, color from photos using Google Vision API

**Returns:** `{ make, model, color, confidence }`

#### 3. **hash-plate** - Secure Plate Hashing

**File:** `hash-plate/index.ts`

**Purpose:** SHA-256(state + plate) ensures plaintext plates never stored

```typescript
// Request
{ state: 'CA', plate: 'ABC123' }

// Response
{ plate_hash: 'a1b2c3d4...' }
```

#### 4. **send-push-notification** - Push Notifications

**File:** `send-push-notification/index.ts`

**Purpose:** Send web push notifications

**Invocation:**
```typescript
const { data, error } = await supabase.functions.invoke('send-push-notification', {
  body: {
    userId: string,
    title: string,
    body: string,
    data?: { type, url, ... }
  }
});
```

### RPC Functions (Database-side Logic)

Called via `supabase.rpc(functionName, params)`

#### **can_claim_vehicle(p_vehicle_id, p_user_id)**
```sql
-- Check if vehicle can be claimed
-- Returns: { success: bool, error?: string }
FUNCTION can_claim_vehicle(
  p_vehicle_id uuid,
  p_user_id uuid
) RETURNS jsonb
-- Checks:
-- 1. Vehicle exists
-- 2. Not already claimed
-- 3. User exists
```

#### **claim_vehicle_atomic(p_vehicle_id, p_user_id, p_make, p_model, p_year, p_color)**
```sql
-- Atomic claim operation
-- Sets owner_id, is_claimed=true, verification_tier='standard', claimed_at=NOW()
-- Returns: { success: bool, error?: string }
```

#### **submit_claim(p_vehicle_id, p_user_id, p_registration_url, p_insurance_url, p_photo_url, p_selfie_url)**
```sql
-- Creates verification_claims record with status='pending'
-- Returns: { success: bool, claim_id?: uuid, error?: string }
```

#### **approve_claim(p_claim_id, p_admin_id, p_admin_notes)**
```sql
-- Admin approval action
-- Sets: vehicle.owner_id = claim.user_id, verification_tier='verified', owner_proof_url=registration_url
-- Updates: claim.status='approved', reviewed_by=admin_id, reviewed_at=NOW()
-- Triggers: Award "Verified Owner" badge, send notification
-- Returns: { success: bool, error?: string }
```

#### **reject_claim(p_claim_id, p_admin_id, p_admin_notes)**
```sql
-- Admin rejection action
-- Updates: claim.status='rejected', admin_notes, reviewed_by, reviewed_at
-- Triggers: Send notification with rejection reason
-- Does NOT affect vehicle ownership
-- Returns: { success: bool, error?: string }
```

#### **upgrade_to_verified(p_vehicle_id, p_new_owner_id, p_proof_url)**
```sql
-- Upgrade standard → verified (called after AI verification succeeds)
-- Sets: verification_tier='verified', owner_proof_url=proof_url, owner_id=new_owner_id
-- Returns: { success: bool, error?: string }
```

#### **has_verified_ownership(p_user_id, p_vehicle_id)**
```sql
-- Check if user has verified ownership of vehicle
-- Returns: boolean
```

#### **award_carma_points(p_user_id, p_action, p_points, p_reference_type, p_reference_id, p_description)**
```sql
-- Award CARMA points for actions: review, badge_award, etc.
-- Returns: { success: bool, error?: string, new_total?: int }
```

---

## FRONTEND COMPONENTS & PAGES

### Pages

#### **ShadowProfilePage** - Unclaimed Vehicle Display

**Location:** `/src/pages/ShadowProfilePage.tsx`

**Props:**
```typescript
interface ShadowProfilePageProps {
  plateNumber: string;  // URL-encoded: 'CA-ABC123'
  onNavigate: (page: Page, data?: any) => void;
}
```

**Key Features:**
- Decodes plate number from URL
- Hashes plate using SHA-256
- Fetches vehicle by plate_hash
- Displays community ratings (Look, Sound, Condition, Driving)
- Shows bumper stickers (aggregated review tags)
- "Claim This Vehicle" button (if logged in, vehicle unclaimed)
- "See Reviews" to view all community posts

**Data Fetching:**
```typescript
const { data: vehicle } = await supabase
  .from('vehicles')
  .select('*')
  .eq('plate_hash', hashedPlate)
  .maybeSingle();

const { data: posts } = await supabase
  .from('posts')
  .select('*')
  .eq('vehicle_id', vehicle.id)
  .order('created_at', { ascending: false });
```

**Conditional Rendering:**
```typescript
if (!vehicle || vehicle.owner_id === null) {
  // Shadow vehicle - show claim button
  return <PlateFoundUnclaimed vehicle={vehicle} onClaim={handleClaim} />;
}
```

#### **VehicleDetailPage** - Claimed Vehicle Owner Dashboard

**Location:** `/src/pages/VehicleDetailPage.tsx`

**Props:**
```typescript
interface VehicleDetailPageProps {
  vehicleId: string;
  onNavigate: (page: Page, data?: any) => void;
  onBack: () => void;
  onEditBuildSheet: (vehicleId: string) => void;
  guestMode?: boolean;
}
```

**Key Features:**
- Owner-specific actions:
  - Edit vehicle details
  - Upload vehicle photos
  - Edit build sheet (modifications)
  - **Verify Ownership** (launch VerifyOwnershipModal)
  - Delete/hide reviews (God Mode for pre-claim)
- Shows verification tier with badge
- Owner profile + reputation
- Displays all reviews with filter by date, rating, location

**Owner Detection:**
```typescript
const isOwner = user && vehicle?.owner_id === user.id;
const isUnclaimed = vehicle && !vehicle.is_claimed && !vehicle.owner_id;
```

**Review Actions:**
```typescript
// Pre-claim review (can delete)
if (vehicle.claimed_at > review.created_at) {
  showDeleteButton = true;  // God Mode
}

// Post-claim review (can hide)
if (vehicle.claimed_at <= review.created_at) {
  showHideButton = true;    // is_hidden_by_owner toggle
}
```

### Modals

#### **ClaimVehicleModal** - Soft Claim (Shadow → Standard)

**Location:** `/src/components/ClaimVehicleModal.tsx`

**Props:**
```typescript
interface ClaimVehicleModalProps {
  vehicleId: string;
  vehicleInfo: {
    make: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}
```

**Flow:**
1. User confirms vehicle details (pre-filled, can edit)
2. User accepts legal ownership confirmation
3. Frontend calls: `rpc('claim_vehicle_atomic', { vehicleId, userId, make, model, year, color })`
4. RPC atomically updates:
   - `owner_id = userId`
   - `is_claimed = true`
   - `claimed_at = NOW()`
   - `verification_tier = 'standard'`
5. Awards "My First Ride" badge if first vehicle
6. Shows success message

**Error Handling:**
```typescript
try {
  await claimVehicleStandard(vehicleId, userId);
} catch (error) {
  if (error.message.includes('already claimed')) {
    showError('Someone else claimed this vehicle');
  } else {
    showError(getClaimErrorMessage(error.message));
  }
}
```

#### **VerifyOwnershipModal** - AI Verification (Standard → Verified)

**Location:** `/src/components/VerifyOwnershipModal.tsx`

**Props:**
```typescript
interface VerifyOwnershipModalProps {
  vehicleId: string;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Flow:**
1. User enters 17-character VIN
2. User uploads registration document (JPG, PNG, PDF)
3. Frontend validates:
   - VIN format (17 chars, no I/O/Q)
   - File size (max 10MB)
4. Calls: `verifyDocument(vehicleId, file, vin, userId)`
   - Uploads document to 'vehicles' storage bucket
   - Invokes 'verify-document' Edge Function
5. If verified (confidence >= 0.7):
   - Calls: `rpc('upgrade_to_verified', { vehicleId, userId, proofUrl })`
   - Updates vehicle: `verification_tier = 'verified'`, `owner_proof_url = proofUrl`
   - Awards "Verified Owner" badge
   - Shows success + countdown (2 sec)
6. If NOT verified:
   - Creates pending verification_claims record
   - Shows: "Verification pending - admin will review"

**VIN Validation:**
```typescript
export function isValidVINFormat(vin: string): boolean {
  const normalized = vin.toUpperCase().replace(/[\s\-]/g, '');
  if (normalized.length !== 17) return false;
  if (/[IOQ]/.test(normalized)) return false;
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(normalized);
}
```

#### **ClaimVehicleModalVerification** - Manual Document Submission

**Location:** `/src/components/ClaimVehicleModalVerification.tsx`

**Props:**
```typescript
interface ClaimVehicleModalVerificationProps {
  vehicleId: string;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Documents:**
1. **Registration** (REQUIRED) - Must show owner name + plate
2. **Insurance** (Optional) - Verifies current ownership
3. **License Plate Photo** (Optional) - Clear plate number shot
4. **Selfie with Vehicle** (Optional) - Ownership proof

**Flow:**
1. User selects/uploads documents
2. Frontend calls: `submitVehicleClaim(vehicleId, userId, documents)`
   - Uploads each file to 'verification-docs' storage
   - Gets public URLs
3. RPC call: `submit_claim(..., registration_url, insurance_url, ...)`
4. Creates verification_claims record: `status = 'pending'`
5. Shows: "We'll review within 24-48 hours"
6. Admin reviews in AdminDashboard

### Display Components

#### **PlateFoundUnclaimed**

**Location:** `/src/components/PlateFoundUnclaimed.tsx`

**Displays:**
- Vehicle details (year, make, model, color)
- "🔓 Unclaimed Profile" badge
- Average rating (Look, Sound, Condition, Driving)
- Creator attribution ("Spotted by @handle")
- Action buttons:
  - "See All Reviews"
  - "Leave a Review"
  - "Claim This Vehicle" (if logged in)

**Styling:** Gray/neutral color scheme

#### **PlateFoundClaimed**

**Location:** `/src/components/PlateFoundClaimed.tsx`

**Displays:**
- Vehicle details
- Owner info with TierBadge (🔐 Standard | ✅ Verified)
- Owner profile link with avatar/handle
- Owner reputation score
- Rating breakdown (0-100 scale with visual bar)
- Creator attribution
- Action buttons:
  - "View Owner Profile"
  - "See All Reviews"
  - "Leave a Review"

**TierBadge Component:**
```typescript
interface TierBadgeProps {
  tier: VerificationTier;  // shadow|standard|verified
}

// Icons:
// shadow: null (not shown for shadow)
// standard: 🔐 Lock (soft claim)
// verified: ✅ CheckCircle (verified with proof)
```

---

## CORE LIBRARY FUNCTIONS & SERVICES

### `/src/lib/vehicles.ts`

**Exports:**

```typescript
/**
 * Claims a vehicle with standard verification (soft claim)
 * Updates: owner_id, is_claimed=true, claimed_at=NOW(), verification_tier='standard'
 * Awards: "My First Ride" badge on first claim
 */
export async function claimVehicleStandard(
  vehicleId: string,
  userId: string
): Promise<{ success: true }>;

/**
 * Upgrades vehicle claim to verified status with proof document
 * Called after verifyDocument succeeds
 * Updates: owner_proof_url, verification_tier='verified'
 * Awards: "Verified Owner" badge
 */
export async function claimVehicleVerified(
  vehicleId: string,
  userId: string,
  proofUrl: string
): Promise<{ success: true }>;

/**
 * Uploads verification proof document to 'vehicles' storage bucket
 * Returns public URL for database storage
 */
export async function uploadVerificationProof(
  file: File,
  vehicleId: string,
  userId: string
): Promise<string>;

/**
 * Checks if user has verified ownership via RPC
 */
export async function hasVerifiedOwnership(
  userId: string,
  vehicleId: string
): Promise<boolean>;

/**
 * User-friendly error messages for claiming errors
 */
export function getClaimErrorMessage(error: string): string;
```

### `/src/lib/claims.ts`

**Exports:**

```typescript
/**
 * Check if vehicle can be claimed
 */
export async function canClaimVehicle(
  vehicleId: string,
  userId: string
): Promise<CanClaimResult>;

/**
 * Submit verification documents for admin review
 * Uploads all documents to 'verification-docs' bucket
 * Creates verification_claims record with status='pending'
 */
export async function submitVehicleClaim(
  vehicleId: string,
  userId: string,
  documents: ClaimDocuments  // { registration, insurance, photo, selfie }
): Promise<{ success: boolean; claimId?: string; error?: string }>;

/**
 * Get all pending claims for admin dashboard
 */
export async function getPendingClaims(): Promise<ClaimWithDetails[]>;

/**
 * Get specific claim with vehicle/user/reviewer details
 */
export async function getClaimById(claimId: string): Promise<ClaimWithDetails | null>;

/**
 * Get all claims for a specific user
 */
export async function getUserClaims(userId: string): Promise<VerificationClaim[]>;

/**
 * Get all claims for a specific vehicle
 */
export async function getVehicleClaims(vehicleId: string): Promise<VerificationClaim[]>;

/**
 * Get claim status for user+vehicle combo
 */
export async function getClaimStatus(
  vehicleId: string,
  userId: string
): Promise<{ hasClaim: bool, status?, claimId?, ... }>;

/**
 * Admin approve claim - upgrade vehicle to verified tier
 */
export async function approveClaim(
  claimId: string,
  adminId: string,
  adminNotes?: string
): Promise<{ success: bool, error?: string }>;

/**
 * Admin reject claim - does not affect ownership
 */
export async function rejectClaim(
  claimId: string,
  adminId: string,
  adminNotes: string
): Promise<{ success: bool, error?: string }>;

/**
 * Cancel own pending claim (user-initiated)
 */
export async function cancelClaim(
  claimId: string,
  userId: string
): Promise<boolean>;

/**
 * Get claim statistics
 */
export async function getClaimStats(): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}>;

/**
 * Get recently approved claims (for admin dashboard)
 */
export async function getRecentApprovedClaims(limit?: number): Promise<ClaimWithDetails[]>;

/**
 * Convert claim document URL to public URL
 */
export function getClaimDocumentUrl(url: string | null): string | null;
```

### `/src/lib/verification.ts`

**Exports:**

```typescript
/**
 * Uploads document and calls AI verification Edge Function
 * Returns: success=true if verified && confidence >= 0.7
 */
export async function verifyDocument(
  vehicleId: string,
  file: File,
  expectedVIN: string,
  userId: string
): Promise<VerificationResult>;

/**
 * Normalize VIN: uppercase, remove spaces/dashes
 */
export function normalizeVIN(vin: string): string;

/**
 * Validate VIN format: 17 chars, no I/O/Q
 */
export function isValidVINFormat(vin: string): boolean;
```

### `/src/lib/notifications.ts`

**Exports:**

```typescript
/**
 * Notify vehicle owner of new review
 */
export async function notifyNewReview(
  vehicleId: string,
  reviewId: string
): Promise<void>;

/**
 * Notify vehicle owner of badge received
 */
export async function notifyBadgeReceived(
  vehicleId: string,
  badgeId: string
): Promise<void>;

/**
 * Notify user of content moderation result (approve/reject)
 * Used for: claim approvals, content moderation, etc.
 */
export async function notifyModerationResult(
  userId: string,
  contentType: 'review' | 'post' | 'profile_image',
  contentId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<void>;

// Called on claim approval:
// notifyModerationResult(userId, 'review', claimId, 'approved',
//   'Your vehicle ownership claim has been verified!');
```

---

## TYPESCRIPT TYPES & INTERFACES

### Vehicle Types

```typescript
export type VerificationTier = 'shadow' | 'standard' | 'verified';

export interface Vehicle {
  id: string;
  plate_hash: string;
  owner_id: string | null;  // null = shadow
  is_claimed: boolean;
  claimed_at: string | null;  // ISO timestamp
  verification_tier: VerificationTier;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  color: string | null;
  owner_proof_url: string | null;  // Registration document URL
  stock_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleWithOwner extends Vehicle {
  owner?: {
    id: string;
    handle: string;
    avatar_url: string | null;
    reputation_score: number;
  };
}
```

### Claim Types

```typescript
export interface VerificationClaim {
  id: string;
  vehicle_id: string;
  user_id: string;
  registration_url: string | null;
  insurance_url: string | null;
  photo_url: string | null;
  selfie_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimWithDetails extends VerificationClaim {
  vehicle?: {
    id: string;
    year: number;
    make: string;
    model: string;
    plate_hash: string;
  };
  user?: {
    id: string;
    handle: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  reviewer?: {
    id: string;
    handle: string;
    full_name: string | null;
  };
}

export interface ClaimDocuments {
  registration: File | null;
  insurance: File | null;
  photo: File | null;
  selfie: File | null;
}

export interface CanClaimResult {
  canClaim: boolean;
  reason?: string;
}
```

### Review Types

```typescript
export interface Review {
  id: string;
  vehicle_id: string;
  author_id: string;
  rating_look: number;
  rating_sound: number;
  rating_condition: number;
  rating_driver: number;
  text: string | null;
  image_url: string | null;
  location_label: string | null;
  is_hidden_by_owner: boolean;
  created_at: string;
  updated_at: string;
}
```

### Verification Result Types

```typescript
export interface VerificationResult {
  success: boolean;
  reason?: string;
  message: string;
  verification_tier?: string;
  detected_vin?: string;
  expected_vin?: string;
}

export interface AIVerificationResponse {
  verified: boolean;
  confidence: number;
  reason?: string;
  extractedData?: {
    vin: string;
    make: string;
    model: string;
    year: number;
    plate: string;
    state: string;
    ownerName: string;
  };
}
```

### Profile Types

```typescript
export interface Profile {
  id: string;
  handle: string;
  avatar_url: string | null;
  reputation_score: number;
  carma_points: number;
  location: string | null;
  is_private: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## STATE MANAGEMENT & HOOKS

### Context Providers

**Location:** `/src/contexts/`

#### AuthContext
```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: { handle: string | null; role: string | null } | null;
  signUp: (email, password) => Promise<{ error }>;
  signIn: (email, password) => Promise<{ error }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

#### BadgeContext
```typescript
interface BadgeContextType {
  unlockedBadge: Badge | null;
  dismissBadge: () => void;
}
```

### Custom Hooks

**Location:** `/src/hooks/`

#### useAsync
Generic async operation handling with loading/error states

#### useBadgeChecker
```typescript
const { checkActivityBadges } = useBadgeChecker();
// Returns: Promise<{ badge_name, badge_id }[]>
```

#### useModerationSubscription
Real-time subscription to moderation status changes

**Usage:**
```typescript
const { moderation } = useModerationSubscription();
// Triggers UI refresh when claim status changes
```

---

## ROUTING & NAVIGATION

### URL Hash-Based Routing

**File:** `/src/App.tsx`

**Vehicle URLs:**
```
#/vehicle/{vehicleId}          // Claimed vehicle detail
#/shadow/{plateNumber}          // Shadow profile (unclaimed)
#/shadow/CA-ABC123              // State-plate encoded
```

**Page Types:**
```typescript
type Page =
  | 'feed'
  | 'scan'
  | 'rankings'
  | 'profile'
  | 'vehicle-detail'
  | 'shadow-profile'
  | 'search'
  | 'admin'
  | ...
```

### Navigation Handler

```typescript
const handleNavigate = (page: string, data?: any) => {
  if (page === 'vehicle-detail' && typeof data === 'string') {
    setSelectedVehicleId(data);
    setCurrentPage('vehicle-detail');
  } else if (page === 'shadow-profile' && typeof data === 'string') {
    setShadowPlateNumber(data);
    setCurrentPage('shadow-profile');
  }
};
```

### Deep Linking

Users can access:
- `app.carma.com/#/vehicle/{vehicleId}` - Claimed vehicle
- `app.carma.com/#/shadow/CA-ABC123` - Shadow profile
- `app.carma.com/#/shadow/{plateNumber}` - Public discovery

---

## NOTIFICATION SYSTEM

### Notification Types

```typescript
enum NotificationTypes {
  NEW_REVIEW = 'new_review',
  NEW_FOLLOWER = 'new_follower',
  BADGE_RECEIVED = 'badge_received',
  BADGE_UNLOCKED = 'badge_unlocked',
  REVIEW_APPROVED = 'review_approved',
  REVIEW_REJECTED = 'review_rejected',
  POST_LIKE = 'post_like',
  POST_COMMENT = 'post_comment',
}
```

### Claim-Related Notifications

#### When Vehicle Claimed (Soft Claim)
- No push notification
- UI shows: "Vehicle claimed successfully!"

#### When Verification Documents Submitted
- No user notification
- Admin dashboard shows: "Pending review"

#### When Claim Approved
```typescript
await notifyModerationResult(
  userId,
  'review',  // Content type
  claimId,
  'approved',
  'Your vehicle ownership claim has been verified!'
);
```

**Push Notification:**
- Title: "Content Approved"
- Body: "Your vehicle ownership claim has been verified!"
- Data: `{ type: 'review_approved', claimId, vehicleId }`

#### When Claim Rejected
```typescript
await notifyModerationResult(
  userId,
  'review',
  claimId,
  'rejected',
  adminNotes || 'Documents did not meet verification requirements'
);
```

**Push Notification:**
- Title: "Content Not Approved"
- Body: rejection reason
- Data: `{ type: 'review_rejected', claimId }`

#### When Vehicle Gets First Review After Claim
```typescript
await notifyNewReview(vehicleId, reviewId);
```

**Push Notification:**
- Title: "New Review"
- Body: "Someone reviewed your {year} {make} {model}"
- Data: `{ type: 'new_review', vehicleId, reviewId }`

#### When Badge Awarded
```typescript
await notifyBadgeReceived(vehicleId, badgeId);
```

**Push Notification:**
- Title: "Badge Received!"
- Body: "Your {vehicle} received the {badge} badge"
- Data: `{ type: 'badge_received', badgeId, vehicleId }`

---

## ADMIN/MODERATION WORKFLOW

### AdminDashboard - Claims Tab

**Location:** `/src/pages/AdminDashboard.tsx`

**Sections:**
1. **Pending Claims** - Filter by status
2. **Claim Details** - View vehicle info + user info + documents
3. **Actions:**
   - View documents (registration, insurance, photo, selfie)
   - Download for manual review
   - **Approve** - Upgrade to verified tier
   - **Reject** - Send rejection reason + allow resubmission

**Approve Flow:**
```typescript
const handleApprove = async (claimId: string, adminNotes?: string) => {
  const result = await approveClaim(claimId, adminId, adminNotes);
  if (result.success) {
    // 1. Vehicle updated: owner_id set, verification_tier='verified'
    // 2. Claim updated: status='approved', reviewed_by, reviewed_at
    // 3. Badge: "Verified Owner" awarded
    // 4. Notification sent to user
    // 5. UI refreshes, claim removed from pending list
  }
};
```

**Reject Flow:**
```typescript
const handleReject = async (claimId: string, adminNotes: string) => {
  const result = await rejectClaim(claimId, adminId, adminNotes);
  if (result.success) {
    // 1. Claim updated: status='rejected', admin_notes set
    // 2. Vehicle UNCHANGED - ownership preserved
    // 3. Notification sent with rejection reason
    // 4. User can resubmit new documents
  }
};
```

### Audit Logging

**File:** `/src/lib/adminAudit.ts`

**Logged Events:**
- `CLAIM_APPROVED` - Claim approved, vehicle verified
- `CLAIM_REJECTED` - Claim rejected
- `REVIEW_HIDDEN` - Owner hid post-claim review
- `REVIEW_DELETED_GODMODE` - Owner deleted pre-claim review (God Mode)
- etc.

```typescript
interface AdminAction {
  admin_id: string;
  action_type: string;
  target_user_id: string | null;
  target_content_id: string | null;
  description: string;
  created_at: string;
}
```

---

## DATA FLOW DIAGRAMS

### Shadow Profile → Standard Claim Flow

```
User scans plate/finds vehicle
         ↓
ShadowProfilePage displayed
         ↓
Community posts reviews (vehicle.owner_id = NULL)
         ↓
Real owner clicks "Claim This Vehicle"
         ↓
ClaimVehicleModal
  ├─ User confirms details (make, model, year, color)
  ├─ User accepts legal ownership
  └─ Calls: claimVehicleStandard(vehicleId, userId)
         ↓
RPC: claim_vehicle_atomic() executes
  ├─ Updates vehicle: owner_id, is_claimed=true, claimed_at=NOW()
  ├─ verification_tier ← 'standard'
  └─ Awards "My First Ride" badge
         ↓
Frontend navigates to VehicleDetailPage
  ├─ Shows: "You're the owner"
  ├─ Displays: "Verify Ownership" CTA
  └─ Shows pre-claim reviews (with delete option via God Mode RLS)
```

### Standard Claim → Verified Tier Flow (AI Path)

```
Owner clicks "Verify Ownership" on VehicleDetailPage
         ↓
VerifyOwnershipModal
  ├─ User enters VIN (17 chars, validated)
  ├─ User uploads registration document
  ├─ User consents to OpenAI processing
  └─ Calls: verifyDocument(vehicleId, file, vin, userId)
         ↓
verifyDocument() flow:
  ├─ uploadVerificationProof(file, vehicleId, userId)
  │  └─ Uploads to 'vehicles' bucket → returns public URL
  │
  ├─ supabase.functions.invoke('verify-document', { imageUrl, ... })
  │  ├─ Edge Function fetches document from HTTPS URL
  │  ├─ Calls OpenAI Vision API
  │  ├─ Extracts: VIN, make, model, year, plate, state, owner_name
  │  ├─ Compares: extracted_vin == user_entered_vin
  │  └─ Returns: { verified, confidence, extractedData }
  │
  └─ Returns: VerificationResult
         ↓
IF verified && confidence >= 0.7:
  ├─ Calls: rpc('upgrade_to_verified', { vehicleId, userId, proofUrl })
  ├─ RPC updates vehicle: verification_tier='verified', owner_proof_url
  ├─ Awards "Verified Owner" badge
  ├─ Frontend shows success modal
  └─ User redirected to VehicleDetailPage with ✅ badge
         ↓
ELSE (VIN mismatch or confidence < 0.7):
  ├─ Creates verification_claims record: status='pending'
  ├─ Calls: submitVehicleClaim({ registration: { url: proofUrl } })
  ├─ Frontend shows: "Verification pending - admin will review"
  └─ Admin reviews in AdminDashboard
```

### Standard Claim → Verified Tier Flow (Manual Documents Path)

```
Owner clicks "Submit Verification Documents" on VehicleDetailPage
         ↓
ClaimVehicleModalVerification
  ├─ User uploads: registration (required), insurance, photo, selfie
  ├─ Frontend validates: file types, sizes, formats
  └─ Calls: submitVehicleClaim(vehicleId, userId, { reg, ins, photo, selfie })
         ↓
submitVehicleClaim() flow:
  ├─ For each document:
  │  ├─ uploadFile(..., 'verification-docs')
  │  ├─ Gets public URL
  │  └─ Stores URL in uploadedUrls object
  │
  ├─ Calls: rpc('submit_claim', { registration_url, insurance_url, ... })
  │  └─ RPC creates verification_claims record: status='pending'
  │
  └─ Returns: { success: true, claimId }
         ↓
Frontend shows: "We'll review within 24-48 hours"
         ↓
Admin reviews in AdminDashboard → moderation tab
  │
  ├─ IF Approve:
  │  ├─ approveClaim(claimId, adminId, notes)
  │  ├─ RPC updates vehicle: verification_tier='verified', owner_proof_url
  │  ├─ Awards "Verified Owner" badge
  │  └─ notifyModerationResult(..., 'approved')
  │
  └─ IF Reject:
     ├─ rejectClaim(claimId, adminId, notes)
     ├─ Updates claim: status='rejected', admin_notes
     ├─ Vehicle UNCHANGED
     └─ notifyModerationResult(..., 'rejected', notes)
         ↓
User notified + can resubmit new documents
```

### God Mode Review Deletion (Pre-Claim Only)

```
Vehicle is unclaimed (owner_id = NULL)
         ↓
User@alice posts review at 2:00 PM
  └─ reviews.created_at = 2:00 PM
         ↓
Owner@bob discovers vehicle, claims it at 3:00 PM
  └─ vehicle.claimed_at = 3:00 PM
  └─ vehicle.owner_id = bob_id
         ↓
Bob sees review from alice on VehicleDetailPage
  ├─ Review is pre-claim (created_at < claimed_at)
  └─ Delete button visible
         ↓
Bob clicks "Delete Review"
  ├─ Frontend calls: DELETE from reviews WHERE id = review_id
  └─ RLS policy evaluates:
     ├─ USING (
     │   EXISTS (
     │     SELECT 1 FROM vehicles
     │     WHERE vehicles.id = reviews.vehicle_id
     │       AND vehicles.owner_id = auth.uid()  ← bob_id
     │       AND vehicles.claimed_at > reviews.created_at  ← 3:00 PM > 2:00 PM ✓
     │   )
     │ )
     │
     └─ RLS policy allows deletion ✓
         ↓
Review deleted from database
         ↓
Later: Bob sees review from alice posted AFTER 3:00 PM
  ├─ Review is post-claim (created_at > claimed_at)
  ├─ Delete button NOT visible
  └─ Hide button visible (is_hidden_by_owner toggle)
         ↓
Bob clicks "Hide Review"
  ├─ Frontend calls: UPDATE reviews SET is_hidden_by_owner=true
  ├─ RLS policy allows (owner of vehicle)
  └─ Review hidden but NOT deleted (can be unhidden)
```

---

## KNOWN ISSUES & EDGE CASES

### ✓ Implemented & Tested

1. **Race Condition on Claim** - Handled by RPC atomicity
   - If two users claim simultaneously, RPC transaction ensures first wins
   - Second user gets error: "Vehicle already claimed"

2. **God Mode RLS Enforcement** - Tested in `/src/__tests__/security_tiers.test.ts`
   - Pre-claim reviews can be deleted by owner
   - Post-claim reviews cannot be deleted (only hidden)
   - Non-owners cannot delete any reviews

3. **VIN Format Validation** - Client-side + server-side
   - Client: 17 chars, no I/O/Q
   - Server: verify-document Edge Function validates

4. **AI Verification Fallback** - If OpenAI fails, creates pending claim
   - User not blocked if API error
   - Admin reviews manually

### ⚠️ Edge Cases Requiring Attention

1. **Multiple Pending Claims for Same Vehicle**
   - CURRENT: Unique constraint on (vehicle_id, user_id) for pending only
   - USER can submit multiple times, but only latest is pending
   - ISSUE: If user submits Claim A, rejects it manually, then submits Claim B - could have edge case
   - RECOMMENDATION: Add constraint to only allow 1 pending per vehicle+user

2. **Verification Tier Downgrade**
   - CURRENT: No mechanism to downgrade verified → standard
   - EDGE CASE: If owner proof document removed/expired, tier stays verified
   - RECOMMENDATION: Add admin action to downgrade for fraud cases

3. **God Mode After Vehicle Transfer**
   - CURRENT: Not possible to transfer ownership
   - EDGE CASE: If transfer implemented, God Mode would apply only to first owner
   - RECOMMENDATION: Flag transferred vehicles to prevent confusion

4. **Location Fuzzing Implementation**
   - CURRENT: Location fuzzing mentioned but NOT implemented in frontend
   - TODO: Implement 1km fuzz + 60-min delay for location_label in posts/reviews

5. **Document Expiration**
   - CURRENT: Uploaded documents stored indefinitely
   - EDGE CASE: If registration/insurance expires, no re-verification
   - RECOMMENDATION: Add admin action to require re-verification

### TODO: Not Yet Implemented

1. **Badge Awarding Rate Limiting**
   - Each badge has `monthly_limit`
   - TODO: Enforce in `award_carma_points` RPC

2. **Verification Claim Cancellation**
   - Users can cancel pending claims (implemented)
   - TODO: Document user flow in UI

3. **Admin Bulk Actions**
   - TODO: Approve/reject multiple claims simultaneously

4. **Appeal Workflow**
   - Rejected claims show rejection reason
   - TODO: Allow users to appeal admin decision

5. **Vehicle Merge**
   - If same vehicle found multiple times (shadow duplicates)
   - TODO: Admin action to merge vehicles

---

## SECURITY CONSIDERATIONS

### ✓ Implemented Security

1. **License Plate Hashing**
   - Plaintext plates NEVER stored in DB
   - Only SHA-256(state + plate) stored as `plate_hash`
   - Hash used for vehicle lookup

2. **RLS Enforcement**
   - Shadow vehicles: anyone can create, only can read
   - Claimed vehicles: only owner can update
   - Reviews: complex RLS for God Mode enforcement
   - Verification claims: only users + admins can read

3. **Document Verification**
   - AI verification via Edge Function
   - HTTPS-only URLs for document access
   - OpenAI API key server-side only

4. **Storage Bucket Privacy**
   - 'vehicles' bucket: private (not listed publicly)
   - 'verification-docs' bucket: private
   - URLs generated on-demand via `getPublicUrl()`

5. **VIN Validation**
   - 17-char format enforced
   - No I/O/Q characters (VIN spec)
   - Server-side verification in Edge Function

### ⚠️ Security Recommendations

1. **Rate Limiting on Verification Attempts**
   - TODO: Limit failed verification attempts to prevent abuse
   - RECOMMENDATION: Max 3 attempts per day per vehicle+user

2. **Document Scanning for Malware**
   - TODO: Implement virus scanning on document upload
   - RECOMMENDATION: Use VirusTotal or Cloudflare scanning

3. **Fraud Detection**
   - TODO: Flag suspicious patterns (e.g., user claiming 1000s of vehicles)
   - RECOMMENDATION: Admin dashboard fraud alerts

4. **Consent & Privacy**
   - ✓ AI processing consent shown to user
   - TODO: Privacy policy update explaining document usage
   - RECOMMENDATION: Add explicit data retention policy

5. **Admin Action Audit Trail**
   - ✓ All admin actions logged in `admin_audit_log`
   - RECOMMENDATION: Add 2FA for admin accounts

---

## COMPLETE FILE REFERENCE

### Database

```
/supabase/migrations/
├── 20251123031023_create_carma_schema.sql          [Main schema: profiles, vehicles, reviews, badges]
├── 20251123220225_add_photo_posts_social_features.sql  [Posts table]
└── [Additional migrations...]
```

### Backend Functions

```
/supabase/functions/
├── verify-document/index.ts                        [AI verification via OpenAI Vision]
├── detect-vehicle/index.ts                         [Google Vision vehicle detection]
├── hash-plate/index.ts                             [SHA-256 license plate hashing]
├── send-push-notification/index.ts                 [Push notifications]
├── get-admin-stats/index.ts                        [Admin dashboard stats]
└── ...
```

### Frontend - Pages

```
/src/pages/
├── ShadowProfilePage.tsx                           [Unclaimed vehicle view]
├── VehicleDetailPage.tsx                           [Claimed vehicle owner dashboard]
├── AdminDashboard.tsx                              [Admin verification claims]
└── ...
```

### Frontend - Components

```
/src/components/
├── ClaimVehicleModal.tsx                           [Soft claim: shadow → standard]
├── VerifyOwnershipModal.tsx                        [AI verification: standard → verified]
├── ClaimVehicleModalVerification.tsx               [Manual documents submission]
├── PlateFoundUnclaimed.tsx                         [Shadow vehicle display card]
├── PlateFoundClaimed.tsx                           [Claimed vehicle display card]
├── TierBadge.tsx                                   [Verification tier badge]
├── VerifiedBadge.tsx                               [Verified owner badge]
└── ...
```

### Frontend - Libraries

```
/src/lib/
├── vehicles.ts                                     [Core claiming functions]
├── claims.ts                                       [Verification claims management]
├── verification.ts                                 [AI verification logic]
├── profileViews.ts                                 [Profile tracking]
├── notifications.ts                                [Push notifications]
├── adminAudit.ts                                   [Admin action logging]
├── supabase.ts                                     [Supabase client]
└── ...
```

### Frontend - Contexts & Hooks

```
/src/contexts/
├── AuthContext.tsx                                 [User authentication state]
├── BadgeContext.tsx                                [Badge inventory state]
└── ToastContext.tsx                                [Toast notifications]

/src/hooks/
├── useAsync.ts                                     [Generic async handling]
├── useBadgeChecker.ts                              [Badge eligibility checking]
├── useModerationSubscription.ts                    [Real-time moderation updates]
└── ...
```

### Tests

```
/src/__tests__/
├── security_tiers.test.ts                          [RLS policy + God Mode verification]
└── ...
```

---

## SUMMARY: Key Touchpoints for Enhancement

When enhancing the shadow → claimed vehicle workflow, remember to update:

1. **Database Schema** - If adding new fields to vehicles/claims tables
2. **RLS Policies** - If changing access control logic
3. **Edge Functions** - If modifying verification logic
4. **Frontend Pages** - If changing user flows (ShadowProfilePage, VehicleDetailPage)
5. **Modal Components** - If updating claim/verification UX
6. **Library Functions** - If adding new business logic (vehicles.ts, claims.ts)
7. **Notification System** - If adding new notification types
8. **Admin Dashboard** - If adding new admin workflows
9. **TypeScript Types** - If adding/removing fields from types
10. **RLS Tests** - If changing security policies

---

**This document is the complete reference for the Carma shadow profile to claimed vehicle workflow. Use it as a blueprint for understanding all moving parts and ensuring changes don't break related functionality.**

