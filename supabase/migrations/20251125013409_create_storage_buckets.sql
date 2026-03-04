/*
  # Create Supabase Storage Buckets

  Creates storage buckets for user-uploaded content with proper security policies.

  ## New Buckets
  1. **carma-images** - Public bucket for all user-uploaded images
    - Profile photos
    - Vehicle photos  
    - Post images
    - Review images

  ## Security Policies
  - Anyone (authenticated) can upload images
  - Anyone can view images (public bucket)
  - Users can delete their own images
  - File size limit: 5MB
  - Allowed types: image/jpeg, image/png, image/webp, image/gif
*/

-- Create the carma-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'carma-images',
  'carma-images',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'carma-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (bucket is public)
CREATE POLICY "Public can view images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'carma-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'carma-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own images
CREATE POLICY "Users can update own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'carma-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'carma-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
