import { supabase } from './supabase';
import { REPUTATION_ACTIONS, ReputationAction } from '../config/reputationConfig';

export interface ReputationScore {
  id: string;
  user_id: string;
  total_score: number;
  rank: number | null;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface ReputationTransaction {
  id: string;
  user_id: string;
  action: string;
  points: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: string;
  icon_name: string;
  level: number;
  level_name: string;
  progression_group?: string;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

interface ReputationContext {
  userId: string;
  action: ReputationAction;
  referenceType?: string;
  referenceId?: string;
  metadata?: {
    dailyPostCount?: number;
    likeCount?: number;
  };
}

interface UserActionCounts {
  posts: number;
  vehicles: number;
  comments: number;
  commentLikes: number;
  hasAvatar: boolean;
  hasBio: boolean;
  hasVerifiedVehicle: boolean;
  driverRating: number;
  followerCount: number;
}

interface ReputationResult {
  success: boolean;
  pointsAwarded: number;
  newTotal: number;
  error?: string;
}

/**
 * CRITICAL FUNCTION: Calculates and awards reputation points
 * This implements the EXACT math from the requirements
 */
export async function calculateAndAwardReputation(
  context: ReputationContext
): Promise<ReputationResult> {
  const { userId, action, referenceType, referenceId, metadata } = context;

  const config = REPUTATION_ACTIONS[action] as any;
  if (!config) {
    return {
      success: false,
      pointsAwarded: 0,
      newTotal: 0,
      error: `Unknown action: ${action}`
    };
  }

  let pointsToAward = 0;

  // Calculate points based on action type
  switch (action) {
    case 'CLAIM_VEHICLE':
    case 'BADGE_EARNED':
    case 'COMMENT_LEFT':
    case 'POSITIVE_STICKER_RECEIVED':
    case 'NEGATIVE_STICKER_RECEIVED':
    case 'SPOT_QUICK_REVIEW':
    case 'SPOT_FULL_REVIEW':
    case 'SPOT_UPGRADE_TO_FULL':
    case 'NEW_PLATE_BONUS':
      pointsToAward = config.points as number;
      break;

    case 'POST_CREATED': {
      // Logic: If daily_post_count > 10, award 5pts instead of 15pts
      const dailyCount = metadata?.dailyPostCount || 0;
      pointsToAward = dailyCount > config.dailyLimit
        ? config.fallbackPoints as number
        : config.basePoints as number;
      break;
    }

    case 'LIKE_RECEIVED': {
      // Logic: If like_count_on_item > 10, award 1pt instead of 2pts
      const likeCount = metadata?.likeCount || 0;
      pointsToAward = likeCount > (config.threshold as number)
        ? config.fallbackPoints as number
        : config.basePoints as number;
      break;
    }
  }

  // Call Supabase RPC to award points
  try {
    const { data, error } = await supabase.rpc('award_motorate_points', {
      p_user_id: userId,
      p_action: action,
      p_points: pointsToAward,
      p_reference_type: referenceType || null,
      p_reference_id: referenceId || null
    });

    if (error) {
      console.error('❌ Failed to award reputation:', error);
      return {
        success: false,
        pointsAwarded: 0,
        newTotal: 0,
        error: error.message
      };
    }


    return {
      success: true,
      pointsAwarded: pointsToAward,
      newTotal: data?.new_total || 0
    };

  } catch (err) {
    console.error('❌ Reputation calculation error:', err);
    return {
      success: false,
      pointsAwarded: 0,
      newTotal: 0,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

/**
 * Helper: Get user's post count for today
 * Used to determine if daily limit reached
 */
export async function getDailyPostCount(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId)
    .gte('created_at', today.toISOString());

  if (error) {
    console.error('Failed to get daily post count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Helper: Get current like count on a post
 * Used to determine if diminishing returns apply
 */
export async function getLikeCount(postId: string): Promise<number> {
  const { count, error } = await supabase
    .from('reactions')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('reaction_type', 'like');

  if (error) {
    console.error('Failed to get like count:', error);
    return 0;
  }

  return count || 0;
}

export async function getUserReputationScore(userId: string): Promise<ReputationScore> {
  try {
    const { data, error } = await supabase
      .from('reputation_scores')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) return data;

    const { data: profile } = await supabase
      .from('profiles')
      .select('reputation_score')
      .eq('id', userId)
      .maybeSingle();

    const fallbackScore = profile?.reputation_score || 0;

    return {
      id: '',
      user_id: userId,
      total_score: fallbackScore,
      rank: null,
      level: fallbackScore >= 2500 ? 6 : fallbackScore >= 1000 ? 5 : fallbackScore >= 500 ? 4 : fallbackScore >= 250 ? 3 : fallbackScore >= 100 ? 2 : 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching reputation score:', error);
    return {
      id: '',
      user_id: userId,
      total_score: 0,
      rank: null,
      level: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}

export async function getUserReputationTransactions(
  userId: string,
  limit: number = 50
): Promise<ReputationTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('reputation_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching reputation transactions:', error);
    return [];
  }
}

export async function getLeaderboard(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, handle, avatar_url, full_name, reputation_score')
      .order('reputation_score', { ascending: false })
      .gt('reputation_score', 0)
      .limit(limit);

    if (error) throw error;
    return (data || []).map(u => ({
      total_score: u.reputation_score,
      rank: null,
      level: 1,
      user: { id: u.id, handle: u.handle, avatar_url: u.avatar_url, full_name: u.full_name }
    }));
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

async function _checkBadgeProgress(userId: string) {
  try {
    const counts = await getUserActionCounts(userId);

    await checkOnboardingBadges(userId, counts);
    await checkQualityBadges(userId, counts);
    await checkMilestoneBadges(userId, counts);
  } catch (error) {
    console.error('Error checking badge progress:', error);
  }
}

async function getUserActionCounts(userId: string) {
  const [
    { count: postCount },
    { count: vehicleCount },
    { count: commentCount },
    userComments,
    { data: profile },
    { data: verifiedVehicle },
    { data: followers }
  ] = await Promise.all([
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId),
    supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId),
    supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId),
    supabase
      .from('post_comments')
      .select('id')
      .eq('author_id', userId),
    supabase
      .from('profiles')
      .select('avatar_url, bio, avg_driver_rating')
      .eq('id', userId)
      .single(),
    supabase
      .from('vehicles')
      .select('id')
      .eq('owner_id', userId)
      .eq('is_verified', true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('follows')
      .select('id', { count: 'exact' })
      .eq('following_id', userId)
  ]);

  let commentLikesCount = 0;
  if (userComments.data && userComments.data.length > 0) {
    const commentIds = userComments.data.map((c) => c.id);
    const { count } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .in('comment_id', commentIds);
    commentLikesCount = count || 0;
  }

  return {
    posts: postCount || 0,
    vehicles: vehicleCount || 0,
    comments: commentCount || 0,
    commentLikes: commentLikesCount,
    hasAvatar: !!profile?.avatar_url,
    hasBio: !!profile?.bio,
    hasVerifiedVehicle: !!verifiedVehicle,
    driverRating: profile?.avg_driver_rating || 0,
    followerCount: followers?.length || 0
  };
}

async function checkOnboardingBadges(userId: string, counts: UserActionCounts) {
  const badgesToCheck = [
    { name: 'first_profile_photo', condition: counts.hasAvatar },
    { name: 'first_vehicle', condition: counts.vehicles >= 1 },
    { name: 'first_post', condition: counts.posts >= 1 },
  ];

  for (const badge of badgesToCheck) {
    if (badge.condition) {
      await awardBadge(userId, badge.name);
    }
  }
}

async function checkQualityBadges(userId: string, counts: UserActionCounts) {
  if (counts.driverRating >= 4.5) {
    await awardBadge(userId, 'excellent_driver');
  }

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('avg_rating')
    .eq('owner_id', userId);

  const has5StarVehicle = vehicles?.some(v => v.avg_rating >= 4.8);
  if (has5StarVehicle) {
    await awardBadge(userId, '5_star_vehicle');
  }

  if (counts.hasVerifiedVehicle) {
    await awardBadge(userId, 'verified_owner');
  }
}

async function checkMilestoneBadges(userId: string, counts: UserActionCounts) {
  if (counts.posts >= 10) {
    await awardBadge(userId, 'posts_10');
  }

  if (counts.followerCount >= 50) {
    await awardBadge(userId, 'followers_50');
  }

  const score = await getUserReputationScore(userId);
  if (score.total_score >= 1000) {
    await awardBadge(userId, 'reputation_1000');
  }
}

export async function awardBadge(userId: string, badgeName: string) {
  try {
    const { data: badge } = await supabase
      .from('badges')
      .select('*')
      .eq('name', badgeName)
      .maybeSingle();

    if (!badge) return { success: false };

    const { data: existing } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badge.id)
      .maybeSingle();

    if (existing) return { success: false };

    const { error } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badge.id
      });

    if (error) throw error;

    // Create a feed post for the badge earned event
    await supabase.from('posts').insert({
      author_id: userId,
      post_type: 'badge_given',
      badge_id: badge.id,
      caption: `Earned the ${badge.display_name || badge.name} badge`,
      privacy_level: 'public',
      moderation_status: 'approved',
    });

    await calculateAndAwardReputation({
      userId,
      action: 'BADGE_EARNED',
      referenceType: 'badge',
      referenceId: badge.id
    });

    return { success: true, badge };
  } catch (error) {
    console.error('Error awarding badge:', error);
    return { success: false, error };
  }
}

export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(*)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching badges:', error);
    return [];
  }
}

export async function getAllBadges(): Promise<Badge[]> {
  try {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('category', { ascending: true })
      .order('level', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching badges:', error);
    return [];
  }
}

export async function getBadgesByCategory(): Promise<Record<string, Badge[]>> {
  try {
    const badges = await getAllBadges();
    const categorized: Record<string, Badge[]> = {};

    badges.forEach((badge) => {
      if (!categorized[badge.category]) {
        categorized[badge.category] = [];
      }
      categorized[badge.category].push(badge);
    });

    return categorized;
  } catch (error) {
    console.error('Error categorizing badges:', error);
    return {};
  }
}

export function getReputationLevel(score: number): {
  level: string;
  min: number;
  max: number;
  progress: number;
} {
  const levels = [
    { level: 'Permit',        min: 0,     max: 24 },
    { level: 'Learner',       min: 25,    max: 99 },
    { level: 'Licensed',      min: 100,   max: 249 },
    { level: 'Registered',    min: 250,   max: 499 },
    { level: 'Certified',     min: 500,   max: 999 },
    { level: 'Endorsed',      min: 1000,  max: 2499 },
    { level: 'Authority',     min: 2500,  max: 4999 },
    { level: 'Distinguished', min: 5000,  max: 9999 },
    { level: 'Elite',         min: 10000, max: 24999 },
    { level: 'Sovereign',     min: 25000, max: 49999 },
    { level: 'Iconic',        min: 50000, max: Infinity },
  ];

  const currentLevel = levels.find(l => score >= l.min && score <= l.max) || levels[0];
  const progress = currentLevel.max === Infinity
    ? 100
    : ((score - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100;

  return {
    ...currentLevel,
    progress: Math.min(100, Math.max(0, progress))
  };
}

export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const awardedBadges: string[] = [];

  try {
    const counts = await getUserActionCounts(userId);
    const userBadges = await getUserBadges(userId);
    const earnedBadgeNames = new Set(
      userBadges.map(ub => ub.badge?.name).filter(Boolean)
    );

    const badgeChecks = [
      { name: 'first_post', condition: counts.posts >= 1 },
      { name: 'first_vehicle', condition: counts.vehicles >= 1 },
      { name: 'first_profile_photo', condition: counts.hasAvatar },
      { name: 'verified_owner', condition: counts.hasVerifiedVehicle },
      { name: 'posts_10', condition: counts.posts >= 10 },
      { name: 'excellent_driver', condition: counts.driverRating >= 4.5 },
      { name: 'followers_50', condition: counts.followerCount >= 50 },
      { name: 'conversation_starter', condition: counts.comments >= 1 },
      { name: 'commenter', condition: counts.comments >= 10 },
      { name: 'discussion_driver', condition: counts.comments >= 50 },
      { name: 'engaging_enthusiast', condition: counts.comments >= 100 },
      { name: 'expert_contributor', condition: counts.comments >= 500 },
      { name: 'conversation_contributor', condition: counts.commentLikes >= 10 },
      { name: 'helpful_hero', condition: counts.commentLikes >= 25 },
      { name: 'comment_king_queen', condition: counts.commentLikes >= 100 }
    ];

    for (const check of badgeChecks) {
      if (check.condition && !earnedBadgeNames.has(check.name)) {
        const result = await awardBadge(userId, check.name);
        if (result.success) {
          awardedBadges.push(check.name);
        }
      }
    }

    const score = await getUserReputationScore(userId);
    if (score.total_score >= 1000 && !earnedBadgeNames.has('reputation_1000')) {
      const result = await awardBadge(userId, 'reputation_1000');
      if (result.success) {
        awardedBadges.push('reputation_1000');
      }
    }
  } catch (error) {
    console.error('Error checking and awarding badges:', error);
  }

  return awardedBadges;
}
