/**
 * Hashes a license plate number using a server-side Edge Function with a secret pepper.
 *
 * SECURITY: This function REQUIRES a server-side Edge Function that hashes the plate with a
 * secret pepper stored server-side. This prevents rainbow table attacks because:
 * 1. The pepper never leaves the server
 * 2. Client-side code cannot compute valid hashes
 * 3. Attackers cannot precompute rainbow tables without the secret
 *
 * CRITICAL P0 FIX: No client-side fallback allowed. Server-side hashing is MANDATORY.
 * If the edge function is unavailable, the operation will fail (by design).
 */
export async function hashPlate(state: string, plateNumber: string): Promise<string> {

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase configuration missing!');
    throw new Error('Supabase configuration missing. Cannot hash license plates without edge function.');
  }

  const apiUrl = `${supabaseUrl}/functions/v1/hash-plate`;

  try {
    const requestBody = {
      state: state,
      plate: plateNumber,
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });


    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Edge function error response:', errorText);
      throw new Error(`Edge function returned error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.hash) {
      console.error('❌ Missing hash in response!');
      throw new Error('Invalid hash response from server - missing hash field');
    }

    return data.hash;
  } catch (error) {
    console.error('❌ Failed to hash license plate:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(
      'Unable to hash license plate. Server-side hashing is required for privacy. Please try again or contact support.'
    );
  }
}
