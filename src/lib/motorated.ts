import { supabase } from './supabase';

export interface MotoRateScore {
  id: string;
  user_id: string;
  total_score: number;
  rank: number | null;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface MotoRateTransaction {
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
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
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

export const MOTORATE_POINTS = {
  CREATE_POST: 10,
  POST_LIKED: 2,
  POST_COMMENTED: 3,
  ADD_COMMENT: 1,
  COMMENT_LIKED: 2,
  FOLLOW_SOMEONE: 1,
  GET_FOLLOWED: 5,
  ADD_VEHICLE: 25,
  VERIFY_VEHICLE: 50,
  FIRST_SPOTTER: 20,
  SPOT_VEHICLE: 5,
  GIVE_RATING: 5,
  PROFILE_PHOTO: 10,
  COMPLETE_BIO: 10,
} as const;

export async function awardMotoRatePoints(
  userId: string,
  action: keyof typeof MOTORATE_POINTS,
  referenceType?: string,
  referenceId?: string
) {
  try {
    const points = MOTORATE_POINTS[action];

    const { error } = await supabase.rpc('award_motorate_points', {
      p_user_id: userId,
      p_action: action,
      p_points: points,
      p_reference_type: referenceType || null,
      p_reference_id: referenceId || null,
      p_description: `${action}: +${points} points`
    });

    if (error) throw error;

    await checkBadgeProgress(userId);

    return { success: true, points };
  } catch (error) {
    console.error('Error awarding points:', error);
    return { success: false, error };
  }
}

export async function getUserMotoRateScore(userId: string): Promise<MotoRateScore> {
  try {
    const { data, error } = await supabase
      .from('motorate_scores')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    return data || {
      id: '',
      user_id: userId,
      total_score: 0,
      rank: null,
      level: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching score:', error);
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

export async function getUserMotoRateTransactions(
  userId: string,
  limit: number = 50
): Promise<MotoRateTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('motorate_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

export async function getLeaderboard(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('motorate_scores')
      .select(`
        total_score,
        rank,
        level,
        user:profiles!motorate_scores_user_id_fkey(id, handle, avatar_url, full_name)
      `)
      .order('total_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

async function checkBadgeProgress(userId: string) {
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
      .select('*', { count: 'exact', head: true })
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
    const commentIds = userComments.data.map((c: any) => c.id);
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

async function checkOnboardingBadges(userId: string, counts: any) {
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

async function checkQualityBadges(userId: string, counts: any) {
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

async function checkMilestoneBadges(userId: string, counts: any) {
  if (counts.posts >= 10) {
    await awardBadge(userId, 'posts_10');
  }

  if (counts.followerCount >= 50) {
    await awardBadge(userId, 'followers_50');
  }

  const score = await getUserMotoRateScore(userId);
  if (score.total_score >= 1000) {
    await awardBadge(userId, 'motorate_1000');
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

    const pointsForBadge = {
      Common: 10,
      Uncommon: 25,
      Rare: 50,
      Epic: 100,
      Legendary: 250
    }[badge.rarity] || 10;

    await supabase.rpc('award_motorate_points', {
      p_user_id: userId,
      p_action: 'EARN_BADGE',
      p_points: pointsForBadge,
      p_reference_type: 'badge',
      p_reference_id: badge.id,
      p_description: `Earned badge: ${badge.name}`
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
      .order('rarity', { ascending: false })
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

export function getMotoRateLevel(score: number): {
  level: string;
  min: number;
  max: number;
  progress: number;
} {
  const levels = [
    { level: 'Permit', min: 0, max: 99 },
    { level: 'Regular', min: 100, max: 249 },
    { level: 'Enthusiast', min: 250, max: 499 },
    { level: 'Expert', min: 500, max: 999 },
    { level: 'Master', min: 1000, max: 2499 },
    { level: 'Legend', min: 2500, max: Infinity }
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

    const score = await getUserMotoRateScore(userId);
    if (score.total_score >= 1000 && !earnedBadgeNames.has('motorate_1000')) {
      const result = await awardBadge(userId, 'motorate_1000');
      if (result.success) {
        awardedBadges.push('motorate_1000');
      }
    }
  } catch (error) {
    console.error('Error checking and awarding badges:', error);
  }

  return awardedBadges;
}
