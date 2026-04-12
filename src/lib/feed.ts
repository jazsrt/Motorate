import { supabase } from './supabase';

/**
 * Feed post structure returned by the database function
 */
export interface AuthorBadge {
  id: string;
  name: string;
  icon: string;
  type: 'good' | 'bad' | 'status' | null;
}

export interface FeedPost {
  post_id: string;
  author_id: string;
  post_type: 'photo' | 'badge_given' | 'spot' | 'review';
  image_url: string | null;
  video_url?: string | null;
  content_type?: 'image' | 'video';
  caption: string | null;
  location_label: string | null;
  vehicle_id: string | null;
  badge_id: string | null;
  badge_icon_path: string | null;
  recipient_vehicle_id: string | null;
  created_at: string;
  privacy_level: string;
  moderation_status?: string;
  rejection_reason?: string | null;
  is_favorite: boolean;
  heat_score?: number;
  quality_score?: number;
  spot_type?: 'quick' | 'full' | null;
  sentiment?: 'love' | 'hate' | null;
  rating_vehicle?: number | null;
  rating_driver?: number | null;
  rating_driving?: number | null;
  looks_rating?: number | null;
  sound_rating?: number | null;
  condition_rating?: number | null;
  author_handle: string | null;
  author_avatar_url: string | null;
  author_location: string | null;
  author_role: string | null;
  author_is_verified: boolean | null;
  author_badges: AuthorBadge[];
  like_count: number;
  comment_count: number;
  user_liked: boolean;
  view_count?: number;
  vehicles?: {
    id: string;
    year: number | null;
    make: string | null;
    model: string | null;
    color: string | null;
    stock_image_url: string | null;
    profile_image_url: string | null;
    reputation_score: number | null;
    spots_count: number | null;
  } | null;
}

/**
 * Cursor for pagination
 */
export interface FeedCursor {
  timestamp: string;
  isFavorite: boolean;
}

/**
 * Result of loading feed with pagination
 */
export interface FeedResult {
  posts: FeedPost[];
  nextCursor: FeedCursor | null;
}

/**
 * Load user feed using cursor-based pagination (recommended for infinite scroll).
 *
 * This implementation uses an optimized approach:
 * - Queries the feed_posts_view for pre-joined data
 * - Filters out blocked users (bidirectional)
 * - Filters out muted users
 * - Uses cursor-based pagination for efficiency
 *
 * @param userId - The user ID to load feed for
 * @param limit - Number of posts to fetch (default: 20)
 * @param cursor - Optional cursor from previous page
 * @returns Feed posts and cursor for next page
 */
