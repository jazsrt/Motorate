import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ReputationFactors {
  reviewsGiven: number;
  reviewsReceived: number;
  goodBadgesReceived: number;
  badBadgesReceived: number;
  postsCreated: number;
  challengesCompleted: number;
  likesReceived: number;
  followersCount: number;
}

function calculateReputation(factors: ReputationFactors): number {
  let score = 0;

  score += factors.reviewsGiven * 5;
  score += factors.reviewsReceived * 2;
  score += factors.goodBadgesReceived * 20;
  score -= factors.badBadgesReceived * 10;
  score += factors.postsCreated * 10;
  score += factors.challengesCompleted * 5;
  score += factors.likesReceived * 3;
  score += factors.followersCount * 5;

  return Math.max(0, score);
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

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { count: reviewsGiven } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', userId);

    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id')
      .eq('owner_id', userId);

    let reviewsReceived = 0;
    if (vehicles && vehicles.length > 0) {
      const vehicleIds = vehicles.map((v) => v.id);
      const { count } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .in('vehicle_id', vehicleIds);
      reviewsReceived = count || 0;
    }

    const { count: postsCreated } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', userId);

    const { data: userPosts } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', userId);

    let likesReceived = 0;
    if (userPosts && userPosts.length > 0) {
      const postIds = userPosts.map((p) => p.id);
      const { count } = await supabase
        .from('reactions')
        .select('id', { count: 'exact', head: true })
        .in('post_id', postIds);
      likesReceived = count || 0;
    }

    const { count: badgeCount } = await supabase
      .from('user_badges')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: followers } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId);

    const factors: ReputationFactors = {
      reviewsGiven: reviewsGiven || 0,
      reviewsReceived,
      goodBadgesReceived: badgeCount || 0,
      badBadgesReceived: 0,
      postsCreated: postsCreated || 0,
      challengesCompleted: 0,
      likesReceived,
      followersCount: followers || 0,
    };

    const reputation = calculateReputation(factors);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ reputation_score: reputation })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        reputation,
        factors,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error calculating reputation:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
