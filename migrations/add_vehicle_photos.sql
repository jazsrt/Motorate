/*
  # Add Vehicle Photos Column

  1. Changes
    - Add `photos` jsonb column to `vehicles` table with default empty array
    - Each photo entry contains: {url: string, uploaded_at: string}
    - Maximum 10 photos per vehicle enforced in application logic

  2. Notes
    - Photos stored in Supabase Storage bucket "vehicle-photos"
    - JSONB allows flexible storage of photo metadata
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'photos'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN photos jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
