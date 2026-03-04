-- Check if the approve_claim function exists
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'approve_claim';

-- Check the function definition
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'approve_claim'
AND pronamespace = 'public'::regnamespace;
