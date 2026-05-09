import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

function stripVinFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripVinFields)
  if (!value || typeof value !== 'object') return value

  const cleaned: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key.toLowerCase() === 'vin') continue
    cleaned[key] = stripVinFields(child)
  }
  return cleaned
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { plate, state } = await req.json()
    const apiKey = Deno.env.get('RAPIDAPI_PLATE_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const url = `https://us-plate-to-vin-lookup.p.rapidapi.com/rpc/secure_lookup_plate?p_state=${encodeURIComponent(state.toUpperCase())}&p_plate=${encodeURIComponent(plate.toUpperCase())}`
    const response = await fetch(url, { method: 'GET', headers: { 'x-rapidapi-host': 'us-plate-to-vin-lookup.p.rapidapi.com', 'x-rapidapi-key': apiKey } })
    const data = await response.json()
    const sanitized = stripVinFields(data)
    console.log('RapidAPI lookup status:', response.status, 'array:', Array.isArray(data))
    return new Response(JSON.stringify(sanitized), { status: response.ok ? 200 : response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
