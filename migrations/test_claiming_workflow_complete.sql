/*
  # Complete Vehicle Claiming Workflow Test Data

  This migration creates comprehensive test data for the entire vehicle claiming workflow.

  ## Test Scenarios Created:

  1. **Pending Verification Claim**
     - Vehicle: 2024 Toyota Camry (plate: TEST001)
     - Claimer: test.claimer@example.com
     - Status: pending
     - Purpose: Test verification submission and approval flow

  2. **Approved Claim**
     - Vehicle: 2023 Honda Civic (plate: TEST002)
     - Claimer: approved.user@example.com
     - Status: approved
     - Purpose: Test successful claim completion

  3. **Rejected Claim**
     - Vehicle: 2022 Ford F-150 (plate: TEST003)
     - Claimer: rejected.user@example.com
     - Status: rejected
     - Purpose: Test rejection flow and re-claim ability

  4. **Disputed Claim**
     - Vehicle: 2021 Tesla Model 3 (plate: TEST004)
     - Original Owner: original.owner@example.com (shadow profile)
     - Claimer: disputer.user@example.com
     - Status: disputed
     - Purpose: Test dispute resolution workflow

  5. **Unclaimed Vehicle with Shadow Profile**
     - Vehicle: 2020 Chevrolet Silverado (plate: TEST005)
     - Shadow Profile: shadow.owner@example.com
     - Purpose: Test claiming vehicle with existing shadow profile

  6. **Clean Unclaimed Vehicle**
     - Vehicle: 2019 BMW 3 Series (plate: TEST006)
     - Purpose: Test fresh claim on vehicle with no history

  ## Security
  - All test data respects RLS policies
  - Plate numbers are properly hashed
  - Shadow profiles are marked appropriately
*/

-- Step 1: Create test users (profiles)
DO $$
DECLARE
  v_claimer_id uuid := gen_random_uuid();
  v_approved_id uuid := gen_random_uuid();
  v_rejected_id uuid := gen_random_uuid();
  v_disputer_id uuid := gen_random_uuid();
  v_original_owner_id uuid := gen_random_uuid();
  v_shadow_owner_id uuid := gen_random_uuid();

  v_vehicle1_id uuid := gen_random_uuid();
  v_vehicle2_id uuid := gen_random_uuid();
  v_vehicle3_id uuid := gen_random_uuid();
  v_vehicle4_id uuid := gen_random_uuid();
  v_vehicle5_id uuid := gen_random_uuid();
  v_vehicle6_id uuid := gen_random_uuid();
