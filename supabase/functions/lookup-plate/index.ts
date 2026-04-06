import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { plate, state } = await req.json()
    const apiKey = Deno.env.get('RAPIDAPI_PLATE_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const url = `https://us-plate-to-vin-lookup.p.rapidapi.com/rpc/secure_lookup_plate?p_state=${encodeURIComponent(state.toUpperCase())}&p_plate=${encodeURIComponent(plate.toUpperCase())}`
    const response = await fetch(url, { method: 'GET', headers: { 'x-rapidapi-host': 'us-plate-to-vin-lookup.p.rapidapi.com', 'x-rapidapi-key': apiKey } })
    const data = await response.json()
    console.log('RapidAPI status:', response.status, JSON.stringify(data))
    return new Response(JSON.stringify(data), { status: response.ok ? 200 : response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
