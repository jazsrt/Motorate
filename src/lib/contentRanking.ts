/**
 * Reputation Content Ranking Algorithm
 *
 * This algorithm ranks posts, spots, and content based on multiple factors
 * to surface the most relevant, engaging, and high-quality content to users.
 *
 * Formula: Final Score = (Recency Score + Engagement Score + Quality Score) × (1 + Author Reputation Multiplier)
 */

export interface ContentItem {
  id: string;
  created_at: string;
  published_at?: string | null;

  // Engagement metrics
  likes_count?: number;
  comments_count?: number;
  reactions_count?: number;
  shares_count?: number;
  views_count?: number;

  // Content quality indicators
  image_url?: string | null;
  video_url?: string | null;
  content_type?: 'image' | 'video' | null;
  location_lat?: number | null;
  location_lng?: number | null;
  tags?: string[];

  // Vehicle/author quality
  vehicle_rating?: number | null;
  author_reputation?: number;

  // Moderation/penalties
  reports_count?: number;
  is_blocked?: boolean;
  is_nsfw?: boolean;
  moderation_status?: string;
}

/**
 * Calculate recency score (0-100)
 * Rewards newer content to keep feed fresh
 */
export function calculateRecencyScore(createdAt: string): number {
  const now = new Date().getTime();
  const created = new Date(createdAt).getTime();
  const ageMs = now - created;

  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;
  const oneWeek = 7 * oneDay;
  const oneMonth = 30 * oneDay;

  if (ageMs < oneHour) return 100;
  if (ageMs < oneDay) return 75;
  if (ageMs < oneWeek) return 50;
  if (ageMs < oneMonth) return 25;
  return 10;
}

/**
 * Calculate engagement score (0-200)
 * Rewards content that generates interaction
 */
export function calculateEngagementScore(content: ContentItem): number {
  const likes = (content.likes_count || 0) * 2;
  const comments = (content.comments_count || 0) * 5;
  const reactions = (content.reactions_count || 0) * 3;
  const shares = (content.shares_count || 0) * 10;
  const views = Math.min((content.views_count || 0) * 0.1, 50);

  return likes + comments + reactions + shares + views;
}

/**
 * Calculate quality score (0-100)
 * Rewards high-quality, complete content
 */
export function calculateQualityScore(content: ContentItem): number {
  let score = 0;

  // Media quality
  if (content.image_url) score += 20;
  if (content.video_url || content.content_type === 'video') score += 30;

  // Location adds context
  if (content.location_lat && content.location_lng) score += 10;

  // Tags help discoverability
  if (content.tags && content.tags.length > 0) {
    score += Math.min(content.tags.length * 5, 25);
  }

  // Vehicle rating (4-5 stars = high quality)
  if (content.vehicle_rating && content.vehicle_rating >= 4) score += 20;

  // Author reputation
  if (content.author_reputation && content.author_reputation > 100) score += 15;

  return Math.min(score, 100);
}

/**
 * Calculate penalty score (subtracts from final score)
 * Reduces visibility of problematic content
 */
export function calculatePenalties(content: ContentItem): number {
  let penalties = 0;

  // User blocks hide content completely
  if (content.is_blocked) penalties += 1000;

  // NSFW content gets demoted (but not hidden)
  if (content.is_nsfw) penalties += 75;

  // Reports indicate potential issues
  if (content.reports_count && content.reports_count > 0) {
    penalties += content.reports_count * 50;
  }

  // Pending moderation gets slight demotion
  if (content.moderation_status === 'pending') penalties += 10;

  return penalties;
}

/**
 * Calculate author reputation multiplier (0-1+)
 * Boosts content from trusted, high-reputation users
 */
export function calculateAuthorMultiplier(authorReputation: number = 0): number {
  return authorReputation / 1000;
}

/**
 * Calculate the final ranking score for a content item
 */
export function calculateContentScore(content: ContentItem): number {
  const recencyScore = calculateRecencyScore(content.created_at);
  const engagementScore = calculateEngagementScore(content);
  const qualityScore = calculateQualityScore(content);
  const penalties = calculatePenalties(content);
  const authorMultiplier = calculateAuthorMultiplier(content.author_reputation || 0);

  const baseScore = recencyScore + engagementScore + qualityScore - penalties;
  const finalScore = baseScore * (1 + authorMultiplier);

  return Math.max(finalScore, 0);
}

/**
 * Sort an array of content items by ranking score (highest first)
 */
export function rankContent<T extends ContentItem>(content: T[]): T[] {
  return content.map(item => ({
    ...item,
    _rankingScore: calculateContentScore(item)
  })).sort((a, b) => b._rankingScore - a._rankingScore);
}

/**
 * Get trending content (high engagement in last 24 hours)
 */
export function getTrendingContent<T extends ContentItem>(content: T[]): T[] {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return content
    .filter(item => new Date(item.created_at) > oneDayAgo)
    .map(item => ({
      ...item,
      _trendingScore: calculateEngagementScore(item) * (1 + calculateAuthorMultiplier(item.author_reputation || 0))
    }))
    .sort((a, b) => b._trendingScore - a._trendingScore);
}

/**
 * Get hot content (combination of recent + engaging)
 */
export function getHotContent<T extends ContentItem>(content: T[]): T[] {
  return content
    .map(item => {
      const recency = calculateRecencyScore(item.created_at);
      const engagement = calculateEngagementScore(item);
      return {
        ...item,
        _hotScore: (recency * 0.4) + (engagement * 0.6)
      };
    })
    .sort((a, b) => b._hotScore - a._hotScore);
}

/**
 * Categorize content by ranking score
 */
export function categorizeByRanking<T extends ContentItem>(content: T[]) {
  const rankedContent = rankContent(content);

  return {
    elite: rankedContent.filter(item => (item as any)._rankingScore > 300),
    great: rankedContent.filter(item => {
      const score = (item as any)._rankingScore;
      return score >= 200 && score <= 300;
    }),
    good: rankedContent.filter(item => {
      const score = (item as any)._rankingScore;
      return score >= 100 && score < 200;
    }),
    average: rankedContent.filter(item => (item as any)._rankingScore < 100),
  };
}

/**
 * Debug: Get ranking breakdown for a content item
 */
export function getScoreBreakdown(content: ContentItem) {
  const recencyScore = calculateRecencyScore(content.created_at);
  const engagementScore = calculateEngagementScore(content);
  const qualityScore = calculateQualityScore(content);
  const penalties = calculatePenalties(content);
  const authorMultiplier = calculateAuthorMultiplier(content.author_reputation || 0);
  const baseScore = recencyScore + engagementScore + qualityScore - penalties;
  const finalScore = baseScore * (1 + authorMultiplier);

  return {
    recencyScore,
    engagementScore,
    qualityScore,
    penalties,
    authorMultiplier,
    baseScore,
    finalScore,
    breakdown: {
      'Recency (0-100)': recencyScore,
      'Engagement (0-200+)': engagementScore,
      'Quality (0-100)': qualityScore,
      'Penalties': -penalties,
      'Author Boost': `×${(1 + authorMultiplier).toFixed(2)}`,
      'FINAL SCORE': finalScore.toFixed(2)
    }
  };
}
