import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Add role column if it doesn't exist
    const { error: schemaError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'profiles' AND column_name = 'role'
          ) THEN
            ALTER TABLE profiles ADD COLUMN role text DEFAULT 'spectator';
          END IF;
        END $$;

        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
          CHECK (role IN ('spectator', 'driver', 'owner', 'admin', 'moderator'));
      `
    });

    if (schemaError) {
      // If exec_sql doesn't exist, try direct update
      console.log('Schema update failed, trying direct update:', schemaError);
    }

    // Step 2: Update user to admin
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, profile: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