BEGIN
  -- Insert test profiles
  INSERT INTO profiles (id, username, full_name, is_shadow_profile, created_at)
  VALUES
    (v_claimer_id, 'test_claimer', 'Test Claimer', false, now()),
    (v_approved_id, 'approved_user', 'Approved User', false, now()),
    (v_rejected_id, 'rejected_user', 'Rejected User', false, now()),
    (v_disputer_id, 'disputer_user', 'Disputer User', false, now()),
    (v_original_owner_id, 'original_owner', 'Original Owner', true, now()),
    (v_shadow_owner_id, 'shadow_owner', 'Shadow Owner', true, now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert test vehicles
  INSERT INTO vehicles (id, make, model, year, license_plate_hash, is_claimed, owner_id, claimed_at, created_at)
  VALUES
    -- Vehicle 1: Pending claim
    (v_vehicle1_id, 'Toyota', 'Camry', 2024, encode(sha256('TEST001'::bytea), 'hex'), false, NULL, NULL, now()),

    -- Vehicle 2: Approved and claimed
    (v_vehicle2_id, 'Honda', 'Civic', 2023, encode(sha256('TEST002'::bytea), 'hex'), true, v_approved_id, now() - interval '2 days', now()),

    -- Vehicle 3: Rejected claim
    (v_vehicle3_id, 'Ford', 'F-150', 2022, encode(sha256('TEST003'::bytea), 'hex'), false, NULL, NULL, now()),

    -- Vehicle 4: Disputed claim
    (v_vehicle4_id, 'Tesla', 'Model 3', 2021, encode(sha256('TEST004'::bytea), 'hex'), true, v_original_owner_id, now() - interval '10 days', now()),

    -- Vehicle 5: Unclaimed with shadow profile
    (v_vehicle5_id, 'Chevrolet', 'Silverado', 2020, encode(sha256('TEST005'::bytea), 'hex'), true, v_shadow_owner_id, now() - interval '5 days', now()),

    -- Vehicle 6: Clean unclaimed
    (v_vehicle6_id, 'BMW', '3 Series', 2019, encode(sha256('TEST006'::bytea), 'hex'), false, NULL, NULL, now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert verification claims
  INSERT INTO verification_claims (
    id,
    vehicle_id,
    claimer_id,
    status,
    verification_method,
    submitted_at,
    reviewed_at,
    reviewer_id,
    reviewer_notes,
    created_at
  )
  VALUES
    -- Claim 1: Pending verification
    (
      gen_random_uuid(),
      v_vehicle1_id,
      v_claimer_id,
      'pending',
      'registration',
      now() - interval '1 hour',
      NULL,
      NULL,
      NULL,
      now()
    ),

    -- Claim 2: Approved
    (
      gen_random_uuid(),
      v_vehicle2_id,
      v_approved_id,
      'approved',
      'registration',
      now() - interval '3 days',
      now() - interval '2 days',
      v_claimer_id, -- Using claimer as mock reviewer
      'Verification documents approved. Registration matches vehicle details.',
      now()
    ),

    -- Claim 3: Rejected
    (
      gen_random_uuid(),
      v_vehicle3_id,
      v_rejected_id,
      'rejected',
      'registration',
      now() - interval '2 days',
      now() - interval '1 day',
      v_claimer_id, -- Using claimer as mock reviewer
      'Documents unclear. Please resubmit with better quality images.',
      now()
    ),

    -- Claim 4: Disputed
    (
      gen_random_uuid(),
      v_vehicle4_id,
      v_disputer_id,
      'disputed',
      'registration',
      now() - interval '1 day',
      NULL,
      NULL,
      'Existing owner has disputed this claim.',
      now()
    )
  ON CONFLICT (id) DO NOTHING;

  -- Add some sample ratings for approved vehicle
  INSERT INTO vehicle_ratings (
    vehicle_id,
    rater_id,
    rating,
    comment,
    created_at
  )
  VALUES
    (v_vehicle2_id, v_claimer_id, 5, 'Great car! Well maintained.', now() - interval '1 day'),
    (v_vehicle2_id, v_disputer_id, 4, 'Nice ride!', now() - interval '2 hours')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE 'Test User IDs:';
  RAISE NOTICE '  Claimer: %', v_claimer_id;
  RAISE NOTICE '  Approved User: %', v_approved_id;
  RAISE NOTICE '  Rejected User: %', v_rejected_id;
  RAISE NOTICE '  Disputer: %', v_disputer_id;
  RAISE NOTICE '  Original Owner (shadow): %', v_original_owner_id;
  RAISE NOTICE '  Shadow Owner: %', v_shadow_owner_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Test Vehicle IDs:';
  RAISE NOTICE '  TEST001 (Pending): %', v_vehicle1_id;
  RAISE NOTICE '  TEST002 (Approved): %', v_vehicle2_id;
  RAISE NOTICE '  TEST003 (Rejected): %', v_vehicle3_id;
  RAISE NOTICE '  TEST004 (Disputed): %', v_vehicle4_id;
  RAISE NOTICE '  TEST005 (Shadow Profile): %', v_vehicle5_id;
  RAISE NOTICE '  TEST006 (Clean): %', v_vehicle6_id;
END $$;

-- Create a view for easy test data inspection
CREATE OR REPLACE VIEW test_claiming_workflow_status AS
SELECT
  v.id as vehicle_id,
  v.make || ' ' || v.model || ' ' || v.year as vehicle,
  v.is_claimed,
  CASE
    WHEN v.license_plate_hash = encode(sha256('TEST001'::bytea), 'hex') THEN 'TEST001'
    WHEN v.license_plate_hash = encode(sha256('TEST002'::bytea), 'hex') THEN 'TEST002'
    WHEN v.license_plate_hash = encode(sha256('TEST003'::bytea), 'hex') THEN 'TEST003'
    WHEN v.license_plate_hash = encode(sha256('TEST004'::bytea), 'hex') THEN 'TEST004'
    WHEN v.license_plate_hash = encode(sha256('TEST005'::bytea), 'hex') THEN 'TEST005'
    WHEN v.license_plate_hash = encode(sha256('TEST006'::bytea), 'hex') THEN 'TEST006'
    ELSE 'UNKNOWN'
  END as plate_number,
  owner_profile.username as owner_username,
  owner_profile.is_shadow_profile as owner_is_shadow,
  vc.status as claim_status,
  claimer_profile.username as claimer_username,
  vc.verification_method,
  vc.submitted_at as claim_submitted,
  vc.reviewed_at as claim_reviewed,
  vc.reviewer_notes
FROM vehicles v
LEFT JOIN profiles owner_profile ON v.owner_id = owner_profile.id
LEFT JOIN verification_claims vc ON v.id = vc.vehicle_id
LEFT JOIN profiles claimer_profile ON vc.claimer_id = claimer_profile.id
WHERE v.license_plate_hash IN (
  encode(sha256('TEST001'::bytea), 'hex'),
  encode(sha256('TEST002'::bytea), 'hex'),
  encode(sha256('TEST003'::bytea), 'hex'),
  encode(sha256('TEST004'::bytea), 'hex'),
  encode(sha256('TEST005'::bytea), 'hex'),
  encode(sha256('TEST006'::bytea), 'hex')
)
ORDER BY plate_number;

-- Grant permissions on the view
GRANT SELECT ON test_claiming_workflow_status TO authenticated;
GRANT SELECT ON test_claiming_workflow_status TO anon;