export async function loadFeedCursor(
  userId: string,
  limit = 20,
  cursor?: FeedCursor
): Promise<FeedResult> {
  const now = new Date().toISOString();

  let query = supabase
    .from('posts')
    .select(`
      id,
      author_id,
      post_type,
      spot_type,
      sentiment,
      image_url,
      video_url,
      content_type,
      caption,
      location_label,
      vehicle_id,
      badge_id,
      recipient_vehicle_id,
      created_at,
      published_at,
      privacy_level,
      moderation_status,
      heat_score,
      quality_score,
      rating_look,
      rating_sound,
      rating_condition,
      rating_driver,
      rating_driving,
      rating_vehicle,
      looks_rating,
      sound_rating,
      condition_rating,
      view_count,
      comment_count,
      author:profiles!posts_author_id_fkey(handle, avatar_url, location, is_admin),
      vehicles:vehicle_id(id, year, make, model, color, stock_image_url, profile_image_url, reputation_score, spots_count, ranking_multiplier)
    `)
    .order('created_at', { ascending: false })
    .limit(limit + 20);

  if (cursor?.timestamp) {
    query = query.lt('created_at', cursor.timestamp);
  }

  const { data, error} = await query;

  if (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }

  const allPosts = data || [];

  const blockedUserIds = await getBlockedUserIds(userId);

  const mutedUserIds = await getMutedUserIds(userId);

  const filteredPosts = allPosts.filter((post) => {
    const isPublished = !post.published_at || post.published_at <= now;
    const isNotBlocked = !blockedUserIds.has(post.author_id);
    const isNotMuted = !mutedUserIds.has(post.author_id);
    return isPublished && isNotBlocked && isNotMuted;
  });



  const visiblePosts = filteredPosts.slice(0, limit);
  const postIds = visiblePosts.map((p) => p.id);

  // Batch: count likes per post
  const { data: allReactions } = await supabase
    .from('reactions')
    .select('post_id, user_id')
    .in('post_id', postIds);

  const likeCounts: Record<string, number> = {};
  const userLiked: Record<string, boolean> = {};
  (allReactions || []).forEach((r) => {
    likeCounts[r.post_id] = (likeCounts[r.post_id] || 0) + 1;
    if (r.user_id === userId) userLiked[r.post_id] = true;
  });

  // Batch: count comments for posts missing comment_count
  const postsNeedingCommentCount = visiblePosts.filter((p) => p.comment_count == null).map((p) => p.id);
  const commentCounts: Record<string, number> = {};
  if (postsNeedingCommentCount.length > 0) {
    const { data: allComments } = await supabase
      .from('post_comments')
      .select('post_id')
      .in('post_id', postsNeedingCommentCount);
    (allComments || []).forEach((c) => {
      commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
    });
  }

  // Batch: fetch badge icon_path for badge posts
  const badgeIds = [...new Set(visiblePosts.map((p) => p.badge_id).filter(Boolean))] as string[];
  const badgeIconMap: Record<string, string> = {};
  if (badgeIds.length > 0) {
    const { data: badgeRows } = await supabase
      .from('badge_catalog')
      .select('id, icon_path')
      .in('id', badgeIds);
    (badgeRows || []).forEach((b: any) => {
      if (b.icon_path) badgeIconMap[b.id] = b.icon_path;
    });
  }

  const enrichedPosts = visiblePosts.map((post: any) => {
      try {
        const likeCount = likeCounts[post.id] || 0;
        const commentCount = post.comment_count ?? commentCounts[post.id] ?? 0;
        const userLike = userLiked[post.id] ? { id: 'exists' } : null;
        const statusBadges: AuthorBadge[] = [];

        return {
          post_id: post.id,
          author_id: post.author_id,
          post_type: post.post_type,
          spot_type: post.spot_type,
          sentiment: post.sentiment,
          image_url: post.image_url,
          video_url: post.video_url,
          content_type: post.content_type || 'image',
          caption: post.caption,
          location_label: post.location_label,
          vehicle_id: post.vehicle_id,
          badge_id: post.badge_id,
          badge_icon_path: post.badge_id ? (badgeIconMap[post.badge_id] || null) : null,
          recipient_vehicle_id: post.recipient_vehicle_id,
          created_at: post.created_at,
          privacy_level: post.privacy_level,
          moderation_status: post.moderation_status,
          rejection_reason: null,
          is_favorite: false,
          heat_score: post.heat_score || 0,
          quality_score: post.quality_score || 0,
          rating_driver: post.rating_driver,
          rating_driving: post.rating_driving,
          rating_vehicle: post.rating_vehicle,
          looks_rating: post.looks_rating || post.rating_look || null,
          sound_rating: post.sound_rating || post.rating_sound || null,
          condition_rating: post.condition_rating || post.rating_condition || null,
          author_handle: post.author?.handle || null,
          author_avatar_url: post.author?.avatar_url || null,
          author_location: post.author?.location || null,
          author_role: post.author?.is_admin ? 'admin' : 'user',
          author_is_verified: post.author?.is_admin || false,
          author_badges: statusBadges,
          like_count: likeCount || 0,
          comment_count: commentCount || 0,
          user_liked: !!userLike,
          view_count: post.view_count || 0,
          vehicles: post.vehicles || null
        };
      } catch (enrichError) {
        console.error('Error enriching post:', enrichError);
        // Return a basic version of the post if enrichment fails
        return {
          post_id: post.id,
          author_id: post.author_id,
          post_type: post.post_type,
          spot_type: post.spot_type,
          sentiment: post.sentiment,
          image_url: post.image_url,
          video_url: post.video_url,
          content_type: post.content_type || 'image',
          caption: post.caption,
          location_label: post.location_label,
          vehicle_id: post.vehicle_id,
          badge_id: post.badge_id,
          badge_icon_path: post.badge_id ? (badgeIconMap[post.badge_id] || null) : null,
          recipient_vehicle_id: post.recipient_vehicle_id,
          created_at: post.created_at,
          privacy_level: post.privacy_level,
          moderation_status: post.moderation_status,
          rejection_reason: null,
          is_favorite: false,
          heat_score: post.heat_score || 0,
          quality_score: post.quality_score || 0,
          rating_driver: post.rating_driver,
          rating_driving: post.rating_driving,
          rating_vehicle: post.rating_vehicle,
          looks_rating: post.looks_rating || post.rating_look || null,
          sound_rating: post.sound_rating || post.rating_sound || null,
          condition_rating: post.condition_rating || post.rating_condition || null,
          author_handle: post.author?.handle || null,
          author_avatar_url: post.author?.avatar_url || null,
          author_location: post.author?.location || null,
          author_role: post.author?.is_admin ? 'admin' : 'user',
          author_is_verified: post.author?.is_admin || false,
          author_badges: [],
          like_count: 0,
          comment_count: 0,
          user_liked: false,
          view_count: post.view_count || 0,
          vehicles: post.vehicles || null
        };
      }
    });

  const lastPost = enrichedPosts[enrichedPosts.length - 1];
  const nextCursor = lastPost ? {
    timestamp: lastPost.created_at,
    isFavorite: false
  } : null;

  const rankedPosts = applyRankingMultiplier(enrichedPosts);

  return { posts: rankedPosts as FeedPost[], nextCursor };
}

