import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * Reset Badges Edge Function
 *
 * This function resets badge inventories for all users on a monthly basis.
 * It should be called via cron job on the 1st of each month.
 *
 * Features:
 * - Calls reset_all_badge_inventories() database function
 * - Logs how many inventories were reset
 * - Returns success/failure status
 * - Only resets badges with monthly_limit > 0 (not unlimited)
 * - Only resets if not already reset this month
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting badge inventory reset...');

    const { data: resetCount, error } = await supabase.rpc('reset_all_badge_inventories');

    if (error) {
      console.error('Error resetting badge inventories:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Successfully reset ${resetCount} badge inventories`);

    return new Response(
      JSON.stringify({
        success: true,
        count: resetCount,
        message: `Reset ${resetCount} badge inventories`,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error in reset-badges:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
