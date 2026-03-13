import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AdminStats {
  // Core Counts
  total_users: number;
  total_posts: number;
  total_reviews: number;
  total_vehicles: number;

  // Growth Metrics (Real)
  new_users_today: number;
  new_users_yesterday: number;
  new_users_this_week: number;
  new_users_last_week: number;
  growth_trend: Array<{ date: string; users: number; posts: number; reviews: number }>;

  // Engagement Metrics
  dau: number; // Daily Active Users (posted/reacted/commented today)
  wau: number; // Weekly Active Users
  posts_per_active_user: number;
  avg_reactions_per_post: number;
  avg_comments_per_post: number;

  // Content Quality
  posts_pending_moderation: number;
  posts_approved_today: number;
  posts_rejected_today: number;
  approval_rate: number; // % of posts approved
  avg_moderation_time_minutes: number;
  top_rejection_reasons: Array<{ reason: string; count: number }>;

  // Community Health
  reports_per_1000_users: number;
  active_reports_count: number;
  users_blocked_count: number;
  repeat_offenders: number; // Users with 2+ rejected posts

  // User Tiers & Progression
  tier_distribution: {
    spectator: number;
    scout: number;
    judge: number;
    admin: number;
  };
  users_who_leveled_up_this_week: number;

  // Vehicle & Verification
  claimed_vehicles: number;
  unclaimed_vehicles: number;
  verified_vehicles: number;
  verification_rate: number;

  // Badge Economy
  badge_counts: Array<{ badge_id: string; badge_name: string; count: number }>;
  badges_given_this_week: number;
  most_popular_badges: Array<{ name: string; count: number }>;

  // Retention & Cohorts
  day1_retention: number; // % of yesterday's new users who came back today
  day7_retention: number;

  // Recent Activity
  recent_users: Array<{
    id: string;
    handle: string;
    email: string;
    role: string;
    avatar_url: string;
    reputation_score: number;
    created_at: string;
  }>;
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
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's JWT and check admin role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    // Fetch all data in parallel
    const [
      usersResult,
      postsResult,
      reviewsResult,
      vehiclesResult,
      badgeInventoryResult,
      badgesResult,
      recentUsersResult,
      reactionsResult,
      commentsResult,
      reportsResult,
      blocksResult,
      moderationQueueResult,
    ] = await Promise.all([
      // Get all users with timestamps
      supabaseClient.from('profiles').select('id, handle, avatar_url, role, reputation_score, created_at'),

      // Get all posts with timestamps and moderation status
      supabaseClient.from('posts').select('id, author_id, created_at, moderation_status, rejection_reason, vehicle_id'),

      // Get all reviews
      supabaseClient.from('reviews').select('id, created_at'),

      // Get all vehicles
      supabaseClient.from('vehicles').select('id, owner_id, verification_tier, created_at'),

      // Badge inventory
      supabaseClient.from('user_inventory').select('badge_id, user_id, created_at'),

      // Badge definitions
      supabaseClient.from('badges').select('id, name'),

      // Recent users (last 50)
      supabaseClient
        .from('profiles')
        .select('id, handle, avatar_url, role, reputation_score, created_at')
        .order('created_at', { ascending: false })
        .limit(50),

      // All reactions
      supabaseClient.from('reactions').select('id, post_id, user_id, created_at'),

      // All comments
      supabaseClient.from('post_comments').select('id, post_id, author_id, created_at'),

      // All reports
      supabaseClient.from('reports').select('id, reporter_id, status, created_at'),

      // User blocks
      supabaseClient.from('user_blocks').select('blocker_id, blocked_id, created_at'),

      // Moderation queue
      supabaseClient.from('moderation_queue').select('id, status, created_at, decided_at, final_decision'),
    ]);

    // Get emails for recent users
    const { data: authUsers } = await supabaseClient.auth.admin.listUsers();
    const emailMap = new Map(authUsers?.users?.map(u => [u.id, u.email]) || []);

    const users = usersResult.data || [];
    const posts = postsResult.data || [];
    const reviews = reviewsResult.data || [];
    const vehicles = vehiclesResult.data || [];
    const badgeInventory = badgeInventoryResult.data || [];
    const badges = badgesResult.data || [];
    const reactions = reactionsResult.data || [];
    const comments = commentsResult.data || [];
    const reports = reportsResult.data || [];
    const blocks = blocksResult.data || [];
    const moderationQueue = moderationQueueResult.data || [];

    // === GROWTH METRICS ===
    const newUsersToday = users.filter(u => new Date(u.created_at) >= today).length;
    const newUsersYesterday = users.filter(u => {
      const d = new Date(u.created_at);
      return d >= yesterday && d < today;
    }).length;
    const newUsersThisWeek = users.filter(u => new Date(u.created_at) >= startOfWeek).length;
    const newUsersLastWeek = users.filter(u => {
      const d = new Date(u.created_at);
      return d >= startOfLastWeek && d < startOfWeek;
    }).length;

    // Growth trend (last 7 days)
    const growthTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      growthTrend.push({
        date: date.toISOString().split('T')[0],
        users: users.filter(u => {
          const d = new Date(u.created_at);
          return d >= date && d < nextDate;
        }).length,
        posts: posts.filter(p => {
          const d = new Date(p.created_at);
          return d >= date && d < nextDate;
        }).length,
        reviews: reviews.filter(r => {
          const d = new Date(r.created_at);
          return d >= date && d < nextDate;
        }).length,
      });
    }

    // === ENGAGEMENT METRICS ===
    const activeUserIdsToday = new Set([
      ...posts.filter(p => new Date(p.created_at) >= today).map(p => p.author_id),
      ...reactions.filter(r => new Date(r.created_at) >= today).map(r => r.user_id),
      ...comments.filter(c => new Date(c.created_at) >= today).map(c => c.author_id),
    ]);
    const dau = activeUserIdsToday.size;

    const activeUserIdsThisWeek = new Set([
      ...posts.filter(p => new Date(p.created_at) >= startOfWeek).map(p => p.author_id),
      ...reactions.filter(r => new Date(r.created_at) >= startOfWeek).map(r => r.user_id),
      ...comments.filter(c => new Date(c.created_at) >= startOfWeek).map(c => c.author_id),
    ]);
    const wau = activeUserIdsThisWeek.size;

    const postsPerActiveUser = wau > 0 ? Math.round((posts.filter(p => new Date(p.created_at) >= startOfWeek).length / wau) * 10) / 10 : 0;

    const reactionCounts = new Map<string, number>();
    reactions.forEach(r => {
      reactionCounts.set(r.post_id, (reactionCounts.get(r.post_id) || 0) + 1);
    });
    const avgReactionsPerPost = posts.length > 0 ? Math.round((reactions.length / posts.length) * 10) / 10 : 0;

    const commentCounts = new Map<string, number>();
    comments.forEach(c => {
      commentCounts.set(c.post_id, (commentCounts.get(c.post_id) || 0) + 1);
    });
    const avgCommentsPerPost = posts.length > 0 ? Math.round((comments.length / posts.length) * 10) / 10 : 0;

    // === CONTENT QUALITY ===
    const postsPending = posts.filter(p => p.moderation_status === 'pending').length;
    const postsApprovedToday = posts.filter(p => p.moderation_status === 'approved' && new Date(p.created_at) >= today).length;
    const postsRejectedToday = posts.filter(p => p.moderation_status === 'rejected' && new Date(p.created_at) >= today).length;

    const approvedPosts = posts.filter(p => p.moderation_status === 'approved').length;
    const rejectedPosts = posts.filter(p => p.moderation_status === 'rejected').length;
    const approvalRate = (approvedPosts + rejectedPosts) > 0 ? Math.round((approvedPosts / (approvedPosts + rejectedPosts)) * 100) : 100;

    // Calculate avg moderation time
    const decidedItems = moderationQueue.filter(m => m.decided_at);
    const avgModerationTime = decidedItems.length > 0
      ? decidedItems.reduce((sum, m) => {
          const created = new Date(m.created_at).getTime();
          const decided = new Date(m.decided_at!).getTime();
          return sum + (decided - created);
        }, 0) / decidedItems.length / 1000 / 60 // Convert to minutes
      : 0;

    // Top rejection reasons
    const rejectionReasonCounts = new Map<string, number>();
    posts.filter(p => p.rejection_reason).forEach(p => {
      rejectionReasonCounts.set(p.rejection_reason!, (rejectionReasonCounts.get(p.rejection_reason!) || 0) + 1);
    });
    const topRejectionReasons = Array.from(rejectionReasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // === COMMUNITY HEALTH ===
    const reportsPerThousand = users.length > 0 ? Math.round((reports.length / users.length) * 1000) : 0;
    const activeReportsCount = reports.filter(r => r.status === 'pending').length;
    const usersBlockedCount = new Set(blocks.map(b => b.blocked_id)).size;

    // Repeat offenders (users with 2+ rejected posts)
    const rejectionsByUser = new Map<string, number>();
    posts.filter(p => p.moderation_status === 'rejected').forEach(p => {
      rejectionsByUser.set(p.author_id, (rejectionsByUser.get(p.author_id) || 0) + 1);
    });
    const repeatOffenders = Array.from(rejectionsByUser.values()).filter(count => count >= 2).length;

    // === USER TIERS ===
    const tierDistribution = {
      spectator: users.filter(u => !u.role || u.role === 'spectator').length,
      scout: users.filter(u => u.role === 'scout').length,
      judge: users.filter(u => u.role === 'judge').length,
      admin: users.filter(u => u.role === 'admin').length,
    };

    // Users who leveled up this week (gained a scout or judge role recently)
    // This is approximate - checking reputation scores
    const usersWhoLeveledUp = users.filter(u => {
      return (u.role === 'scout' || u.role === 'judge') && new Date(u.created_at) < startOfWeek;
    }).filter(u => u.reputation_score >= 100).length;

    // === VEHICLE & VERIFICATION ===
    const claimedVehicles = vehicles.filter(v => v.owner_id !== null).length;
    const unclaimedVehicles = vehicles.filter(v => v.owner_id === null).length;
    const verifiedVehicles = vehicles.filter(v => v.verification_tier === 'verified').length;
    const verificationRate = claimedVehicles > 0 ? Math.round((verifiedVehicles / claimedVehicles) * 100) : 0;

    // === BADGE ECONOMY ===
    const badgeMap = new Map(badges.map(b => [b.id, b.name]));
    const badgeCounts = new Map<string, { name: string; count: number }>();
    badgeInventory.forEach(item => {
      const badgeName = badgeMap.get(item.badge_id) || 'Unknown';
      const existing = badgeCounts.get(item.badge_id) || { name: badgeName, count: 0 };
      existing.count++;
      badgeCounts.set(item.badge_id, existing);
    });

    const badgeCountsArray = Array.from(badgeCounts.entries()).map(([badge_id, data]) => ({
      badge_id,
      badge_name: data.name,
      count: data.count,
    }));

    const badgesGivenThisWeek = badgeInventory.filter(b => new Date(b.created_at) >= startOfWeek).length;
    const mostPopularBadges = badgeCountsArray
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(b => ({ name: b.badge_name, count: b.count }));

    // === RETENTION ===
    const yesterdaysNewUsers = users.filter(u => {
      const d = new Date(u.created_at);
      return d >= yesterday && d < today;
    }).map(u => u.id);

    const yesterdaysNewUsersWhoReturnedToday = yesterdaysNewUsers.filter(userId =>
      posts.some(p => p.author_id === userId && new Date(p.created_at) >= today) ||
      reactions.some(r => r.user_id === userId && new Date(r.created_at) >= today) ||
      comments.some(c => c.author_id === userId && new Date(c.created_at) >= today)
    ).length;

    const day1Retention = yesterdaysNewUsers.length > 0
      ? Math.round((yesterdaysNewUsersWhoReturnedToday / yesterdaysNewUsers.length) * 100)
      : 0;

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const eightDaysAgo = new Date(sevenDaysAgo);
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 1);

    const newUsersSevenDaysAgo = users.filter(u => {
      const d = new Date(u.created_at);
      return d >= eightDaysAgo && d < sevenDaysAgo;
    }).map(u => u.id);

    const sevenDayUsersWhoReturnedToday = newUsersSevenDaysAgo.filter(userId =>
      posts.some(p => p.author_id === userId && new Date(p.created_at) >= today) ||
      reactions.some(r => r.user_id === userId && new Date(r.created_at) >= today) ||
      comments.some(c => c.author_id === userId && new Date(c.created_at) >= today)
    ).length;

    const day7Retention = newUsersSevenDaysAgo.length > 0
      ? Math.round((sevenDayUsersWhoReturnedToday / newUsersSevenDaysAgo.length) * 100)
      : 0;

    // === RECENT USERS ===
    const recentUsers = recentUsersResult.data?.map(user => ({
      ...user,
      email: emailMap.get(user.id) || 'N/A',
      role: user.role || 'spectator',
    })) || [];

    const stats: AdminStats = {
      total_users: users.length,
      total_posts: posts.length,
      total_reviews: reviews.length,
      total_vehicles: vehicles.length,
      new_users_today: newUsersToday,
      new_users_yesterday: newUsersYesterday,
      new_users_this_week: newUsersThisWeek,
      new_users_last_week: newUsersLastWeek,
      growth_trend: growthTrend,
      dau,
      wau,
      posts_per_active_user: postsPerActiveUser,
      avg_reactions_per_post: avgReactionsPerPost,
      avg_comments_per_post: avgCommentsPerPost,
      posts_pending_moderation: postsPending,
      posts_approved_today: postsApprovedToday,
      posts_rejected_today: postsRejectedToday,
      approval_rate: approvalRate,
      avg_moderation_time_minutes: Math.round(avgModerationTime),
      top_rejection_reasons: topRejectionReasons,
      reports_per_1000_users: reportsPerThousand,
      active_reports_count: activeReportsCount,
      users_blocked_count: usersBlockedCount,
      repeat_offenders: repeatOffenders,
      tier_distribution: tierDistribution,
      users_who_leveled_up_this_week: usersWhoLeveledUp,
      claimed_vehicles: claimedVehicles,
      unclaimed_vehicles: unclaimedVehicles,
      verified_vehicles: verifiedVehicles,
      verification_rate: verificationRate,
      badge_counts: badgeCountsArray,
      badges_given_this_week: badgesGivenThisWeek,
      most_popular_badges: mostPopularBadges,
      day1_retention: day1Retention,
      day7_retention: day7Retention,
      recent_users: recentUsers,
    };

    return new Response(JSON.stringify(stats), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
