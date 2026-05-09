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
  textResult?: SafetyAnalysisResult
): { decision: string; reason?: string } {
  const issues = [...(imageResult?.issues ?? []), ...(textResult?.issues ?? [])];

  if (imageResult && !imageResult.appropriate) {
    return { decision: 'rejected', reason: 'inappropriate' };
  }

  if (textResult && !textResult.appropriate) {
    return { decision: 'rejected', reason: 'inappropriate' };
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

    const { queueId, imageUrl, textContent } = await req.json();

    if (!queueId && (imageUrl || textContent)) {
      const imageResult = imageUrl ? await analyzeImage(imageUrl, textContent) : undefined;
      const textResult = !imageUrl && textContent ? await analyzeText(textContent) : undefined;
      const { decision, reason } = determineDecision(imageResult, textResult);

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

    const { decision, reason } = determineDecision(imageResult, textResult);

    const issues = [...(imageResult?.issues ?? []), ...(textResult?.issues ?? [])];

    await supabase
      .from('moderation_queue')
      .update({
        ai_vehicle_detected: null,
        ai_vehicle_confidence: null,
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
