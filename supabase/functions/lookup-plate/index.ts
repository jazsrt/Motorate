import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { plate, state } = await req.json();

    if (!plate || !state) {
      return new Response(JSON.stringify({ error: 'plate and state are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('RAPIDAPI_PLATE_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'RapidAPI plate key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanPlate = plate.replace(/\s/g, '').toUpperCase();
    const cleanState = state.toUpperCase();

    const url = `https://us-plate-to-vin-lookup.p.rapidapi.com/rpc/secure_lookup_plate?p_state=${encodeURIComponent(cleanState)}&p_plate=${encodeURIComponent(cleanPlate)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'us-plate-to-vin-lookup.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RapidAPI error:', response.status, errorText);

      if (response.status === 404) {
        return new Response(JSON.stringify({ found: false }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Plate lookup failed', status: response.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('RapidAPI response:', JSON.stringify(data));

    // Map response fields
    const make = data.make || data.Make || data.manufacturer || null;
    const model = data.model || data.Model || null;
    const year = data.year || data.Year || data.model_year || data.modelYear || null;

    if (!make && !model) {
      return new Response(JSON.stringify({ found: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      found: true,
      vin: data.vin || data.VIN || data.Vin || null,
      make,
      model,
      year,
      trim: data.trim || data.Trim || data.style || null,
      color: data.color || data.Color || data.exterior_color || data.exteriorColor || null,
      engine: data.engine || data.Engine || data.engine_description || null,
      transmission: data.transmission || data.Transmission || null,
      drivetrain: data.drivetrain || data.Drivetrain || data.drive_type || null,
      style: data.body_type || data.bodyType || data.style || null,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('lookup-plate error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
