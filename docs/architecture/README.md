# Carma Architecture Documentation

This directory contains comprehensive architectural documentation for the Carma platform.

## Core Domain Documents

### Vehicle Claiming & Verification Workflow
**File:** [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md)

**Status:** ✅ Current (Last Updated: 2026-01-28)

**Scope:** Complete end-to-end documentation for the shadow profile → claimed vehicle workflow

**Required Reading For:**
- ✅ All new backend engineers
- ✅ All new frontend engineers
- ✅ QA/test engineers
- ✅ Security/privacy reviewers
- ✅ Anyone refactoring auth, vehicle, or profile logic
- ✅ Data integrity & abuse prevention reviewers

**Key Topics:**
- Vehicle verification tiers (shadow/standard/verified)
- Database schema & relationships
- Row-level security (RLS) policies
- God Mode review deletion mechanics
- AI document verification flow
- Admin approval workflow
- Push notifications
- Edge cases & known issues

**Quick Navigation:**
- [Database Schema](#database-schema--relationships) - All tables, constraints, indexes
- [RLS Policies](#row-level-security-rls-policies) - Security model
- [Frontend Components](#frontend-components--pages) - UI flows
- [Backend APIs](#backend-api-endpoints--edge-functions) - Edge functions & RPCs
- [Data Flows](#data-flow-diagrams) - Step-by-step workflows
- [Security](#security-considerations) - Implementation details
- [Edge Cases](#known-issues--edge-cases) - Known limitations & TODOs

---

## Using This Documentation

### For New Team Members

1. **Onboarding Checklist:**
   - [ ] Read [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md) (full document, ~1 hour)
   - [ ] Review [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#database-schema--relationships`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#database-schema--relationships)
   - [ ] Study [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#row-level-security-rls-policies`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#row-level-security-rls-policies)
   - [ ] Review [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#frontend-components--pages`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#frontend-components--pages)
   - [ ] Understand [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#data-flow-diagrams`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#data-flow-diagrams)

### For Code Reviews

Use this checklist when reviewing PRs that touch vehicle, profile, or verification logic:

- [ ] Schema changes documented in [Database Schema](#database-schema--relationships) section
- [ ] RLS policy changes comply with [Security model](#row-level-security-rls-policies)
- [ ] God Mode logic preserved (if touching reviews + claiming)
- [ ] All [Edge Cases](#known-issues--edge-cases) considered
- [ ] Tests added for new workflows
- [ ] This doc updated with any logic changes (part of "definition of done")

### For Maintenance

**Keep This Document "Living":**

When making changes to vehicle claiming, verification, or profile workflows:

1. **Before:** Read relevant section(s)
2. **During:** Note any logic changes
3. **After:** Update the document with changes
4. **Validation:** Ensure all [Edge Cases](#known-issues--edge-cases) still hold
5. **Testing:** Add test coverage for changed logic

---

## Workflow Summaries

### Shadow Profile → Standard Claim

```
User discovers unclaimed vehicle → Confirms ownership → RPC atomically claims
                                                           ↓
                                                   Vehicle now owned, tier='standard'
                                                   Award "My First Ride" badge
```

**File Reference:** [`src/components/ClaimVehicleModal.tsx`](../../src/components/ClaimVehicleModal.tsx)

### Standard Claim → Verified Tier

**Path 1: AI Verification**
```
User uploads registration → Edge Function (OpenAI Vision) → Extract VIN
                                                              ↓ (success)
                                                   Tier='verified' + badge
                                                   OR (mismatch) → Pending admin review
```

**Path 2: Manual Documents**
```
User uploads: registration + optional docs → Pending admin review
                                              ↓ (admin approves)
                                              Tier='verified' + badge
```

**File References:**
- [`src/components/VerifyOwnershipModal.tsx`](../../src/components/VerifyOwnershipModal.tsx) - AI path
- [`src/components/ClaimVehicleModalVerification.tsx`](../../src/components/ClaimVehicleModalVerification.tsx) - Manual path

### God Mode: Pre-Claim Review Deletion

```
Owner claims vehicle at 3:00 PM (claimed_at = 3:00 PM)
                  ↓
Review posted at 2:00 PM (pre-claim) → Owner CAN delete via RLS policy
Review posted at 4:00 PM (post-claim) → Owner can only HIDE (not delete)
```

**Critical RLS Logic:** Review deletion allowed only if `vehicle.claimed_at > review.created_at`

**File Reference:** [`docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#god-mode-pre-claim-review-deletion`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#god-mode-pre-claim-review-deletion)

---

## Key Architectural Decisions

### 1. Vehicle Ownership Model
- **Shadow vehicles:** `owner_id = NULL`
- **Claimed vehicles:** `owner_id = NOT NULL`
- **Reason:** Simple, queryable, enables RLS-based access control

### 2. License Plate Privacy
- **Stored as:** SHA-256 hash only (never plaintext)
- **Why:** Privacy-first platform, compliance with location/plate regulations
- **Lookup:** Hash first, then query by `plate_hash`

### 3. Three-Tier Verification
- **Shadow:** Unknown origin, anyone can review
- **Standard:** Soft claim (fast path for true owners)
- **Verified:** Proof uploaded & verified (legal/dispute evidence)

### 4. God Mode RLS Enforcement
- **Design:** Not a special privilege, but an RLS policy on `reviews` table
- **Logic:** Owner can delete reviews created BEFORE they claimed (pre-claim only)
- **Why:** Protects against shill reviews while respecting author intent for post-claim reviews
- **Validated:** See [`src/__tests__/security_tiers.test.ts`](../../src/__tests__/security_tiers.test.ts)

### 5. AI-First Verification
- **Tool:** OpenAI Vision API (not manual admin only)
- **Fallback:** If AI uncertain, creates pending claim for manual admin review
- **Why:** Fast UX for legitimate owners, fraud prevention via AI confidence thresholds

---

## Critical Constraints (Never Relax)

### Security & Privacy

1. **License Plates** - NEVER store plaintext in database
   - Always use SHA-256 hash (`plate_hash`)
   - Exception: temporary frontend state only (immediately hashed before DB insert)

2. **God Mode RLS** - NEVER allow owners to delete post-claim reviews
   - Enforced by RLS policy: `vehicle.claimed_at > review.created_at`
   - Test: See [`src/__tests__/security_tiers.test.ts`](../../src/__tests__/security_tiers.test.ts)

3. **Admin Audit Trail** - NEVER skip logging admin actions
   - All approvals/rejections must log to `admin_audit_log`
   - Required for compliance & abuse investigation

4. **Verification Tiers** - NEVER downgrade without admin action
   - Once `verified`, tier stays verified (no auto-downgrade)
   - Manual admin action required for fraud cases

---

## Testing Coverage

### Tests for This Workflow

**Location:** [`src/__tests__/security_tiers.test.ts`](../../src/__tests__/security_tiers.test.ts)

**Current Coverage:**
- ✅ RLS policy enforcement (shadow/standard/verified)
- ✅ God Mode review deletion (pre-claim only)
- ✅ Review hiding for post-claim reviews

**Needed Coverage:**
- [ ] Claim race conditions (two simultaneous claims)
- [ ] VIN format validation (17 chars, no I/O/Q)
- [ ] AI verification confidence thresholds
- [ ] Admin approve/reject workflows
- [ ] Notification triggers on all claim state changes
- [ ] Location fuzzing (if implemented)
- [ ] Badge awarding on first claim + verified tier

### Running Tests

```bash
npm test                              # All tests
npm test security_tiers               # RLS policy tests
npm test -- --coverage               # Coverage report
```

### CI/CD Integration

Tests should run on all PRs touching:
- `src/lib/vehicles.ts`
- `src/lib/claims.ts`
- `src/lib/verification.ts`
- `src/components/Claim*.tsx`
- `src/components/Verify*.tsx`
- `src/pages/VehicleDetailPage.tsx`
- `src/pages/ShadowProfilePage.tsx`
- Database migrations

---

## Edge Cases & Limitations

### Known Issues (See Full Doc)

1. **Multiple Pending Claims** - Only one pending claim per vehicle+user allowed
2. **Verification Tier Downgrade** - Not possible without admin action
3. **Location Fuzzing** - Documented but not yet implemented
4. **Document Expiration** - No re-verification required for expired docs
5. **Vehicle Merge** - No deduplication for shadow vehicles yet

### Recommendations

See full document: [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#known-issues--edge-cases`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#known-issues--edge-cases)

---

## File Organization

### Database Migrations
- `supabase/migrations/20251123031023_create_carma_schema.sql` - Core schema
- Additional migrations in `supabase/migrations/`

### Backend
- `supabase/functions/verify-document/` - AI verification
- `supabase/functions/hash-plate/` - License plate hashing
- `supabase/functions/send-push-notification/` - Notifications

### Frontend - Pages
- `src/pages/ShadowProfilePage.tsx` - Unclaimed vehicle view
- `src/pages/VehicleDetailPage.tsx` - Owner dashboard
- `src/pages/AdminDashboard.tsx` - Admin claim review

### Frontend - Components
- `src/components/ClaimVehicleModal.tsx` - Soft claim modal
- `src/components/VerifyOwnershipModal.tsx` - AI verification modal
- `src/components/ClaimVehicleModalVerification.tsx` - Manual documents modal
- `src/components/PlateFoundUnclaimed.tsx` - Shadow vehicle card
- `src/components/PlateFoundClaimed.tsx` - Claimed vehicle card

### Frontend - Libraries
- `src/lib/vehicles.ts` - Core claiming functions
- `src/lib/claims.ts` - Verification claims management
- `src/lib/verification.ts` - AI verification logic
- `src/lib/notifications.ts` - Push notification triggers
- `src/lib/adminAudit.ts` - Admin action logging

---

## Review Checklist for PRs

When reviewing code that touches vehicle/profile/verification logic:

### Schema Changes
- [ ] Migration file created with detailed markdown summary
- [ ] RLS policies updated if access patterns change
- [ ] Indexes added for frequently-queried columns
- [ ] Constraints enforce data integrity

### Backend Changes
- [ ] Edge Function follows CORS requirements
- [ ] Error handling implemented
- [ ] Audit logging added (if applicable)
- [ ] Rate limiting considered

### Frontend Changes
- [ ] Component follows established patterns (see existing modals)
- [ ] TypeScript types updated
- [ ] Error states handled
- [ ] Loading states visible
- [ ] Accessibility (ARIA labels, semantic HTML)

### Testing
- [ ] Unit tests for new functions
- [ ] Integration tests for workflows
- [ ] RLS policy tests (if security changes)
- [ ] Edge cases covered

### Documentation
- [ ] This file updated if logic changes
- [ ] Code comments explain non-obvious logic
- [ ] Related sections in [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md) reviewed

---

## Contact & Questions

- **For workflow questions:** See [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md)
- **For RLS/security:** See [Row-Level Security](#row-level-security-rls-policies) section
- **For component details:** See [Frontend Components](#frontend-components--pages) section
- **For edge cases:** See [Known Issues](#edge-cases--limitations) section

---

**Last Validated:** 2026-01-28
**Maintained By:** Engineering Team
**Status:** Living Document (update as workflows evolve)
