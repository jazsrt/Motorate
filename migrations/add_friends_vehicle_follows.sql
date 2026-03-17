-- ============================================================
-- FRIENDS + VEHICLE FOLLOWS MIGRATION
-- Run this in Supabase SQL editor
-- ============================================================

-- 1. Add is_private column to vehicles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'is_private'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN is_private boolean DEFAULT false;
  END IF;
END $$;

-- 2. Create vehicle_follows table (no self-referential CHECK — handled in app layer)
CREATE TABLE IF NOT EXISTS vehicle_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_follows_vehicle  ON vehicle_follows(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_follows_follower ON vehicle_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_follows_status   ON vehicle_follows(vehicle_id, status);

ALTER TABLE vehicle_follows ENABLE ROW LEVEL SECURITY;

-- RLS policies (table is new so no duplicates — no need for DO block wrappers)
CREATE POLICY "vf_select_accepted"
  ON vehicle_follows FOR SELECT TO authenticated
  USING (status = 'accepted');

CREATE POLICY "vf_select_own"
  ON vehicle_follows FOR SELECT TO authenticated
  USING (follower_id = auth.uid());

CREATE POLICY "vf_select_owner"
  ON vehicle_follows FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = vehicle_follows.vehicle_id
        AND v.owner_id = auth.uid()
    )
  );

CREATE POLICY "vf_insert"
  ON vehicle_follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "vf_delete_self"
  ON vehicle_follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

CREATE POLICY "vf_manage_owner"
  ON vehicle_follows FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = vehicle_follows.vehicle_id
        AND v.owner_id = auth.uid()
    )
  );

-- 3. Update notification type constraint (safe — silently skips if it fails)
DO $$
BEGIN
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      'review', 'badge_received', 'badge_unlocked', 'badge_awarded',
      'comment', 'like', 'follow', 'spot', 'message', 'admin_action',
      'friend_request', 'friend_accepted',
      'vehicle_follow', 'vehicle_follow_request', 'vehicle_follow_approved'
    ));
EXCEPTION WHEN others THEN
  NULL; -- constraint may not exist or type column may be unconstrained — safe to skip
END $$;
