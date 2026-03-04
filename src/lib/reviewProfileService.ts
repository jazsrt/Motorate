import { supabase } from './supabase';
import type { ReviewStats, RatingDistribution, StickerStats, CredibilityBadge, ReviewProfile } from '../types/reviewProfile';

export async function getReviewProfile(userId: string): Promise<ReviewProfile | null> {
  try {
    const stats = await getReviewStats(userId);
    const distribution = await getRatingDistribution(userId);
    const stickerStats = await getStickerStats(userId);
    const credibilityBadges = calculateCredibilityBadges(stats, distribution, stickerStats);
    const recentReviews = await getRecentReviews(userId, 20);

    return {
      userId,
      stats,
      distribution,
      stickerStats,
      credibilityBadges,
      recentReviews
    };
  } catch (error) {
    console.error('Error loading review profile:', error);
    return null;
  }
}

async function getReviewStats(userId: string): Promise<ReviewStats> {
  const { count: totalSpots } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId)
    .in('post_type', ['spot', 'review']);

  const { data: ratedPosts } = await supabase
    .from('posts')
    .select('rating_driver, rating_vehicle')
    .eq('author_id', userId)
    .not('rating_driver', 'is', null);

  const avgDriverRating = ratedPosts?.length
    ? Math.round(ratedPosts.reduce((sum, p) => sum + (p.rating_driver || 0), 0) / ratedPosts.length)
    : 0;

  const avgVehicleRating = ratedPosts?.length
    ? Math.round(ratedPosts.reduce((sum, p) => sum + (p.rating_vehicle || 0), 0) / ratedPosts.length)
    : 0;

  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', userId)
    .single();

  const memberAgeDays = profile
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    totalSpots: totalSpots || 0,
    avgDriverRating,
    avgVehicleRating,
    memberAgeDays
  };
}

async function getRatingDistribution(userId: string): Promise<RatingDistribution> {
  const { data: posts } = await supabase
    .from('posts')
    .select('rating_driver')
    .eq('author_id', userId)
    .not('rating_driver', 'is', null);

  const distribution = { excellent: 0, good: 0, average: 0, poor: 0 };

  posts?.forEach(post => {
    const rating = post.rating_driver;
    if (rating === 5) distribution.excellent++;
    else if (rating === 4) distribution.good++;
    else if (rating === 3) distribution.average++;
    else distribution.poor++;
  });

  return distribution;
}

async function getStickerStats(userId: string): Promise<StickerStats> {
  try {
    const { data: stickers } = await supabase
      .from('vehicle_stickers')
      .select(`
        id,
        bumper_stickers!inner(category, name)
      `)
      .eq('placed_by', userId);

    const positiveCount = stickers?.filter(s => s.bumper_stickers.category === 'positive').length || 0;
    const negativeCount = stickers?.filter(s => s.bumper_stickers.category === 'negative').length || 0;
    const total = positiveCount + negativeCount;
    const positivityRatio = total > 0 ? positiveCount / total : 0;

    const stickerCounts: Record<string, number> = {};
    stickers?.forEach(s => {
      const name = s.bumper_stickers.name;
      stickerCounts[name] = (stickerCounts[name] || 0) + 1;
    });

    const mostGivenSticker = Object.entries(stickerCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    return { positiveCount, negativeCount, positivityRatio, mostGivenSticker };
  } catch (error) {
    console.error('Error loading sticker stats:', error);
    return { positiveCount: 0, negativeCount: 0, positivityRatio: 0, mostGivenSticker: undefined };
  }
}

function calculateCredibilityBadges(
  stats: ReviewStats,
  distribution: RatingDistribution,
  stickerStats: StickerStats
): CredibilityBadge[] {
  const badges: CredibilityBadge[] = [];
  const totalRated = distribution.excellent + distribution.good + distribution.average + distribution.poor;
  const negativePercent = totalRated > 0 ? (distribution.poor / totalRated) * 100 : 0;
  const positivePercent = totalRated > 0 ? (distribution.excellent / totalRated) * 100 : 0;

  if (stats.totalSpots >= 10) {
    badges.push({
      icon: '✅',
      label: 'Verified Spotter',
      color: 'green',
      description: `${stats.totalSpots} spots completed`
    });
  }

  if (negativePercent < 30 && positivePercent < 50 && totalRated >= 10) {
    badges.push({
      icon: '⚖️',
      label: 'Balanced Reviewer',
      color: 'blue',
      description: 'Fair and realistic ratings'
    });
  }

  if (negativePercent > 40 && totalRated >= 10) {
    badges.push({
      icon: '⚠️',
      label: 'Harsh Critic',
      color: 'red',
      description: `${Math.round(negativePercent)}% negative ratings`
    });
  }

  if (positivePercent > 70 && totalRated >= 10) {
    badges.push({
      icon: '😊',
      label: 'Always Positive',
      color: 'yellow',
      description: `${Math.round(positivePercent)}% excellent ratings`
    });
  }

  if (stats.memberAgeDays > 180) {
    badges.push({
      icon: '🎖️',
      label: 'Long-term Member',
      color: 'purple',
      description: `${Math.floor(stats.memberAgeDays / 30)} months active`
    });
  }

  if (stickerStats.positivityRatio > 0.75 && (stickerStats.positiveCount + stickerStats.negativeCount) >= 10) {
    badges.push({
      icon: '🌟',
      label: 'Positive Influencer',
      color: 'yellow',
      description: `${Math.round(stickerStats.positivityRatio * 100)}% positive stickers`
    });
  }

  const spotsPerDay = stats.memberAgeDays > 0 ? stats.totalSpots / stats.memberAgeDays : 0;
  if (spotsPerDay > 20 && stats.memberAgeDays < 7) {
    badges.push({
      icon: '🚨',
      label: 'High Activity Alert',
      color: 'red',
      description: 'Unusually high posting rate'
    });
  }

  return badges;
}

async function getRecentReviews(userId: string, limit: number = 20) {
  try {
    // First get all vehicles owned by this user
    const { data: userVehicles } = await supabase
      .from('vehicles')
      .select('id, make, model, year')
      .eq('owner_id', userId);

    if (!userVehicles || userVehicles.length === 0) {
      return [];
    }

    const vehicleIds = userVehicles.map(v => v.id);

    // Get reviews left by OTHER users on this user's vehicles
    const { data: reviews } = await supabase
      .from('reviews')
      .select(`
        id,
        vehicle_id,
        author_id,
        comment,
        location_label,
        created_at,
        rating_driver,
        rating_vehicle,
        author:profiles!reviews_author_id_fkey(
          id,
          handle,
          avatar_url
        )
      `)
      .in('vehicle_id', vehicleIds)
      .neq('author_id', userId)
      .eq('is_hidden_by_owner', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Attach vehicle info and calculate overall rating from rating_driver (1-5 scale)
    return (reviews || []).map(review => ({
      ...review,
      text: review.comment,
      overall_rating: review.rating_driver || 0,
      vehicle: userVehicles.find(v => v.id === review.vehicle_id) || null
    }));
  } catch (error) {
    console.error('Error loading recent reviews:', error);
    return [];
  }
}
