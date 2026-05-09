import { createClient } from 'jsr:@supabase/supabase-js@2';

type ModerationInput = string | Array<
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
>;

interface OpenAIModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
}

interface SafetyAnalysisResult {
  appropriate: boolean;
  score: number;
  issues: string[];
}

interface VehicleAnalysisResult {
  vehicleDetected: boolean;
  confidence: number;
  vehicleType: string | null;
  issues: string[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function moderateWithOpenAI(input: ModerationInput): Promise<OpenAIModerationResult> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'omni-moderation-latest',
      input,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI moderation error:', response.status, errorText);
    throw new Error(`OpenAI moderation error: ${response.status}`);
  }

  const data = await response.json();
  const result = data.results?.[0];

  if (!result) {
    throw new Error('OpenAI moderation returned no result');
  }

  return result;
}

function extractResponseText(data: any): string {
  if (typeof data?.output_text === 'string') {
    return data.output_text;
  }

  const parts = data?.output
    ?.flatMap((item: any) => item?.content ?? [])
    ?.map((part: any) => part?.text)
    ?.filter((text: unknown) => typeof text === 'string');

  return parts?.join('\n') ?? '';
}

async function analyzeVehiclePresence(imageUrl: string): Promise<VehicleAnalysisResult> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_VISION_MODEL') || 'gpt-4.1-mini',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                'You are checking whether a MotoRate feed photo is vehicle-related.',
                'Approve only when a real vehicle, vehicle interior, vehicle part, or vehicle-specific scene is visible.',
                'Reject screenshots, memes, selfies without a visible vehicle, unrelated objects, pets, food, landscapes, and blank images.',
                'Return JSON only.',
              ].join(' '),
            },
            {
              type: 'input_image',
              image_url: imageUrl,
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'vehicle_presence_check',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              vehicleDetected: { type: 'boolean' },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              vehicleType: { type: ['string', 'null'] },
              issues: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['vehicleDetected', 'confidence', 'vehicleType', 'issues'],
          },
        },
      },
      max_output_tokens: 180,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI vehicle analysis error:', response.status, errorText);
    throw new Error(`OpenAI vehicle analysis error: ${response.status}`);
  }

  const data = await response.json();
  const outputText = extractResponseText(data);
  const parsed = JSON.parse(outputText);

  return {
    vehicleDetected: Boolean(parsed.vehicleDetected),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    vehicleType: typeof parsed.vehicleType === 'string' ? parsed.vehicleType : null,
    issues: Array.isArray(parsed.issues)
      ? parsed.issues.filter((issue: unknown) => typeof issue === 'string')
      : [],
  };
}

async function safeAnalyzeVehiclePresence(imageUrl: string): Promise<VehicleAnalysisResult> {
  try {
    return await analyzeVehiclePresence(imageUrl);
  } catch (error) {
    console.error('Vehicle presence analysis error:', error);
    return {
      vehicleDetected: true,
      confidence: 0,
      vehicleType: null,
      issues: ['vehicle_check_unavailable'],
    };
  }
}

function summarizeModeration(result: OpenAIModerationResult): SafetyAnalysisResult {
  const issues = Object.entries(result.categories)
    .filter(([, flagged]) => flagged)
    .map(([category]) => category);

  const score = Object.values(result.category_scores || {})
    .reduce((max, value) => Math.max(max, Number(value) || 0), 0);

  return {
    appropriate: !result.flagged,
    score,
    issues,
  };
}

async function analyzeText(text: string): Promise<SafetyAnalysisResult> {
  try {
    return summarizeModeration(await moderateWithOpenAI(text));
  } catch (error) {
    console.error('Text moderation error:', error);
    return {
      appropriate: true,
      score: 0,
      issues: ['moderation_unavailable'],
    };
  }
}

async function analyzeImage(imageUrl: string, text?: string): Promise<SafetyAnalysisResult> {
  try {
    const input: ModerationInput = [
      ...(text ? [{ type: 'text' as const, text }] : []),
      { type: 'image_url', image_url: { url: imageUrl } },
    ];

    return summarizeModeration(await moderateWithOpenAI(input));
  } catch (error) {
    console.error('Image moderation error:', error);
    return {
      appropriate: true,
      score: 0,
      issues: ['moderation_unavailable'],
    };
  }
}

function determineDecision(
  imageResult?: SafetyAnalysisResult,
  textResult?: SafetyAnalysisResult,
  vehicleResult?: VehicleAnalysisResult
): { decision: string; reason?: string } {
  const issues = [...(imageResult?.issues ?? []), ...(textResult?.issues ?? [])];

  if (imageResult && !imageResult.appropriate) {
    return { decision: 'rejected', reason: 'inappropriate' };
  }

  if (textResult && !textResult.appropriate) {
    return { decision: 'rejected', reason: 'inappropriate' };
  }

  if (vehicleResult && !vehicleResult.vehicleDetected && vehicleResult.confidence >= 0.65) {
    return { decision: 'rejected', reason: 'no_vehicle' };
  }

  const borderline = Math.max(imageResult?.score ?? 0, textResult?.score ?? 0) > 0.35;
  if (borderline && issues.length > 0) {
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

    const { queueId, imageUrl, textContent, requireVehicle } = await req.json();

    if (!queueId && (imageUrl || textContent)) {
      const imageResult = imageUrl ? await analyzeImage(imageUrl, textContent) : undefined;
      const textResult = !imageUrl && textContent ? await analyzeText(textContent) : undefined;
      const vehicleResult = imageUrl && requireVehicle
        ? await safeAnalyzeVehiclePresence(imageUrl)
        : undefined;
      const { decision, reason } = determineDecision(imageResult, textResult, vehicleResult);

      return new Response(
        JSON.stringify({
          success: true,
          decision,
          reason,
          imageAnalysis: imageResult,
          textAnalysis: textResult,
          vehicleAnalysis: vehicleResult,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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

    const imageResult = queueItem.image_url
      ? await analyzeImage(queueItem.image_url, queueItem.text_content)
      : undefined;
    const textResult = !queueItem.image_url && queueItem.text_content
      ? await analyzeText(queueItem.text_content)
      : undefined;
    const vehicleResult = queueItem.content_type === 'post' && queueItem.image_url
      ? await safeAnalyzeVehiclePresence(queueItem.image_url)
      : undefined;

    const { decision, reason } = determineDecision(imageResult, textResult, vehicleResult);

    const issues = [
      ...(imageResult?.issues ?? []),
      ...(textResult?.issues ?? []),
      ...(vehicleResult?.issues ?? []),
    ];

    await supabase
      .from('moderation_queue')
      .update({
        ai_vehicle_detected: vehicleResult?.vehicleDetected ?? null,
        ai_vehicle_confidence: vehicleResult ? vehicleResult.confidence * 100 : null,
        ai_nsfw_score: Math.max(imageResult?.score ?? 0, textResult?.score ?? 0) * 100,
        ai_issues: issues,
        auto_decision: decision,
        final_decision: decision === 'needs_review' ? null : decision,
        rejection_reason: reason,
        decided_at: decision === 'needs_review' ? null : new Date().toISOString(),
      })
      .eq('id', queueId);

    if (decision !== 'needs_review') {
      const contentTable = queueItem.content_type === 'review' ? 'reviews' : 'posts';
      await supabase
        .from(contentTable)
        .update({
          moderation_status: decision,
          rejection_reason: reason || null,
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
        vehicleAnalysis: vehicleResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in moderate-content:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
