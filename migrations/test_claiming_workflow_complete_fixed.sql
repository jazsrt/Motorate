/*
  # Complete Vehicle Claiming Workflow Test Data (Schema-Corrected)

  This migration creates comprehensive test data for the entire vehicle claiming workflow.

  ## Test Scenarios Created:

  1. **Pending Verification Claim**
     - Vehicle: 2024 Toyota Camry (plate: TEST001)
     - Claimer: test_claimer
     - Status: pending
     - Purpose: Test verification submission and approval flow

  2. **Approved Claim**
     - Vehicle: 2023 Honda Civic (plate: TEST002)
     - Claimer: approved_user
     - Status: approved
     - Purpose: Test successful claim completion

  3. **Rejected Claim**
     - Vehicle: 2022 Ford F-150 (plate: TEST003)
     - Claimer: rejected_user
     - Status: rejected
     - Purpose: Test rejection flow and re-claim ability

  4. **Disputed Claim**
     - Vehicle: 2021 Tesla Model 3 (plate: TEST004)
     - Original Owner: original_owner
     - Claimer: disputer_user
     - Status: disputed
     - Purpose: Test dispute resolution workflow

  5. **Clean Unclaimed Vehicle**
     - Vehicle: 2019 BMW 3 Series (plate: TEST006)
     - Purpose: Test fresh claim on vehicle with no history

  ## Security
  - All test data respects RLS policies
  - Plate numbers are properly hashed
  - Uses actual profiles table schema (handle, avatar_url, reputation_score)
*/

-- Step 1: Create test users (profiles)
DO $$
DECLARE
  v_claimer_id uuid := gen_random_uuid();
  v_approved_id uuid := gen_random_uuid();
  v_rejected_id uuid := gen_random_uuid();
  v_disputer_id uuid := gen_random_uuid();
  v_original_owner_id uuid := gen_random_uuid();

  v_vehicle1_id uuid := gen_random_uuid();
  v_vehicle2_id uuid := gen_random_uuid();
  v_vehicle3_id uuid := gen_random_uuid();
  v_vehicle4_id uuid := gen_random_uuid();
  v_vehicle6_id uuid := gen_random_uuid();
