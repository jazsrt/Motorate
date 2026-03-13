# Carma: Getting Started & Documentation Index

Welcome to the Carma documentation hub! This file guides you to the right documentation based on your role and needs.

---

## Quick Navigation

### I'm a New Team Member
👉 **Start here:** [`docs/architecture/ONBOARDING.md`](./architecture/ONBOARDING.md) (2-3 hours)

This comprehensive onboarding guide walks you through:
- Week 1 core knowledge requirements
- Hands-on exercises to trace workflows
- Role-specific deep dives
- Success criteria

### I'm Reviewing a PR on Vehicle/Profile/Verification Logic
👉 **Use this:** [`docs/architecture/PR_REVIEW_CHECKLIST.md`](./architecture/PR_REVIEW_CHECKLIST.md)

Quick checklist for code reviews covering:
- Database schema changes
- RLS policy updates
- Backend logic
- Frontend components
- Security constraints
- Testing requirements

### I'm Building a Feature That Touches Vehicle Claiming
👉 **Reference this:** [`docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`](./architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md)

Comprehensive end-to-end documentation including:
- All database tables & relationships
- Complete RLS policies
- Backend API endpoints & Edge Functions
- Frontend components & pages
- TypeScript types & interfaces
- Data flow diagrams
- Known edge cases & limitations
- Security considerations

### I Need Architecture Context
👉 **Read this:** [`docs/architecture/README.md`](./architecture/README.md)

Overview of architectural decisions, file organization, and testing coverage.

---

## Documentation Hierarchy

```
docs/
├── GETTING_STARTED.md                          ← You are here
├── architecture/
│   ├── README.md                               ← Architecture overview
│   ├── ONBOARDING.md                           ← New engineer onboarding (REQUIRED for new hires)
│   ├── SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md   ← Complete reference (REQUIRED reading)
│   └── PR_REVIEW_CHECKLIST.md                  ← Code review guide
│
└── [Additional docs as platform grows]
```

---

## Core Concepts (Quick Reference)

### The Three Verification Tiers

```
SHADOW (owner_id = NULL)
├─ Unknown origin
├─ Community can review
└─ No special privileges

STANDARD (owner_id set, no proof)
├─ Soft claim (user confirms ownership)
├─ Can hide/delete pre-claim reviews (God Mode)
└─ No "Verified" badge

VERIFIED (owner_id + proof_url)
├─ Ownership proven (AI or admin verified)
├─ Gets "Verified Owner" badge
└─ Full moderation capabilities
```

### God Mode Explained

**Pre-claim reviews** (created BEFORE owner claimed): Owner CAN delete
**Post-claim reviews** (created AFTER owner claimed): Owner can ONLY hide

Enforced by RLS policy: `vehicle.claimed_at > review.created_at`

### License Plate Privacy

All license plates stored as **SHA-256 hash only** (never plaintext).

Example:
```
State: CA, Plate: ABC123
→ SHA-256 hash → Stored in DB
Lookup: Hash first, then query by plate_hash
```

---

## File Organization

### For Different Roles

**Backend Engineers:**
1. Read: `docs/architecture/ONBOARDING.md` → Backend section
2. Reference: `docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md` → Database & APIs sections
3. Review PRs: Use `docs/architecture/PR_REVIEW_CHECKLIST.md` → Backend changes section

**Frontend Engineers:**
1. Read: `docs/architecture/ONBOARDING.md` → Frontend section
2. Reference: `docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md` → Components & Pages sections
3. Review PRs: Use `docs/architecture/PR_REVIEW_CHECKLIST.md` → Frontend changes section

**QA / Test Engineers:**
1. Read: `docs/architecture/ONBOARDING.md` → QA section
2. Reference: `docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md` → Edge Cases section
3. Create tests: Use `src/__tests__/claiming_edge_cases.test.ts` as template

**Security/Compliance:**
1. Read: `docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md` → Security section
2. Review constraints: `docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md` → Critical Constraints
3. Audit: Use `docs/architecture/PR_REVIEW_CHECKLIST.md` → Security section

---

## Key Files in Codebase

### Pages
- `src/pages/ShadowProfilePage.tsx` - Unclaimed vehicle view
- `src/pages/VehicleDetailPage.tsx` - Owner dashboard
- `src/pages/AdminDashboard.tsx` - Admin claim review

### Components (Claiming)
- `src/components/ClaimVehicleModal.tsx` - Soft claim
- `src/components/VerifyOwnershipModal.tsx` - AI verification
- `src/components/ClaimVehicleModalVerification.tsx` - Manual documents
- `src/components/PlateFoundUnclaimed.tsx` - Shadow vehicle card
- `src/components/PlateFoundClaimed.tsx` - Claimed vehicle card

### Libraries
- `src/lib/vehicles.ts` - Core claiming functions
- `src/lib/claims.ts` - Verification claims management
- `src/lib/verification.ts` - AI verification logic
- `src/lib/notifications.ts` - Push notifications
- `src/lib/adminAudit.ts` - Admin action logging

### Tests
- `src/__tests__/security_tiers.test.ts` - RLS policy tests
- `src/__tests__/claiming_edge_cases.test.ts` - Edge case tests

### Database
- `supabase/migrations/20251123031023_create_carma_schema.sql` - Main schema

### Backend
- `supabase/functions/verify-document/` - AI verification
- `supabase/functions/hash-plate/` - License plate hashing

---

## Common Tasks

