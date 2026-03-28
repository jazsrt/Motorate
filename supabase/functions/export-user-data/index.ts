import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function exportUserData(userId: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const profile = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const vehicles = await supabase
    .from('vehicles')
    .select('*')
    .eq('owner_id', userId);

  const posts = await supabase
    .from('posts')
    .select('*')
    .eq('author_id', userId);

  const following = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', userId);

  const followers = await supabase
    .from('follows')
    .select('*')
    .eq('following_id', userId);

  const blocks = await supabase
    .from('blocks')
    .select('*')
    .eq('blocker_id', userId);

  const badgeInventory = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', userId);

  const pushSubscriptions = await supabase
    .from('push_subscriptions')
    .select('user_id, created_at')
    .eq('user_id', userId);

  const reactions = await supabase
    .from('reactions')
    .select('*')
    .eq('user_id', userId);

  const comments = await supabase
    .from('post_comments')
    .select('*')
    .eq('author_id', userId);

  const notifications = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId);

  return {
    exportDate: new Date().toISOString(),
    userId,
    profile: profile.data,
    vehicles: vehicles.data || [],
    posts: posts.data || [],
    social: {
      following: following.data || [],
      followers: followers.data || [],
      blocks: blocks.data || [],
    },
    badges: {
      inventory: badgeInventory.data || [],
    },
    engagement: {
      reactions: reactions.data || [],
      comments: comments.data || [],
    },
    notifications: notifications.data || [],
    pushSubscriptions: pushSubscriptions.data || [],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userData = await exportUserData(user.id);

    return new Response(JSON.stringify(userData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="motorated-data-export-${user.id}.json"`,
      },
    });
  } catch (error: unknown) {
    console.error('Error exporting user data:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to export data', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
