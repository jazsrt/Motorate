/*
  # Fix Storage Buckets and Permissions

  1. Storage Buckets
    - `posts` - For user post images
    - `vehicles` - For vehicle photos
    - `profile-photos` - For user profile pictures

  2. Security
    - Public read access for all buckets
    - Authenticated users can upload to their own content
    - Users can update/delete their own content
*/

-- Create the 'posts' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Create 'vehicles' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicles', 'vehicles', true)
ON CONFLICT (id) DO NOTHING;

-- Create 'profile-photos' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

-- Public read access for posts bucket
CREATE POLICY "Public can view posts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'posts');

-- Authenticated users can upload to posts bucket
CREATE POLICY "Authenticated users can upload posts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'posts');

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read access for vehicles bucket
CREATE POLICY "Public can view vehicles"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicles');

-- Authenticated users can upload to vehicles bucket
CREATE POLICY "Authenticated users can upload vehicles"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'vehicles');

-- Users can update their own vehicle photos
CREATE POLICY "Users can update own vehicles"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'vehicles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own vehicle photos
CREATE POLICY "Users can delete own vehicles"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'vehicles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read access for profile-photos bucket
CREATE POLICY "Public can view profile photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

-- Authenticated users can upload to profile-photos bucket
CREATE POLICY "Authenticated users can upload profile photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own profile photos
CREATE POLICY "Users can update own profile photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own profile photos
CREATE POLICY "Users can delete own profile photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
