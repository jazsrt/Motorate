/*
  # Fix approve_claim Function

  This migration updates the approve_claim function to properly:
  1. Assign vehicle ownership (owner_id)
  2. Set is_verified flag to true
  3. Update vehicle timestamps

  This ensures that when an admin approves a claim:
  - The vehicle appears in the user's garage
  - The vehicle shows as verified
  - All other pending claims for the vehicle are rejected
*/

-- Drop and recreate the approve_claim function with proper vehicle assignment
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

  -- Assign vehicle to user, mark as verified AND claimed
  UPDATE vehicles
  SET owner_id = v_user_id,
      is_verified = true,
      is_claimed = true,
      claimed_at = now(),
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

  -- Create notification for the user
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link_type,
    link_id,
    is_read
  ) VALUES (
    v_user_id,
    'admin_action',
    'Vehicle Claim Approved!',
    'Your vehicle claim has been approved. The vehicle is now in your garage.',
    'vehicle',
    v_vehicle_id,
    false
  );

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
