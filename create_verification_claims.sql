/*
  # Create Verification Claims System

  1. New Tables
    - `verification_claims`
      - Handles vehicle ownership verification requests
      - Supports document upload and admin review
      - Prevents duplicate pending claims per vehicle

  2. Security
    - Enable RLS
    - Users can view their own claims
    - Admins can view and manage all claims
    - Users can create claims for unclaimed vehicles

  3. Functions
    - `can_claim_vehicle`: Check if vehicle can be claimed
    - `approve_claim`: Admin approval workflow
    - `reject_claim`: Admin rejection workflow
*/

-- Create verification_claims table
CREATE TABLE IF NOT EXISTS public.verification_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  document_urls text[] DEFAULT '{}',
  notes text,
  admin_notes text,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_verification_claims_vehicle_id ON verification_claims(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_verification_claims_user_id ON verification_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_claims_status ON verification_claims(status);

-- Create unique partial index for one pending claim per vehicle
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_claim_per_vehicle
  ON verification_claims(vehicle_id)
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE verification_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own claims"
  ON verification_claims FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all claims"
  ON verification_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Users can create claims"
  ON verification_claims FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = vehicle_id
      AND vehicles.owner_id IS NOT NULL
    )
  );

CREATE POLICY "Admins can update claims"
  ON verification_claims FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Helper function: Check if vehicle can be claimed
CREATE OR REPLACE FUNCTION can_claim_vehicle(p_vehicle_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM vehicles WHERE id = p_vehicle_id AND owner_id IS NOT NULL
  ) AND NOT EXISTS (
    SELECT 1 FROM verification_claims
    WHERE vehicle_id = p_vehicle_id
    AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Approve claim
CREATE OR REPLACE FUNCTION approve_claim(
  p_claim_id uuid,
  p_admin_id uuid,
  p_admin_notes text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_vehicle_id uuid;
  v_user_id uuid;
BEGIN
  -- Get claim details
  SELECT vehicle_id, user_id INTO v_vehicle_id, v_user_id
  FROM verification_claims
  WHERE id = p_claim_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found or already processed';
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Reject claim
CREATE OR REPLACE FUNCTION reject_claim(
  p_claim_id uuid,
  p_admin_id uuid,
  p_admin_notes text
)
RETURNS void AS $$
BEGIN
  UPDATE verification_claims
  SET status = 'rejected',
      admin_notes = p_admin_notes,
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_claim_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found or already processed';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updated_at
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
