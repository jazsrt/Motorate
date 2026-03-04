# PR Review Checklist: Vehicle Claiming & Verification Workflow

**Use this checklist when reviewing PRs that modify:**
- Vehicle claiming logic
- Verification workflows
- Profile/ownership related features
- Admin review/approval processes
- License plate handling
- Review management (hiding, deleting, God Mode)

**Reference Document:** [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md)

---

## Pre-Review: Required Reading

- [ ] Reviewer has read [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md) (or reviewed relevant sections)
- [ ] PR author has updated the workflow doc if logic changed
- [ ] All edge cases from [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#known-issues--edge-cases`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#known-issues--edge-cases) are considered

---

## Database Schema Changes

- [ ] Migration file created with markdown summary (not just SQL)
- [ ] Summary explains: what changed, why, and impact on RLS
- [ ] `IF NOT EXISTS` or `IF EXISTS` guards prevent errors
- [ ] No destructive operations (`DROP`, `DELETE`) without justification
- [ ] Foreign key constraints properly defined
- [ ] Indexes added for frequently-queried columns (e.g., `owner_id`, `plate_hash`, `status`)
- [ ] Constraints enforce data integrity:
  - [ ] License plate hashing constraints (if applicable)
  - [ ] Verification tier validation (`shadow|standard|verified`)
  - [ ] Ownership constraints (claimed vehicles MUST have owner_id)
- [ ] Default values set appropriately (e.g., `is_claimed = false`, `claimed_at = null`)
- [ ] Timestamps: `created_at`, `updated_at` added

---

## RLS Policy Changes

- [ ] RLS policies reviewed and updated (if access patterns changed)
- [ ] **God Mode logic intact:** Pre-claim review deletion policy not modified
  - Policy check: `vehicle.claimed_at > review.created_at`
  - [ ] RLS still denies delete if `claimed_at <= created_at` (post-claim or no claim)
- [ ] **Owner-only updates:** Vehicle updates require `owner_id = auth.uid()`
- [ ] **Shadow vehicles:** Can only be read, not modified (except by owner after claim)
- [ ] **Verification claims:** Only users + admins can access
- [ ] No `USING (true)` policies (defeats RLS purpose)
- [ ] All policies check `auth.uid()` (not `current_user`)
- [ ] Policies tested in `src/__tests__/security_tiers.test.ts`

---

## Backend Changes (Edge Functions, RPCs)

### Edge Functions

- [ ] CORS headers implemented correctly:
  ```typescript
  "Access-Control-Allow-Origin": "*"
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
  ```
- [ ] OPTIONS request handled (preflight)
- [ ] Error handling implemented (try/catch)
- [ ] Sensitive data (API keys) NOT exposed in responses
- [ ] HTTPS-only URLs validated (for document verification)
- [ ] Timeout handling (AI/Vision API calls)

### RPC Functions

- [ ] Atomicity: Multi-step operations wrapped in transactions (where needed)
- [ ] Input validation: All parameters validated
- [ ] Output: Return consistent JSON structure
- [ ] Error messages: User-friendly (mapped in frontend)
- [ ] Logging: Admin actions logged to `admin_audit_log`

### License Plate Handling

- [ ] License plates NEVER sent plaintext to database
- [ ] Plates hashed via `hash-plate` Edge Function (SHA-256)
- [ ] Only `plate_hash` stored, never plaintext
- [ ] Exception: Frontend state only, immediately hashed before DB insert

### Document Verification

- [ ] AI verification logic: confidence threshold >= 0.7
- [ ] Fallback: If VIN mismatch or low confidence, creates `pending` claim
- [ ] VIN format validated: 17 chars, no I/O/Q
- [ ] Storage: Documents uploaded to `vehicles` bucket (private)
- [ ] No PII stored in documents (names, addresses stripped if possible)

---

## Frontend Changes

### Component Patterns

- [ ] Component follows established modal/page patterns (see existing ClaimVehicleModal, VerifyOwnershipModal)
- [ ] Props properly typed (TypeScript interfaces)
- [ ] Callback handlers named consistently (`onClose`, `onSuccess`, `onError`)
- [ ] State management uses React hooks (useState, useEffect) consistently

### Modals & Forms

- [ ] File uploads validated before submission:
  - [ ] File type check (JPG, PNG, PDF for docs)
  - [ ] File size check (max 10MB)
- [ ] VIN format validated before submission (`isValidVINFormat()`)
- [ ] Error states displayed to user
- [ ] Loading states visible (spinner, disabled button)
- [ ] Success confirmation before closing
- [ ] Accessibility: ARIA labels, semantic HTML

### Pages

- [ ] Ownership check used correctly (`user?.id === vehicle?.owner_id`)
- [ ] Unclaimed vehicle detection (`vehicle?.owner_id === null`)
- [ ] Verification tier displayed correctly (shadow/standard/verified badges)
- [ ] God Mode buttons only shown for pre-claim reviews
- [ ] Post-claim reviews show "Hide" not "Delete"

### Data Fetching

- [ ] `supabase.from(...).select(...).maybeSingle()` for 0-1 rows (NOT `single()`)
- [ ] Error handling for failed queries
- [ ] Loading states during fetch
- [ ] Null checks before using data

### State Updates

- [ ] Vehicle data invalidated after claim (refresh from DB)
- [ ] Badge inventory updated after claim
- [ ] Navigation handled correctly (to VehicleDetailPage after claim)
- [ ] URL hash updated if deep linking used

---

## TypeScript & Types

- [ ] New types defined in appropriate file (vehicles.ts, claims.ts, etc.)
- [ ] Types match database schema (fields, nullability)
- [ ] VerificationTier type used consistently (`'shadow' | 'standard' | 'verified'`)
- [ ] VerificationClaim interface complete (all required fields)
- [ ] ClaimWithDetails interface includes nested vehicle/user/reviewer
- [ ] No `any` types (use specific interfaces)
- [ ] Nullable fields marked with `| null` (not `?`)

---

## Error Handling

- [ ] All async operations wrapped in try/catch
- [ ] User-friendly error messages (NOT stack traces)
- [ ] `getClaimErrorMessage()` used for vehicle claiming errors
- [ ] Specific error cases handled:
  - [ ] Vehicle not found
  - [ ] Already claimed
  - [ ] Verification failed (VIN mismatch)
  - [ ] Upload failures (too large, wrong type)
  - [ ] Network errors

---

## Notifications

- [ ] Claim approval triggers `notifyModerationResult(..., 'approved')`
- [ ] Claim rejection triggers `notifyModerationResult(..., 'rejected', reason)`
- [ ] New reviews trigger `notifyNewReview(vehicleId, reviewId)` (only if claimed)
- [ ] Badge awards trigger `notifyBadgeReceived(vehicleId, badgeId)`
- [ ] Notification data includes proper routing (URL to relevant page)

---

## Testing

- [ ] Unit tests for new functions
- [ ] Integration tests for workflows (claim → verify → approve)
- [ ] RLS policy tests if security changed:
  - [ ] Pre-claim review deletion allowed
  - [ ] Post-claim review deletion denied
  - [ ] Only owners can update vehicles
- [ ] Edge cases covered:
  - [ ] VIN format validation (17 chars, no I/O/Q)
  - [ ] File type/size validation
  - [ ] Empty fields handling
  - [ ] Concurrent operations (if applicable)
- [ ] Tests pass locally: `npm test`
- [ ] Tests pass in CI (if available)
- [ ] Coverage report generated (optional but recommended)

---

## Admin/Moderation

- [ ] Admin approval updates vehicle tier to 'verified'
- [ ] Admin approval sets `owner_proof_url`
- [ ] Admin rejection preserves vehicle ownership
- [ ] Admin actions logged to `admin_audit_log`:
  - [ ] `admin_id` recorded
  - [ ] `action_type` set (`CLAIM_APPROVED`, `CLAIM_REJECTED`, etc.)
  - [ ] `target_user_id` recorded
  - [ ] `description` included
- [ ] Admins cannot accidentally delete pending claims
- [ ] Reject reason required (for user feedback)

---

## Security

### Critical: Never Relax These

- [ ] License plates NEVER stored plaintext ✅
- [ ] God Mode RLS enforcement unchanged (pre-claim only) ✅
- [ ] Admin audit trail NOT skipped ✅
- [ ] Verification tier NOT downgraded without admin action ✅
- [ ] Documents NOT deleted after approval (kept for evidence) ✅

### Rate Limiting

- [ ] Verification attempts rate-limited (if applicable)
- [ ] Claim submissions rate-limited (if applicable)

### Data Privacy

- [ ] PII not logged (no full names in audit logs, emails in URLs)
- [ ] Documents stored in private buckets
- [ ] User consent obtained for AI processing

---

## Documentation

- [ ] Code comments explain non-obvious logic
- [ ] [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md) updated if logic changed:
  - [ ] Database schema section updated
  - [ ] Data flow section updated
  - [ ] Edge cases section updated (if applicable)
- [ ] Related components/functions referenced in doc
- [ ] Type definitions documented (JSDoc comments)

---

## Performance

- [ ] Database queries use indexes:
  - [ ] `owner_id` indexed for vehicle lookups
  - [ ] `plate_hash` indexed for vehicle search
  - [ ] `status` indexed for admin queries
  - [ ] `created_at` indexed for sorting
- [ ] N+1 query problems avoided (use joins/relations)
- [ ] No unnecessary full table scans
- [ ] API response times reasonable (< 2 sec for UI operations)

---

## Approval Criteria

✅ **PR is ready to merge if:**

- [ ] All sections above reviewed and checked
- [ ] Database schema sound (if modified)
- [ ] RLS policies verified (if modified)
- [ ] Tests passing and edge cases covered
- [ ] Documentation updated
- [ ] No security regressions
- [ ] Performance acceptable
- [ ] All critical constraints preserved

⚠️ **Request Changes if:**

- [ ] License plate hashing bypassed
- [ ] God Mode logic weakened or removed
- [ ] Admin audit trail skipped
- [ ] Critical edge cases not handled
- [ ] Tests missing
- [ ] Documentation not updated

❌ **Block if:**

- [ ] Plaintext license plates stored in DB
- [ ] RLS policies removed or disabled
- [ ] Verification tier downgraded without admin action
- [ ] Security regression detected

---

## Examples of Changes That Require This Checklist

✅ Uses this checklist:
- Adding new verification method
- Modifying claim workflow
- Changing RLS policies
- Adding/removing badge types
- Modifying admin approval process
- Changing how ownership is tracked

❌ Does NOT require this checklist:
- Fixing typos in non-workflow code
- Updating dependencies
- Refactoring unrelated utilities
- Adding new UI colors/fonts

---

## After Approval

- [ ] Squash/rebase commits if necessary
- [ ] Merge to main
- [ ] Close related tickets
- [ ] Verify deployment (if automated)
- [ ] Post-deploy monitoring (for first few hours)

---

**Last Updated:** 2026-01-28
**Maintained By:** Engineering Team
**Reference:** `docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`
