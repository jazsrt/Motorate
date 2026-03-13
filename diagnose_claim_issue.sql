-- Diagnostic queries for the claim approval issue

-- 1. Check the current state of verification_claims for jazsrt
SELECT 
  vc.id,
  vc.vehicle_id,
  vc.user_id,
  vc.status,
  vc.reviewed_by,
  vc.reviewed_at,
  vc.admin_notes,
  v.year,
  v.make,
  v.model,
  v.owner_id,
  v.is_verified,
  p.handle as user_handle
FROM verification_claims vc
JOIN vehicles v ON v.id = vc.vehicle_id
JOIN profiles p ON p.id = vc.user_id
WHERE p.handle = 'jazsrt'
ORDER BY vc.created_at DESC;

-- 2. Check if the vehicles table has owner_id set
SELECT 
  v.id,
  v.year,
  v.make,
  v.model,
  v.owner_id,
  v.is_verified,
  p.handle as owner_handle
FROM vehicles v
LEFT JOIN profiles p ON p.id = v.owner_id
WHERE v.id IN (
  SELECT vehicle_id FROM verification_claims vc2
  JOIN profiles p2 ON p2.id = vc2.user_id
  WHERE p2.handle = 'jazsrt'
);

-- 3. Check if approve_claim function exists and is correct
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'approve_claim'
AND pronamespace = 'public'::regnamespace;

-- 4. Check for any RLS policies blocking updates
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'vehicles'
AND cmd IN ('UPDATE', 'ALL');
