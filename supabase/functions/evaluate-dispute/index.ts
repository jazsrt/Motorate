import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.27.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

const anthropic = new Anthropic({ apiKey: anthropicApiKey });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EvaluationResult {
  recommendation: 'uphold' | 'dismiss' | 'needs_human_review';
  confidence: number;
  reasoning: string;
  suggestedAction: 'none' | 'remove_review' | 'edit_review' | 'warn_reviewer' | 'warn_disputer';
}

async function evaluateDispute(disputeData: Record<string, unknown>): Promise<EvaluationResult> {
  const review = disputeData.review;
  const vehicle = review.vehicle;
  const dispute = disputeData;

  const prompt = `You are evaluating a review dispute for a car social app.

REVIEW:
- Text: "${review.review_text || 'No text provided'}"
- Driver Score: ${review.driver_score || 'N/A'}/100
- Cool Score: ${review.cool_score || 'N/A'}/100
- Created: ${review.created_at}
- Has Image: ${review.has_image ? 'Yes' : 'No'}

VEHICLE:
- ${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''} - ${vehicle.color || ''}

DISPUTE:
- Type: ${dispute.dispute_type}
- Filed by: ${dispute.disputed_by === vehicle.owner_id ? 'Vehicle owner' : 'Other user'}
- Description: "${dispute.description}"

Evaluate whether this dispute is valid. Consider:
- Does the review contain verifiable false claims?
- Is the tone harassing or purely personal attack vs legitimate criticism?
- Does it seem like a fake/spam review?
- Is there a privacy violation?
- Is the dispute frivolous or legitimate?

Return ONLY valid JSON with no additional text:
{
  "recommendation": "uphold" | "dismiss" | "needs_human_review",
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "suggestedAction": "none" | "remove_review" | "edit_review" | "warn_reviewer" | "warn_disputer"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  const result = JSON.parse(responseText) as EvaluationResult;

  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { disputeId } = await req.json();

    if (!disputeId) {
      return new Response(
        JSON.stringify({ error: 'Missing disputeId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch dispute with related data
    const { data: dispute, error: disputeError } = await supabase
      .from('review_disputes')
      .select(`
        *,
        review:reviews(
          id,
          review_text,
          driver_score,
          cool_score,
          created_at,
          has_image,
          author_id,
          vehicle:vehicles(
            id,
            make,
            model,
            year,
            color,
            owner_id
          )
        )
      `)
      .eq('id', disputeId)
      .single();

    if (disputeError || !dispute) {
      return new Response(
        JSON.stringify({ error: 'Dispute not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Evaluate with AI
    const evaluation = await evaluateDispute(dispute);

    // Save AI recommendation
    await supabase
      .from('review_disputes')
      .update({
        ai_recommendation: evaluation as unknown as Record<string, unknown>,
      })
      .eq('id', disputeId);

    // Auto-resolve if high confidence
    const shouldAutoResolve =
      evaluation.confidence > 85 && evaluation.recommendation !== 'needs_human_review';

    if (shouldAutoResolve) {
      const resolution =
        evaluation.recommendation === 'uphold' ? 'upheld' : 'dismissed';

      // Update dispute status
      await supabase
        .from('review_disputes')
        .update({
          status: 'resolved',
          resolution,
          resolution_notes: evaluation.reasoning,
          resolved_by: 'ai',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', disputeId);

      // If upheld and action is to remove review
      if (resolution === 'upheld' && evaluation.suggestedAction === 'remove_review') {
        await supabase
          .from('reviews')
          .update({ moderation_status: 'rejected' })
          .eq('id', dispute.review_id);

        // Notify review author
        if (dispute.review.author_id) {
          await supabase.from('notifications').insert({
            user_id: dispute.review.author_id,
            type: 'review_removed',
            title: 'Review Removed',
            message: 'A review you posted has been removed following a dispute.',
          });
        }
      }

      // Notify disputer
      await supabase.from('notifications').insert({
        user_id: dispute.disputed_by,
        type: 'dispute_resolved',
        title: 'Dispute Resolved',
        message: `Your dispute has been ${resolution}. ${evaluation.reasoning}`,
      });

      return new Response(
        JSON.stringify({
          success: true,
          autoResolved: true,
          resolution,
          evaluation,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Flag for human review
      await supabase
        .from('review_disputes')
        .update({ status: 'investigating' })
        .eq('id', disputeId);

      return new Response(
        JSON.stringify({
          success: true,
          autoResolved: false,
          needsHumanReview: true,
          evaluation,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    console.error('Error evaluating dispute:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
