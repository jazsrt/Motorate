-- Check the actual structure of verification_claims table
SELECT 
  column_name, 
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'verification_claims'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check a sample claim to see the data structure
SELECT 
  id,
  vehicle_id,
  user_id,
  status,
  document_urls,
  document_types
FROM verification_claims
LIMIT 1;
