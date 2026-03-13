import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface VerifyDocumentRequest {
  vehicleId: string;
  imageUrl: string;
  documentType: 'registration' | 'title' | 'insurance';
}

interface VerificationResult {
  verified: boolean;
  confidence: number;
  extractedData: {
    vin?: string;
    make?: string;
    model?: string;
    year?: string;
    plate?: string;
    state?: string;
    ownerName?: string;
  };
  reason?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request data
    const { vehicleId, imageUrl, documentType }: VerifyDocumentRequest = await req.json();

    if (!vehicleId || !imageUrl || !documentType) {
      return new Response(
        JSON.stringify({ error: 'vehicleId, imageUrl, and documentType are required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Fetch vehicle data
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return new Response(
        JSON.stringify({ error: 'Vehicle not found' }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // SECURITY: Validate image URL to prevent SSRF attacks
    if (!imageUrl.startsWith('https://')) {
      return new Response(
        JSON.stringify({ error: 'Image URL must use HTTPS' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Only allow images from Supabase storage
    const urlObj = new URL(imageUrl);
    const allowedDomains = ['.supabase.co', '.supabase.in'];
    const isAllowedDomain = allowedDomains.some(domain =>
      urlObj.hostname.includes(domain) || urlObj.hostname === domain.slice(1)
    );

    if (!isAllowedDomain) {
      return new Response(
        JSON.stringify({ error: 'Image must be from authorized Supabase storage' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Prepare prompt for OpenAI Vision
    const prompt = `You are an expert document verification AI. Analyze this ${documentType} document and extract vehicle ownership information.

Vehicle being verified:
- Plate: ${vehicle.plate_number}
- State: ${vehicle.state}
${vehicle.make ? `- Make: ${vehicle.make}` : ''}
${vehicle.model ? `- Model: ${vehicle.model}` : ''}
${vehicle.year ? `- Year: ${vehicle.year}` : ''}

Extract the following information from the document:
1. VIN (Vehicle Identification Number)
2. Make
3. Model
4. Year
5. License Plate Number
6. State
7. Owner Name (if visible)

Verify that the extracted information matches the vehicle details provided above.

Respond ONLY with a valid JSON object in this exact format (no markdown, no code blocks):
{
  "verified": true/false,
  "confidence": 0.0-1.0,
  "extractedData": {
    "vin": "extracted VIN or null",
    "make": "extracted make or null",
    "model": "extracted model or null",
    "year": "extracted year or null",
    "plate": "extracted plate or null",
    "state": "extracted state or null",
    "ownerName": "extracted owner name or null"
  },
  "reason": "explanation of verification decision"
}`;

    // Call OpenAI Vision API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.2,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let result: VerificationResult;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response format from AI');
    }

    // Update vehicle with verification results if verified
    if (result.verified && result.confidence >= 0.7) {
      const updateData: any = {
        verification_tier: 'verified',
        owner_proof_url: imageUrl,
      };

      // Add extracted data if available (excluding VIN for privacy)
      if (result.extractedData.make) {
        updateData.make = result.extractedData.make;
      }
      if (result.extractedData.model) {
        updateData.model = result.extractedData.model;
      }
      if (result.extractedData.year) {
        updateData.year = parseInt(result.extractedData.year);
      }

      const { error: updateError } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', vehicleId);

      if (updateError) {
        console.error('Failed to update vehicle:', updateError);
        throw new Error('Failed to update vehicle verification status');
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Verify document error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        verified: false,
        confidence: 0,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