/**
 * Get all user IDs that are blocked by or have blocked the given user
 */
async function getBlockedUserIds(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

    if (error) {
      console.error('Error fetching blocked users:', error);
      // Don't throw - just return empty set
      return new Set();
    }

    const blockedIds = new Set<string>();
    (data || []).forEach((block) => {
      if (block.blocker_id === userId) {
        blockedIds.add(block.blocked_id);
      } else {
        blockedIds.add(block.blocker_id);
      }
    });

    return blockedIds;
  } catch (err) {
    console.error('getBlockedUserIds exception:', err);
    return new Set();
  }
}

/**
 * Get all user IDs that are muted by the given user
 */
async function getMutedUserIds(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('muted', true);

    if (error) {
      console.error('Error fetching muted users:', error);
      // Don't throw - just return empty set
      return new Set();
    }

    const result = new Set((data || []).map((follow) => follow.following_id));
    return result;
  } catch (err) {
    console.error('getMutedUserIds exception:', err);
    return new Set();
  }
}

/**
 * Apply ranking multiplier to sort feed posts by weighted engagement.
 * Posts with higher vehicle ranking_multiplier surface higher.
 * Falls back to 1.0 if multiplier is not set.
 */
function applyRankingMultiplier(posts: any[]): any[] {
  return posts.sort((a, b) => {
    const aMultiplier = a.vehicles?.ranking_multiplier ?? 1.0;
    const bMultiplier = b.vehicles?.ranking_multiplier ?? 1.0;
    const aScore = aMultiplier * ((a.like_count ?? 0) + 1);
    const bScore = bMultiplier * ((b.like_count ?? 0) + 1);
    return bScore - aScore;
  });
}

