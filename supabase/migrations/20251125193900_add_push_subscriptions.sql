/*
  # Add Push Subscriptions for Browser Notifications

  1. New Tables
    - `push_subscriptions`
      - `id` (uuid, primary key) - Unique subscription ID
      - `user_id` (uuid, foreign key) - References profiles table
      - `endpoint` (text) - Push service endpoint URL
      - `p256dh` (text) - Public key for encryption
      - `auth` (text) - Authentication secret
      - `device_info` (text, nullable) - Optional device/browser info
      - `created_at` (timestamptz) - When subscription was created
      - `last_used_at` (timestamptz, nullable) - Last successful push sent
  
  2. Security
    - Enable RLS on `push_subscriptions` table
    - Add policy for users to manage their own subscriptions
    - Add policy for authenticated users to insert subscriptions
    - Add policy for authenticated users to delete their own subscriptions
  
  3. Indexes
    - Index on user_id for fast subscription lookups
    - Index on endpoint for duplicate detection

  4. Notes
    - Stores Web Push API subscription data
    - One user can have multiple subscriptions (multiple devices/browsers)
    - Endpoint is unique per device/browser
*/

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_info text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  UNIQUE(endpoint)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own subscriptions
CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own subscriptions
CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update their own subscriptions (for last_used_at)
CREATE POLICY "Users can update own push subscriptions"
  ON push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);