BEGIN
  -- Insert test profiles using correct schema (handle instead of username)
  INSERT INTO profiles (id, handle, reputation_score, created_at)
  VALUES
    (v_claimer_id, 'test_claimer', 0, now()),
    (v_approved_id, 'approved_user', 100, now()),
    (v_rejected_id, 'rejected_user', 0, now()),
    (v_disputer_id, 'disputer_user', 50, now()),
    (v_original_owner_id, 'original_owner', 200, now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert test vehicles
  INSERT INTO vehicles (id, make, model, year, license_plate_hash, is_claimed, owner_id, claimed_at, created_at)
  VALUES
    -- Vehicle 1: Pending claim (unclaimed, has pending verification)
    (v_vehicle1_id, 'Toyota', 'Camry', 2024, encode(sha256('TEST001'::bytea), 'hex'), false, NULL, NULL, now()),

    -- Vehicle 2: Approved and claimed
    (v_vehicle2_id, 'Honda', 'Civic', 2023, encode(sha256('TEST002'::bytea), 'hex'), true, v_approved_id, now() - interval '2 days', now()),

    -- Vehicle 3: Rejected claim (back to unclaimed)
    (v_vehicle3_id, 'Ford', 'F-150', 2022, encode(sha256('TEST003'::bytea), 'hex'), false, NULL, NULL, now()),

    -- Vehicle 4: Disputed claim (claimed by original owner, has dispute)
    (v_vehicle4_id, 'Tesla', 'Model 3', 2021, encode(sha256('TEST004'::bytea), 'hex'), true, v_original_owner_id, now() - interval '10 days', now()),

    -- Vehicle 6: Clean unclaimed
    (v_vehicle6_id, 'BMW', '3 Series', 2019, encode(sha256('TEST006'::bytea), 'hex'), false, NULL, NULL, now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert verification claims
  INSERT INTO verification_claims (
    id,
    vehicle_id,
    claimant_id,
    status,
    verification_method,
    documents_submitted,
    admin_notes,
    submitted_at,
    reviewed_at,
    created_at,
    updated_at
  )
  VALUES
    -- Claim 1: Pending verification
    (
      gen_random_uuid(),
      v_vehicle1_id,
      v_claimer_id,
      'pending',
      'registration',
      jsonb_build_array(
        jsonb_build_object(
          'type', 'registration',
          'url', 'https://example.com/reg1.jpg',
          'uploaded_at', now()
        )
      ),
      NULL,
      now() - interval '1 hour',
      NULL,
      now(),
      now()
    ),

    -- Claim 2: Approved claim
    (
      gen_random_uuid(),
      v_vehicle2_id,
      v_approved_id,
      'approved',
      'registration',
      jsonb_build_array(
        jsonb_build_object(
          'type', 'registration',
          'url', 'https://example.com/reg2.jpg',
          'uploaded_at', now() - interval '3 days'
        )
      ),
      'Documents verified successfully',
      now() - interval '3 days',
      now() - interval '2 days',
      now(),
      now()
    ),

    -- Claim 3: Rejected claim
    (
      gen_random_uuid(),
      v_vehicle3_id,
      v_rejected_id,
      'rejected',
      'registration',
      jsonb_build_array(
        jsonb_build_object(
          'type', 'registration',
          'url', 'https://example.com/reg3.jpg',
          'uploaded_at', now() - interval '5 days'
        )
      ),
      'Documents not legible - please resubmit',
      now() - interval '5 days',
      now() - interval '4 days',
      now(),
      now()
    ),

    -- Claim 4: Disputed claim (someone is disputing the original owner)
    (
      gen_random_uuid(),
      v_vehicle4_id,
      v_disputer_id,
      'disputed',
      'registration',
      jsonb_build_array(
        jsonb_build_object(
          'type', 'registration',
          'url', 'https://example.com/reg4.jpg',
          'uploaded_at', now() - interval '2 days'
        )
      ),
      'Dispute raised - awaiting resolution',
      now() - interval '2 days',
      NULL,
      now(),
      now()
    )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE 'Test User IDs:';
  RAISE NOTICE '  - Claimer: %', v_claimer_id;
  RAISE NOTICE '  - Approved User: %', v_approved_id;
  RAISE NOTICE '  - Rejected User: %', v_rejected_id;
  RAISE NOTICE '  - Disputer: %', v_disputer_id;
  RAISE NOTICE '  - Original Owner: %', v_original_owner_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Test Vehicle IDs:';
  RAISE NOTICE '  - TEST001 (Pending): %', v_vehicle1_id;
  RAISE NOTICE '  - TEST002 (Approved): %', v_vehicle2_id;
  RAISE NOTICE '  - TEST003 (Rejected): %', v_vehicle3_id;
  RAISE NOTICE '  - TEST004 (Disputed): %', v_vehicle4_id;
  RAISE NOTICE '  - TEST006 (Unclaimed): %', v_vehicle6_id;
END $$;

-- Create verification view for testing
CREATE OR REPLACE VIEW test_claiming_workflow_status AS
SELECT
  v.id as vehicle_id,
  v.make || ' ' || v.model || ' ' || v.year as vehicle,
  v.is_claimed,
  p.handle as owner_handle,
  p.reputation_score as owner_reputation,
  vc.status as claim_status,
  vc.verification_method,
  vc.submitted_at,
  vc.reviewed_at,
  vc.admin_notes,
  pc.handle as claimant_handle
FROM vehicles v
LEFT JOIN profiles p ON v.owner_id = p.id
LEFT JOIN verification_claims vc ON v.id = vc.vehicle_id
LEFT JOIN profiles pc ON vc.claimant_id = pc.id
WHERE p.handle IN ('test_claimer', 'approved_user', 'rejected_user', 'disputer_user', 'original_owner')
   OR pc.handle IN ('test_claimer', 'approved_user', 'rejected_user', 'disputer_user', 'original_owner')
   OR v.license_plate_hash IN (
     encode(sha256('TEST001'::bytea), 'hex'),
     encode(sha256('TEST002'::bytea), 'hex'),
     encode(sha256('TEST003'::bytea), 'hex'),
     encode(sha256('TEST004'::bytea), 'hex'),
     encode(sha256('TEST006'::bytea), 'hex')
   )
ORDER BY v.year DESC;

-- Test query to verify data
SELECT * FROM test_claiming_workflow_status;
