# Carma Platform: Engineer Onboarding Guide

Welcome to the Carma team! This guide will help you understand the core vehicle claiming and verification workflow that powers the platform.

**Estimated Reading Time:** 2-3 hours (first week)

---

## Week 1: Core Knowledge

### Day 1: Required Reading

**Must complete before writing any code:**

1. **Architecture Overview** (15 min)
   - Read: [`docs/architecture/README.md`](./README.md)
   - Purpose: Understand the three verification tiers and key design decisions

2. **Shadow → Claimed Vehicle Workflow** (90 min)
   - Read: [`docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md)
   - Focus on these sections (in order):
     1. [Executive Summary](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#executive-summary)
     2. [Database Schema](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#database-schema--relationships)
     3. [RLS Policies](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#row-level-security-rls-policies)
     4. [Frontend Components](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#frontend-components--pages)
     5. [Data Flow Diagrams](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#data-flow-diagrams)

3. **Security Constraints** (15 min)
   - Read: [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#security-considerations`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#security-considerations)
   - Read: [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#critical-constraints-never-relax`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#critical-constraints-never-relax)
   - **CRITICAL:** License plate hashing, God Mode RLS, admin audit trail

### Day 2: Codebase Exploration

**Setup:**
```bash
git clone <repo>
cd project
npm install
npm run build      # Verify build works
npm test           # Verify tests pass
```

**Explore these directories:**

```
src/
├── lib/
│   ├── vehicles.ts              # Core claiming functions
│   ├── claims.ts                # Verification claims
│   ├── verification.ts          # AI verification logic
│   └── notifications.ts         # Push notifications
├── components/
│   ├── ClaimVehicleModal.tsx           # Soft claim UI
│   ├── VerifyOwnershipModal.tsx        # AI verification UI
│   ├── ClaimVehicleModalVerification.tsx # Manual docs UI
│   ├── PlateFoundUnclaimed.tsx         # Shadow vehicle card
│   └── PlateFoundClaimed.tsx           # Claimed vehicle card
└── pages/
    ├── ShadowProfilePage.tsx           # Unclaimed vehicle view
    ├── VehicleDetailPage.tsx           # Owner dashboard
    └── AdminDashboard.tsx              # Admin claim review
```

**Key Files to Understand:**

1. **`src/lib/vehicles.ts`** (Core claiming)
   - `claimVehicleStandard()` - Soft claim
   - `claimVehicleVerified()` - Verified tier
   - `uploadVerificationProof()` - Document storage

2. **`src/lib/claims.ts`** (Verification management)
   - `submitVehicleClaim()` - Document submission
   - `approveClaim()` / `rejectClaim()` - Admin actions
   - `getPendingClaims()` - Admin dashboard

3. **`src/lib/verification.ts`** (AI verification)
   - `verifyDocument()` - OpenAI Vision integration
   - `isValidVINFormat()` - VIN validation

### Day 3: Database & RLS

**Review migrations:**
```
supabase/migrations/
├── 20251123031023_create_carma_schema.sql    # Main schema
└── [others]
```

**Key tables:**
- `vehicles` - Core table (owner_id = NULL for shadow)
- `verification_claims` - Admin review queue
- `reviews` - Community ratings (God Mode deletion logic)
- `profiles` - User profiles
- `admin_audit_log` - Admin action tracking

**Understand RLS policies** (see [SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#row-level-security-rls-policies](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#row-level-security-rls-policies)):
1. Shadow vehicles: anyone can create, only read
2. Owned vehicles: only owner can update
3. Reviews: complex RLS for God Mode (pre-claim deletion only)
4. Verification claims: users + admins only

### Day 4: Hands-On: Trace a Workflow

**Exercise 1: Shadow Profile Discovery**
1. Start at `/src/pages/ShadowProfilePage.tsx`
2. Trace how it loads vehicle data
3. Follow the data fetching in `src/lib/vehicles.ts`
4. Understand the SQL queries (in Supabase schema)

**Exercise 2: Soft Claim**
1. Start at `/src/components/ClaimVehicleModal.tsx`
2. Understand what happens when user confirms claim
3. Follow the RPC call: `claim_vehicle_atomic()`
4. Check the database schema for what gets updated
5. Verify badge awarding in `claimVehicleStandard()`

**Exercise 3: Verification**
1. Start at `/src/components/VerifyOwnershipModal.tsx`
2. Trace the document upload to `/src/lib/verification.ts`
3. Follow the Edge Function call to `verify-document`
4. Understand VIN validation and confidence threshold
5. See how pending claims are created if AI uncertain

**Exercise 4: Admin Approval**
1. Start at `/src/pages/AdminDashboard.tsx`
2. Find the claim review section
3. Trace the `approveClaim()` function
4. Verify that vehicle tier gets updated to 'verified'
5. Check notification trigger: `notifyModerationResult()`

### Day 5: Review & Q&A

- [ ] Review all sections of [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md)
- [ ] Ask team questions on anything unclear
- [ ] Run tests to verify understanding: `npm test`
- [ ] Pair program with a senior engineer if available

---

## Week 2-4: Depth By Role

### Backend Engineers

**Priority:** Database schema, RLS, Edge Functions, RPCs

**Action Items:**
1. ✅ Complete Week 1 exercises
2. ✅ Read [`supabase/functions/verify-document/index.ts`](../../supabase/functions/verify-document/index.ts)
3. ✅ Understand OpenAI Vision API integration
4. ✅ Review all RPC function definitions in schema migrations
5. ✅ Set up local Supabase instance
6. ✅ Run migrations and verify schema
7. ✅ Test RLS policies manually
8. ✅ Trace admin approval workflow end-to-end

**Deeper Dives:**
- AI document verification (confidence thresholds, fallback to manual review)
- RLS policy edge cases (God Mode timestamp logic)
- Admin audit logging

**First Task Ideas:**
- Add rate limiting to verification attempts
- Implement badge monthly_limit enforcement
- Add fraud detection for suspicious patterns
- Improve error messages from Edge Functions

---

### Frontend Engineers

**Priority:** Components, pages, forms, routing, state management

**Action Items:**
1. ✅ Complete Week 1 exercises
2. ✅ Read all modal components (`Claim*.tsx`, `Verify*.tsx`)
3. ✅ Understand form validation (VIN format, file types/sizes)
4. ✅ Review TypeScript types in `src/lib/vehicles.ts` and `src/lib/claims.ts`
5. ✅ Trace routing for `/vehicle/{id}` and `/shadow/{plate}`
6. ✅ Understand error handling and user feedback patterns
7. ✅ Review accessibility (ARIA labels, semantic HTML)

**Deeper Dives:**
- Modal flow design patterns (loading → success → close)
- Error state handling and user messaging
- Deep linking and URL hash routing
- Notification timing and UI updates

**First Task Ideas:**
- Improve VIN input UX (add format hints)
- Add loading skeleton for verification
- Improve error messages for file uploads
- Add accessibility improvements to claim modals
- Add animations for tier upgrade success

---

### QA / Test Engineers

**Priority:** Test coverage, edge cases, workflows

**Action Items:**
1. ✅ Complete Week 1 exercises
2. ✅ Read [`src/__tests__/claiming_edge_cases.test.ts`](../../src/__tests__/claiming_edge_cases.test.ts)
3. ✅ Read [`src/__tests__/security_tiers.test.ts`](../../src/__tests__/security_tiers.test.ts)
4. ✅ Run tests locally: `npm test`
5. ✅ Understand test coverage report
6. ✅ Learn about RLS policy testing
7. ✅ Review data flow diagrams for test scenarios

**Deeper Dives:**
- Race condition testing (simultaneous claims)
- RLS policy enforcement testing
- AI verification fallback scenarios
- Admin approval workflow end-to-end

**First Task Ideas:**
- Implement missing edge case tests (see `claiming_edge_cases.test.ts` TODOs)
- Add integration tests for complete workflows
- Create manual test scenarios for QA
- Build test data fixtures
- Implement E2E tests for key user journeys

---

### Security/Compliance Engineers

**Priority:** Data privacy, security constraints, audit trail

**Action Items:**
1. ✅ Complete Week 1 exercises (especially security section)
2. ✅ Review [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#critical-constraints-never-relax`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md#critical-constraints-never-relax)
3. ✅ Audit license plate hashing implementation
4. ✅ Review RLS policy logic (especially God Mode)
5. ✅ Verify admin audit logging is comprehensive
6. ✅ Check data retention policies
7. ✅ Review document storage security

**Deeper Dives:**
- PII handling in logs and APIs
- Document verification consent flow
- Admin 2FA requirements
- Data breach response procedures

**First Task Ideas:**
- Implement document scanning for malware
- Add rate limiting per IP/user for verification attempts
- Implement admin action signing/verification
- Create compliance documentation
- Add data retention policies

---

## Testing Your Understanding

### Pre-Commit Checklist

Before committing code to the vehicle workflow:

- [ ] I understand the three verification tiers (shadow/standard/verified)
- [ ] I know when God Mode applies (pre-claim reviews only)
- [ ] I verified license plates are never stored plaintext
- [ ] I confirmed RLS policies are unchanged
- [ ] I checked admin audit logging is included
- [ ] I added tests for new logic
- [ ] I verified tests pass: `npm test`
- [ ] I reviewed code against [`docs/architecture/PR_REVIEW_CHECKLIST.md`](./PR_REVIEW_CHECKLIST.md)
- [ ] I updated [`docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md) if logic changed

### Questions to Ask (and Answer)

1. **Why is `owner_id = NULL` used for shadow vehicles?**
   - Answer: Simple queryability + enables RLS-based access control

2. **What's the difference between soft claim and verified claim?**
   - Answer: Soft (standard) is fast path, verified requires proof document

3. **When can an owner delete a review?**
   - Answer: Only if created BEFORE they claimed (pre-claim, enforced by RLS)

4. **What happens if AI verification fails?**
   - Answer: Creates pending claim for manual admin review

5. **How is license plate privacy protected?**
   - Answer: SHA-256 hash only, never plaintext in DB

6. **What do admins see in the review queue?**
   - Answer: Pending verification claims with all document URLs

7. **What badge is awarded on first claim?**
   - Answer: "My First Ride" badge

8. **What triggers a push notification?**
   - Answer: Claim approval, rejection, new review on owned vehicle, badge received

---

## Resources

### Documentation
- [`docs/architecture/README.md`](./README.md) - Architecture overview & decisions
- [`docs/architecture/SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md) - Complete workflow reference
- [`docs/architecture/PR_REVIEW_CHECKLIST.md`](./PR_REVIEW_CHECKLIST.md) - Code review guidelines

### Code References
- `src/lib/vehicles.ts` - Core claiming functions
- `src/lib/claims.ts` - Verification claims management
- `src/lib/verification.ts` - AI verification logic
- `src/__tests__/security_tiers.test.ts` - RLS policy tests
- `src/__tests__/claiming_edge_cases.test.ts` - Edge case tests (TODO items)

### External Resources
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [VIN Format Specification](https://en.wikipedia.org/wiki/Vehicle_identification_number)

---

## Ongoing Learning

### Monthly Refresher
- Review any PRs merged to vehicle/claim workflow
- Check [`SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md`](./SHADOW_TO_CLAIMED_VEHICLE_WORKFLOW.md) for updates
- Discuss edge cases or issues encountered

### Team Standup Questions
- "Any changes to vehicle claiming this week?"
- "Any security concerns with verification?"
- "Any edge cases discovered in production?"

### Code Review Participation
- Use [`PR_REVIEW_CHECKLIST.md`](./PR_REVIEW_CHECKLIST.md) when reviewing PRs
- Ensure documentation is updated
- Challenge assumptions about security/privacy

---

## Getting Help

### Questions to Ask
- "Where does license plate hashing happen?"
- "How does God Mode enforcement work?"
- "What happens if AI verification fails?"
- "How do we log admin actions?"

### Slack Channels
- `#engineering` - General questions
- `#security` - Security/privacy questions
- `#vehicles` - Vehicle workflow specific

### Pairing / Mentorship
- Ask senior engineers for:
  - Code review walkthrough
  - Architecture deep dive
  - Edge case discussion
  - Security review

---

## Success Criteria

### By End of Week 1
- [ ] Completed all required reading
- [ ] Traced all four exercises
- [ ] Understand the three verification tiers
- [ ] Know when God Mode applies
- [ ] Can explain RLS policy enforcement

### By End of Week 4
- [ ] Completed role-specific deep dives
- [ ] Submitted first PR (with checklist verification)
- [ ] Reviewed peer PR using checklist
- [ ] Can explain complete workflow to peer
- [ ] Comfortable modifying related code

### Ongoing
- [ ] Maintain knowledge of workflow changes
- [ ] Use PR checklist consistently
- [ ] Update documentation when needed
- [ ] Mentor new team members

---

## Living Document

This guide will evolve as the platform grows. Check for updates:
- When new engineers join
- After major workflow changes
- Quarterly refreshes

**Last Updated:** 2026-01-28
**Maintained By:** Engineering Team
**Questions?** Ask in #engineering or message a senior engineer

Welcome to the team! 🚗
