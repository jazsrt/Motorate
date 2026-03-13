/*
  # Fix Storage Bucket Name Mismatch

  ## Changes
  - Creates 'motorate-images' bucket to match code expectations
  - Sets up proper RLS policies for authenticated uploads
  - Allows public read access

  ## Security
  - Users can only upload to their own folder (auth.uid())
  - Anyone can read images (public bucket)
  - Users can only delete/update their own images
*/

-- Create the motorate-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'motorate-images',
  'motorate-images',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Drop existing policies for motorate-images if they exist
DROP POLICY IF EXISTS "Authenticated users can upload to motorate" ON storage.objects;
DROP POLICY IF EXISTS "Public can view motorate images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own motorate images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own motorate images" ON storage.objects;

-- Allow authenticated users to upload images to their own folder
CREATE POLICY "Authenticated users can upload to motorate"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'motorate-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access
CREATE POLICY "Public can view motorate images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'motorate-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own motorate images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'motorate-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own images
CREATE POLICY "Users can update own motorate images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'motorate-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'motorate-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
