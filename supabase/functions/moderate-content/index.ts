import { createClient } from 'jsr:@supabase/supabase-js@2';

interface _ModerationQueueItem {
  id: string;
  content_type: string;
  content_id: string;
  image_url?: string;
  text_content?: string;
}

interface ImageAnalysisResult {
  vehicleDetected: boolean;
  vehicleConfidence: number;
  appropriate: boolean;
  nsfwScore: number;
  issues: string[];
}

interface TextAnalysisResult {
  appropriate: boolean;
  toxicityScore: number;
  issues: string[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function analyzeImage(imageUrl: string): Promise<ImageAnalysisResult> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const prompt = `Analyze this image for vehicle content moderation. Respond ONLY with valid JSON:

{
  "vehicleDetected": boolean,
  "vehicleConfidence": number (0-100),
  "appropriate": boolean,
  "nsfwScore": number (0-100, where 100 is most inappropriate),
  "issues": string[] (array of specific issues found)
}

Requirements:
- vehicleDetected: true if any vehicle (car, truck, motorcycle, etc.) is visible
- vehicleConfidence: how confident you are a vehicle is present (0-100)
- appropriate: false if content contains NSFW, violence, gore, or other inappropriate content
- nsfwScore: severity of any inappropriate content (0 = completely appropriate)
- issues: specific problems found like "no_vehicle", "nsfw_content", "violence", "gore", "low_quality", etc.

Return ONLY the JSON object, no other text.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON in AI response:', content);
        return {
          appropriate: false,
          vehicleDetected: false,
          vehicleConfidence: 0,
          nsfwScore: 100,
          issues: ['ai_parse_error']
        };
      }
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      return {
        appropriate: false,
        vehicleDetected: false,
        vehicleConfidence: 0,
        nsfwScore: 100,
        issues: ['ai_error']
      };
    }
  } catch (error) {
    console.error('Image analysis error:', error);
    return {
      appropriate: false,
      vehicleDetected: false,
      vehicleConfidence: 0,
      nsfwScore: 100,
      issues: ['api_error']
    };
  }
}

async function analyzeText(text: string): Promise<TextAnalysisResult> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const prompt = `Analyze this text for content moderation. Respond ONLY with valid JSON:

Text: "${text}"

{
  "appropriate": boolean,
  "toxicityScore": number (0-100, where 100 is most toxic),
  "issues": string[] (array of specific issues found)
}

Check for:
- Harassment or bullying
- Hate speech or discriminatory language
- Spam or promotional content
- Personal identifiable information (PII) like phone numbers, addresses, SSNs
- Threats or violent language
- Sexual content

Return ONLY the JSON object, no other text.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON in AI response:', content);
        return {
          appropriate: false,
          toxicityScore: 100,
          issues: ['ai_parse_error']
        };
      }
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      return {
        appropriate: false,
        toxicityScore: 100,
        issues: ['ai_error']
      };
    }
  } catch (error) {
    console.error('Text analysis error:', error);
    return {
      appropriate: false,
      toxicityScore: 100,
      issues: ['api_error']
    };
  }
}

function determineDecision(
  imageResult?: ImageAnalysisResult,
  textResult?: TextAnalysisResult
): { decision: string; reason?: string } {
  const issues: string[] = [];

  if (imageResult) {
    if (!imageResult.vehicleDetected || imageResult.vehicleConfidence < 60) {
      return { decision: 'rejected', reason: 'no_vehicle' };
    }

    if (!imageResult.appropriate || imageResult.nsfwScore > 30) {
      return { decision: 'rejected', reason: 'inappropriate' };
    }

    if (imageResult.vehicleConfidence < 80) {
      issues.push('low_confidence');
    }
  }

  if (textResult) {
    if (!textResult.appropriate || textResult.toxicityScore > 30) {
      return { decision: 'rejected', reason: 'inappropriate' };
    }

    if (textResult.toxicityScore > 15) {
      issues.push('borderline_content');
    }
  }

  if (issues.length > 0) {
    return { decision: 'needs_review', reason: issues.join(', ') };
  }

  return { decision: 'approved' };
}

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

    const { queueId } = await req.json();

    if (!queueId) {
      return new Response(
        JSON.stringify({ error: 'Missing queueId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: queueItem, error: fetchError } = await supabase
      .from('moderation_queue')
      .select('*')
      .eq('id', queueId)
      .single();

    if (fetchError || !queueItem) {
      return new Response(
        JSON.stringify({ error: 'Queue item not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let imageResult: ImageAnalysisResult | undefined;
    let textResult: TextAnalysisResult | undefined;

    if (queueItem.image_url) {
      imageResult = await analyzeImage(queueItem.image_url);
    }

    if (queueItem.text_content) {
      textResult = await analyzeText(queueItem.text_content);
    }

    const { decision, reason } = determineDecision(imageResult, textResult);

    const updateData = {
      ai_vehicle_detected: imageResult?.vehicleDetected ?? null,
      ai_vehicle_confidence: imageResult?.vehicleConfidence ?? null,
      ai_nsfw_score: imageResult?.nsfwScore ?? null,
      ai_issues: [...(imageResult?.issues ?? []), ...(textResult?.issues ?? [])],
      auto_decision: decision,
      final_decision: decision === 'needs_review' ? null : decision,
      rejection_reason: reason,
      decided_at: decision === 'needs_review' ? null : new Date().toISOString(),
    };

    await supabase
      .from('moderation_queue')
      .update(updateData)
      .eq('id', queueId);

    if (decision !== 'needs_review') {
      const contentTable = queueItem.content_type === 'review' ? 'reviews' : 'posts';
      await supabase
        .from(contentTable)
        .update({
          moderation_status: decision,
          rejection_reason: reason || null
        })
        .eq('id', queueItem.content_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        decision,
        reason,
        imageAnalysis: imageResult,
        textAnalysis: textResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in moderate-content:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