### I want to add a new feature to vehicle claiming
1. Read: `docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md` (relevant section)
2. Check: `docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#known-issues--edge-cases`
3. Design: Sketch on whiteboard or Figma
4. Code: Follow existing patterns in related files
5. Test: Add tests following `src/__tests__/claiming_edge_cases.test.ts` patterns
6. Review: Use `docs/architecture/PR_REVIEW_CHECKLIST.md`
7. Document: Update `docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md` if logic changes

### I need to understand why a decision was made
1. Check: `docs/architecture/README.md` → Key Architectural Decisions
2. Search: Full doc `SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md` for context
3. Ask: Team Slack or ask a senior engineer

### I want to modify RLS policies
⚠️ **CRITICAL** - Only do this if absolutely necessary:

1. Read: `docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#row-level-security-rls-policies`
2. Understand: All existing policies and why they exist
3. Review: `docs/architecture/PR_REVIEW_CHECKLIST.md#rls-policy-changes`
4. Test: Update `src/__tests__/security_tiers.test.ts`
5. Security review: Get approval from security engineer
6. Update docs: `docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`

### I'm debugging an issue with claims
1. Reference: `docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#data-flow-diagrams`
2. Trace: Code path through relevant files
3. Check: Edge cases in `docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#known-issues--edge-cases`
4. Test: Run `npm test` to verify
5. Log: Check `admin_audit_log` if admin action involved

---

## Critical Constraints (Never Relax)

These are enforced by the platform. Do NOT bypass:

### 1. License Plate Privacy
- ✅ ALWAYS: Hash plates with SHA-256
- ❌ NEVER: Store plaintext in database
- ❌ NEVER: Log plaintext plates
- ❌ NEVER: Expose in API responses

### 2. God Mode RLS Enforcement
- ✅ ALWAYS: Enforce pre-claim review deletion only
- ❌ NEVER: Allow owners to delete post-claim reviews
- ❌ NEVER: Remove the `claimed_at > created_at` check

### 3. Admin Audit Trail
- ✅ ALWAYS: Log all admin actions to `admin_audit_log`
- ❌ NEVER: Skip logging for any approval/rejection
- ❌ NEVER: Delete audit logs

### 4. Verification Tier Integrity
- ✅ ALWAYS: Upgrade through proper tier transitions
- ❌ NEVER: Downgrade tier without admin action
- ❌ NEVER: Set tier to invalid value

---

## Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npm test security_tiers      # RLS policy tests
npm test claiming_edge_cases # Edge case tests
```

### Check Coverage
```bash
npm test -- --coverage
```

### What Should Be Tested
- Unit tests for core functions (vehicles.ts, claims.ts, verification.ts)
- Integration tests for workflows (claim → verify → approve)
- RLS policy tests (God Mode, ownership, admin access)
- Edge cases (race conditions, VIN validation, file uploads)

---

## PR Workflow

### Before Submitting
- [ ] Reviewed [`docs/architecture/PR_REVIEW_CHECKLIST.md`](./architecture/PR_REVIEW_CHECKLIST.md)
- [ ] Updated [`docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`](./architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md) if logic changed
- [ ] Tests pass: `npm test`
- [ ] Build passes: `npm run build`

### During Review
- Reviewers use [`docs/architecture/PR_REVIEW_CHECKLIST.md`](./architecture/PR_REVIEW_CHECKLIST.md)
- Security review required for: RLS changes, license plate handling, admin actions
- All critical constraints verified

### After Approval
- Merge to main
- Verify deployment
- Monitor for issues

---

## Resources

### Internal
- Codebase: `/tmp/cc-agent/63102870/project/`
- Supabase Dashboard: [Your Project Link]
- Admin Dashboard: [Your App URL]/admin

### External
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [VIN Format](https://en.wikipedia.org/wiki/Vehicle_identification_number)

---

## Getting Help

### Questions About
- **Workflow:** Ask in `#engineering` or see `SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`
- **Security:** Ask security engineer or see PR_REVIEW_CHECKLIST.md security section
- **Specific code:** Ask code author or pair program
- **General setup:** Ask in `#engineering` or ask onboarding buddy

### Slack Channels
- `#engineering` - General questions
- `#security` - Security/privacy concerns
- `#vehicles` - Vehicle workflow specific

---

## Updating Documentation

**This documentation is "living"** - update it when:
- Adding new features
- Fixing edge cases
- Implementing TODOs
- Finding issues or gaps
- Clarifying confusing sections

**How to update:**
1. Identify relevant section in `docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`
2. Add/update content
3. Include PR reference if fixing a known issue
4. Update "Last Updated" date
5. Include in PR as part of "definition of done"

---

## Summary

| Role | Start Here | Reference | Review With |
|------|-----------|-----------|------------|
| **New Engineer** | `ONBOARDING.md` | `SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md` | PR_REVIEW_CHECKLIST |
| **Backend Dev** | `ONBOARDING.md` → Backend | Database + APIs sections | PR_REVIEW_CHECKLIST → Backend |
| **Frontend Dev** | `ONBOARDING.md` → Frontend | Components + Pages sections | PR_REVIEW_CHECKLIST → Frontend |
| **QA Engineer** | `ONBOARDING.md` → QA | Edge Cases section | PR_REVIEW_CHECKLIST → Testing |
| **Security** | `SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md` → Security | Security Considerations | PR_REVIEW_CHECKLIST → Security |

---

**Last Updated:** 2026-01-28
**Status:** Living Document
**Maintained By:** Engineering Team

Questions? Ask in Slack or see `ONBOARDING.md` → Getting Help
