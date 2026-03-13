/**
 * Reputation User Reputation Algorithm
 *
 * This algorithm calculates a comprehensive reputation score for users
 * based on their activity, contributions, social impact, and community health.
 *
 * Formula: Total Reputation = Base Reputation + Social Impact + Badges & Achievements +
 *                             Vehicle Contribution + Community Health + Time Bonus - Penalties
 */

export interface UserStats {
  user_id: string;
  created_at: string;

  // Content creation
  posts_count?: number;
  quality_posts_count?: number; // Posts with >10 likes
  viral_posts_count?: number; // Posts with >100 likes
  comments_count?: number;
  helpful_comments_count?: number; // Comments with >5 likes

  // Engagement given
  reactions_given_count?: number;
  reactions_received_count?: number;

  // Social metrics
  followers_count?: number;
  following_count?: number;
  following_engaged_users_count?: number; // Following users with >50 reputation
  profile_views_count?: number;

  // Badges and achievements
  badges?: Array<{ tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' }>;
  challenges_completed_count?: number;

  // Vehicle contributions
  vehicles_added_count?: number;
  verified_vehicles_count?: number;
  quality_vehicle_photos_count?: number;

  // Community health
  valid_reports_count?: number;
  invalid_reports_count?: number;
  reports_received_count?: number;
  blocks_received_count?: number;

  // Activity metrics
  is_active_weekly?: boolean;
  account_age_days?: number;
}

/**
 * Calculate base reputation from content creation
 */
export function calculateBaseReputation(stats: UserStats): number {
  let score = 0;

  // Regular posts: +10 each
  score += (stats.posts_count || 0) * 10;

  // Quality posts (>10 likes): +25 each
  score += (stats.quality_posts_count || 0) * 25;

  // Viral posts (>100 likes): +100 each
  score += (stats.viral_posts_count || 0) * 100;

  // Comments: +2 each
  score += (stats.comments_count || 0) * 2;

  // Helpful comments (>5 likes): +10 each
  score += (stats.helpful_comments_count || 0) * 10;

  // Reactions given (encourages engagement): +1 each
  score += (stats.reactions_given_count || 0) * 1;

  // Reactions received (content quality): +3 each
  score += (stats.reactions_received_count || 0) * 3;

  return score;
}

/**
 * Calculate social impact score
 */
export function calculateSocialImpact(stats: UserStats): number {
  let score = 0;

  // Followers: +5 each (influence)
  score += (stats.followers_count || 0) * 5;

  // Following engaged users: +2 each (good network)
  score += (stats.following_engaged_users_count || 0) * 2;

  // Profile views: +0.5 each (capped at 100 total)
  const viewsScore = Math.min((stats.profile_views_count || 0) * 0.5, 100);
  score += viewsScore;

  return score;
}

/**
 * Calculate badges and achievements score
 */
export function calculateBadgesScore(stats: UserStats): number {
  let score = 0;

  if (stats.badges && stats.badges.length > 0) {
    stats.badges.forEach(badge => {
      switch (badge.rarity) {
        case 'Common':
          score += 50;
          break;
        case 'Uncommon':
          score += 100;
          break;
        case 'Rare':
          score += 250;
          break;
        case 'Epic':
          score += 500;
          break;
        case 'Legendary':
          score += 1000;
          break;
      }
    });
  }

  // Challenges completed: +50 each
  score += (stats.challenges_completed_count || 0) * 50;

  return score;
}

/**
 * Calculate vehicle contribution score
 */
export function calculateVehicleContribution(stats: UserStats): number {
  let score = 0;

  // Vehicles added: +20 each
  score += (stats.vehicles_added_count || 0) * 20;

  // Verified ownership: +100 each
  score += (stats.verified_vehicles_count || 0) * 100;

  // High-quality vehicle photos: +15 each
  score += (stats.quality_vehicle_photos_count || 0) * 15;

  return score;
}

/**
 * Calculate community health score (can be negative)
 */
export function calculateCommunityHealth(stats: UserStats): number {
  let score = 0;

  // Valid reports filed: +10 each (helping moderation)
  score += (stats.valid_reports_count || 0) * 10;

  // Invalid reports filed: -25 each (spam reporting)
  score -= (stats.invalid_reports_count || 0) * 25;

  // Received valid reports: -100 each (bad behavior)
  score -= (stats.reports_received_count || 0) * 100;

  // Blocked by users: -10 per block (unpopular)
  score -= (stats.blocks_received_count || 0) * 10;

  return score;
}

/**
 * Calculate time-based bonus
 */
export function calculateTimeBonus(stats: UserStats): number {
  let score = 0;

  const accountAgeDays = stats.account_age_days || 0;
  const oneYear = 365;

  // Account age 1+ year: +200
  if (accountAgeDays >= oneYear) {
    score += 200;
  }

  // Active for 30+ days: +100
  if (accountAgeDays >= 30) {
    score += 100;
  }

  // Posts weekly: +50
  if (stats.is_active_weekly) {
    score += 50;
  }

  return score;
}

/**
 * Calculate special penalties
 */
export function calculatePenalties(stats: UserStats): number {
  // Penalties are already included in community health score
  // This is a placeholder for future penalty types
  return 0;
}

/**
 * Calculate the final user reputation score
 */
export function calculateUserReputation(stats: UserStats): number {
  const baseReputation = calculateBaseReputation(stats);
  const socialImpact = calculateSocialImpact(stats);
  const badgesScore = calculateBadgesScore(stats);
  const vehicleContribution = calculateVehicleContribution(stats);
  const communityHealth = calculateCommunityHealth(stats);
  const timeBonus = calculateTimeBonus(stats);
  const penalties = calculatePenalties(stats);

  const totalReputation =
    baseReputation +
    socialImpact +
    badgesScore +
    vehicleContribution +
    communityHealth +
    timeBonus -
    penalties;

  return Math.max(totalReputation, 0);
}

/**
 * Get user tier based on reputation
 */
export function getUserTier(reputation: number): {
  tier: string;
  level: number;
  color: string;
} {
  if (reputation >= 50000) {
    return { tier: 'Iconic', level: 11, color: 'text-yellow-400' };
  } else if (reputation >= 25000) {
    return { tier: 'Hall of Fame', level: 10, color: 'text-[#F97316]' };
  } else if (reputation >= 10000) {
    return { tier: 'Legend', level: 9, color: 'text-[#fb923c]' };
  } else if (reputation >= 5000) {
    return { tier: 'Elite', level: 8, color: 'text-[#F97316]' };
  } else if (reputation >= 2500) {
    return { tier: 'Connoisseur', level: 7, color: 'text-[#F97316]' };
  } else if (reputation >= 1000) {
    return { tier: 'Enthusiast', level: 6, color: 'text-orange-400' };
  } else if (reputation >= 500) {
    return { tier: 'Gearhead', level: 5, color: 'text-green-400' };
  } else if (reputation >= 200) {
    return { tier: 'Road Warrior', level: 4, color: 'text-emerald-400' };
  } else if (reputation >= 75) {
    return { tier: 'Cruiser', level: 3, color: 'text-sky-400' };
  } else if (reputation >= 25) {
    return { tier: 'Learner', level: 2, color: 'text-slate-400' };
  } else {
    return { tier: 'Permit', level: 1, color: 'text-neutral-400' };
  }
}

/**
 * Calculate next tier requirements
 */
export function getNextTierRequirements(currentReputation: number): {
  nextTier: string;
  pointsNeeded: number;
  progress: number;
} {
  const tiers = [
    { name: 'Permit', min: 0, max: 24 },
    { name: 'Learner', min: 25, max: 74 },
    { name: 'Cruiser', min: 75, max: 199 },
    { name: 'Road Warrior', min: 200, max: 499 },
    { name: 'Gearhead', min: 500, max: 999 },
    { name: 'Enthusiast', min: 1000, max: 2499 },
    { name: 'Connoisseur', min: 2500, max: 4999 },
    { name: 'Elite', min: 5000, max: 9999 },
    { name: 'Legend', min: 10000, max: 24999 },
    { name: 'Hall of Fame', min: 25000, max: 49999 },
    { name: 'Iconic', min: 50000, max: Infinity },
  ];

  const currentTierIndex = tiers.findIndex(
    tier => currentReputation >= tier.min && currentReputation <= tier.max
  );

  if (currentTierIndex === tiers.length - 1) {
    return { nextTier: 'Max Level', pointsNeeded: 0, progress: 100 };
  }

  const nextTier = tiers[currentTierIndex + 1];
  const currentTier = tiers[currentTierIndex];
  const pointsNeeded = nextTier.min - currentReputation;
  const tierRange = nextTier.min - currentTier.min;
  const currentProgress = currentReputation - currentTier.min;
  const progress = (currentProgress / tierRange) * 100;

  return {
    nextTier: nextTier.name,
    pointsNeeded,
    progress: Math.min(progress, 100),
  };
}

/**
 * Debug: Get reputation breakdown
 */
export function getReputationBreakdown(stats: UserStats) {
  const baseReputation = calculateBaseReputation(stats);
  const socialImpact = calculateSocialImpact(stats);
  const badgesScore = calculateBadgesScore(stats);
  const vehicleContribution = calculateVehicleContribution(stats);
  const communityHealth = calculateCommunityHealth(stats);
  const timeBonus = calculateTimeBonus(stats);
  const penalties = calculatePenalties(stats);
  const totalReputation = calculateUserReputation(stats);
  const tier = getUserTier(totalReputation);
  const nextTier = getNextTierRequirements(totalReputation);

  return {
    totalReputation,
    tier,
    nextTier,
    breakdown: {
      'Base Reputation': baseReputation,
      'Social Impact': socialImpact,
      'Badges & Achievements': badgesScore,
      'Vehicle Contribution': vehicleContribution,
      'Community Health': communityHealth,
      'Time Bonus': timeBonus,
      'Penalties': -penalties,
    },
    components: {
      baseReputation,
      socialImpact,
      badgesScore,
      vehicleContribution,
      communityHealth,
      timeBonus,
      penalties,
    },
  };
}

/**
 * Get leaderboard ranking
 */
export function rankUsers(users: Array<UserStats & { id: string; handle: string }>) {
  return users
    .map(user => ({
      ...user,
      reputation: calculateUserReputation(user),
      tier: getUserTier(calculateUserReputation(user)),
    }))
    .sort((a, b) => b.reputation - a.reputation)
    .map((user, index) => ({
      ...user,
      rank: index + 1,
    }));
}

/**
 * Calculate reputation gain from an action
 */
export function getReputationGainForAction(action: string): number {
  const actionValues: Record<string, number> = {
    'create_post': 10,
    'create_quality_post': 25,
    'create_viral_post': 100,
    'create_comment': 2,
    'create_helpful_comment': 10,
    'give_reaction': 1,
    'receive_reaction': 3,
    'gain_follower': 5,
    'follow_engaged_user': 2,
    'earn_common_badge': 50,
    'earn_uncommon_badge': 100,
    'earn_rare_badge': 250,
    'earn_epic_badge': 500,
    'earn_legendary_badge': 1000,
    'complete_challenge': 50,
    'add_vehicle': 20,
    'verify_vehicle': 100,
    'upload_quality_photo': 15,
    'file_valid_report': 10,
    'file_invalid_report': -25,
    'receive_report': -100,
    'get_blocked': -10,
  };

  return actionValues[action] || 0;
}
