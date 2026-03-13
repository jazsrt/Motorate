/*
  # Fix Verification Claims System

  This script fixes the verification_claims system by:
  1. Dropping existing objects if they exist
  2. Recreating with proper return types that match the TypeScript code
*/

-- Drop existing objects
DROP TRIGGER IF EXISTS update_verification_claims_updated_at ON verification_claims;
DROP FUNCTION IF EXISTS update_verification_claims_updated_at();
DROP FUNCTION IF EXISTS reject_claim(uuid, uuid, text);
DROP FUNCTION IF EXISTS approve_claim(uuid, uuid, text);
DROP FUNCTION IF EXISTS can_claim_vehicle(uuid, uuid);

-- Recreate helper function: Check if vehicle can be claimed (with JSON return)
CREATE OR REPLACE FUNCTION can_claim_vehicle(p_vehicle_id uuid, p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_is_claimed boolean;
  v_has_pending boolean;
BEGIN
  -- Check if vehicle is already claimed
  SELECT EXISTS (
    SELECT 1 FROM vehicles WHERE id = p_vehicle_id AND owner_id IS NOT NULL
  ) INTO v_is_claimed;

  IF v_is_claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vehicle is already claimed');
  END IF;

  -- Check if there's already a pending claim
  SELECT EXISTS (
    SELECT 1 FROM verification_claims
    WHERE vehicle_id = p_vehicle_id AND status = 'pending'
  ) INTO v_has_pending;

  IF v_has_pending THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vehicle already has a pending claim');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate approve_claim function with JSON return
CREATE OR REPLACE FUNCTION approve_claim(
  p_claim_id uuid,
  p_admin_id uuid,
  p_admin_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_vehicle_id uuid;
  v_user_id uuid;
BEGIN
  -- Verify admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_admin_id AND role IN ('admin', 'moderator')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get claim details
  SELECT vehicle_id, user_id INTO v_vehicle_id, v_user_id
  FROM verification_claims
  WHERE id = p_claim_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim not found or already processed');
  END IF;

  -- Update claim status
  UPDATE verification_claims
  SET status = 'approved',
      admin_notes = p_admin_notes,
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_claim_id;

  -- Assign vehicle to user
  UPDATE vehicles
  SET owner_id = v_user_id,
      updated_at = now()
  WHERE id = v_vehicle_id;

  -- Reject all other pending claims for this vehicle
  UPDATE verification_claims
  SET status = 'rejected',
      admin_notes = 'Another claim was approved',
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE vehicle_id = v_vehicle_id
  AND id != p_claim_id
  AND status = 'pending';

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate reject_claim function with JSON return
CREATE OR REPLACE FUNCTION reject_claim(
  p_claim_id uuid,
  p_admin_id uuid,
  p_admin_notes text
)
RETURNS jsonb AS $$
BEGIN
  -- Verify admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_admin_id AND role IN ('admin', 'moderator')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Update claim
  UPDATE verification_claims
  SET status = 'rejected',
      admin_notes = p_admin_notes,
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_claim_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim not found or already processed');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger for updated_at
CREATE OR REPLACE FUNCTION update_verification_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_verification_claims_updated_at
  BEFORE UPDATE ON verification_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_claims_updated_at();
