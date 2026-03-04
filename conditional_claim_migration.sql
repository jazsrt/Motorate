/*
  # Conditional Claim Verification Tiers

  1. Updates
    - Add verification_status field to verification_claims table
    - Update verification_tier logic to handle conditional claims
    - Add triggers to auto-set verification status based on documents submitted

  2. Verification Tiers
    - shadow: No claim submitted (default)
    - conditional: Claim with photo/selfie only (limited access, no mods)
    - standard: Claim with insurance card
    - verified: Claim with registration (full access including mods)

  3. Logic
    - Registration document = verified tier (full access)
    - Insurance card only = standard tier (full access)
    - Photo or selfie only = conditional tier (limited access, NO MODS TAB)
*/

-- Add verification_status to claims table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_claims' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE verification_claims
    ADD COLUMN verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'conditional'));
  END IF;
END $$;

-- Add document_types column to track what was submitted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_claims' AND column_name = 'document_types'
  ) THEN
    ALTER TABLE verification_claims
    ADD COLUMN document_types text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;

-- Update function to auto-assign verification tier based on documents
CREATE OR REPLACE FUNCTION auto_assign_verification_tier()
RETURNS TRIGGER AS $$
DECLARE
  has_registration boolean;
  has_insurance boolean;
  has_photo boolean;
  has_selfie boolean;
  assigned_tier text;
  assigned_status text;
BEGIN
  -- Check what documents were submitted
  has_registration := 'registration' = ANY(NEW.document_types);
  has_insurance := 'insurance' = ANY(NEW.document_types);
  has_photo := 'photo' = ANY(NEW.document_types);
  has_selfie := 'selfie' = ANY(NEW.document_types);

  -- Assign tier based on documents
  IF has_registration THEN
    assigned_tier := 'verified';
    assigned_status := 'approved';
  ELSIF has_insurance THEN
    assigned_tier := 'standard';
    assigned_status := 'approved';
  ELSIF has_photo OR has_selfie THEN
    assigned_tier := 'conditional';
    assigned_status := 'conditional';
  ELSE
    assigned_tier := 'shadow';
    assigned_status := 'pending';
  END IF;

  -- Update the claim
  NEW.verification_status := assigned_status;

  -- Update the vehicle's verification tier
  UPDATE vehicles
  SET verification_tier = assigned_tier,
      is_claimed = true
  WHERE id = NEW.vehicle_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assignment
DROP TRIGGER IF EXISTS auto_assign_tier_trigger ON verification_claims;
CREATE TRIGGER auto_assign_tier_trigger
  BEFORE INSERT OR UPDATE ON verification_claims
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_verification_tier();

-- Add conditional tier to vehicles table check constraint
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_verification_tier_check;

  -- Add new constraint with conditional tier
  ALTER TABLE vehicles
  ADD CONSTRAINT vehicles_verification_tier_check
  CHECK (verification_tier IN ('shadow', 'conditional', 'standard', 'verified'));
END $$;

-- Update existing shadow vehicles to have proper tier
UPDATE vehicles
SET verification_tier = 'shadow'
WHERE verification_tier IS NULL OR verification_tier = '';

-- Add comment for documentation
COMMENT ON COLUMN vehicles.verification_tier IS 'Verification tier: shadow (unclaimed), conditional (photo/selfie only, no mods access), standard (insurance), verified (registration, full access)';
COMMENT ON COLUMN verification_claims.verification_status IS 'Claim status: pending (under review), approved (full approval), conditional (limited approval), rejected (denied)';
COMMENT ON COLUMN verification_claims.document_types IS 'Array of document types submitted: registration, insurance, photo, selfie';
