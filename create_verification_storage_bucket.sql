/*
  # Create Verification Documents Storage Bucket

  This script creates the storage bucket for verification documents
  and sets up appropriate RLS policies.
*/

-- Create the verification-docs bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own docs" ON storage.objects;

-- Policy: Users can upload their own verification documents
CREATE POLICY "Users can upload their verification docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-docs' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Policy: Admins can view all verification documents
CREATE POLICY "Admins can view all verification docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-docs' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'moderator')
  )
);

-- Policy: Users can view their own verification documents
CREATE POLICY "Users can view their own docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-docs' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);
