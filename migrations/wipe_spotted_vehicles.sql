/*
  # Wipe All Spotted Vehicles

  This script removes all vehicles that have been spotted in the database.

  WARNING: This will delete:
  - All vehicles from the vehicles table
  - All associated data (modifications, reviews, posts, etc.) via CASCADE
  - All verification claims related to vehicles

  This is useful for:
  - Testing and development
  - Cleaning up test data
  - Starting fresh with vehicle data

  IMPORTANT: This does NOT delete:
  - User profiles
  - Badges
  - User badge awards
  - Followers/follows
  - Comments (unless they're on deleted posts)
*/

-- First, show what will be deleted (for confirmation)
DO $$
DECLARE
  v_vehicle_count int;
  v_post_count int;
  v_review_count int;
  v_mod_count int;
  v_claim_count int;
BEGIN
  SELECT COUNT(*) INTO v_vehicle_count FROM vehicles;
  SELECT COUNT(*) INTO v_post_count FROM posts WHERE vehicle_id IS NOT NULL;
  SELECT COUNT(*) INTO v_review_count FROM reviews;
  SELECT COUNT(*) INTO v_mod_count FROM modifications;
  SELECT COUNT(*) INTO v_claim_count FROM verification_claims;

  RAISE NOTICE 'About to delete:';
  RAISE NOTICE '- % vehicles', v_vehicle_count;
  RAISE NOTICE '- % vehicle-related posts', v_post_count;
  RAISE NOTICE '- % reviews', v_review_count;
  RAISE NOTICE '- % modifications', v_mod_count;
  RAISE NOTICE '- % verification claims', v_claim_count;
END $$;

-- Delete all verification claims (no CASCADE needed, just clean them up)
DELETE FROM verification_claims;

-- Delete all modifications (CASCADE will handle this, but being explicit)
DELETE FROM modifications;

-- Delete all reviews (CASCADE will handle this, but being explicit)
DELETE FROM reviews;

-- Delete all vehicle-related posts (CASCADE from vehicles will handle this)
-- But we'll delete them explicitly to be clear about what's happening
DELETE FROM posts WHERE vehicle_id IS NOT NULL;

-- Delete all vehicles (CASCADE will clean up any remaining foreign key references)
DELETE FROM vehicles;

-- Reset any vehicle-related statistics if they exist
UPDATE profiles SET reputation_score = 0 WHERE reputation_score IS NOT NULL;

-- Show final counts
DO $$
DECLARE
  v_vehicle_count int;
  v_post_count int;
  v_review_count int;
  v_mod_count int;
  v_claim_count int;
BEGIN
  SELECT COUNT(*) INTO v_vehicle_count FROM vehicles;
  SELECT COUNT(*) INTO v_post_count FROM posts WHERE vehicle_id IS NOT NULL;
  SELECT COUNT(*) INTO v_review_count FROM reviews;
  SELECT COUNT(*) INTO v_mod_count FROM modifications;
  SELECT COUNT(*) INTO v_claim_count FROM verification_claims;

  RAISE NOTICE 'After deletion:';
  RAISE NOTICE '- % vehicles remaining', v_vehicle_count;
  RAISE NOTICE '- % vehicle-related posts remaining', v_post_count;
  RAISE NOTICE '- % reviews remaining', v_review_count;
  RAISE NOTICE '- % modifications remaining', v_mod_count;
  RAISE NOTICE '- % verification claims remaining', v_claim_count;
  RAISE NOTICE 'Database successfully wiped of all spotted vehicles!';
END $$;
