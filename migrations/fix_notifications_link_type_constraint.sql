/*
  # Fix Notifications Link Type Constraint

  This migration updates the notifications table constraint to allow 'vehicle' as a valid link_type.

  The approve_claim function tries to create notifications with link_type='vehicle', but the
  current check constraint doesn't allow this value.

  Changes:
  1. Drop the existing link_type check constraint if it exists
  2. Add a new constraint that includes 'vehicle' as a valid link_type
*/

-- First, check if there's an existing constraint and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'notifications'::regclass
      AND conname = 'notifications_link_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_link_type_check;
  END IF;
END $$;

-- Add the updated constraint with 'vehicle' included
ALTER TABLE notifications
ADD CONSTRAINT notifications_link_type_check
CHECK (link_type IN ('post', 'comment', 'badge', 'vehicle', 'profile', 'spot', 'challenge'));

-- Also ensure the type column allows admin_action
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'notifications'::regclass
      AND conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;
END $$;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('badge_awarded', 'admin_action', 'follow', 'comment', 'like', 'mention', 'spot', 'challenge'));
