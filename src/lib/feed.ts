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
 * Load user feed using offset-based pagination.
 *
 * This uses a single optimized database query that:
 * - Filters approved content only
 * - Excludes muted and blocked users
 * - Joins author profile data
 * - Marks favorite authors
 * - Sorts by favorites first, then by date
 *
 * @param userId - The user ID to load feed for
 * @param limit - Number of posts to fetch (default: 50)
 * @param offset - Offset for pagination (default: 0)
 * @returns Array of feed posts
 */
export async function loadFeed(
  userId: string,
  limit = 50,
  offset = 0
): Promise<FeedPost[]> {
  const { data, error } = await supabase.rpc('get_user_feed', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset
  });

  if (error) throw error;
  return data || [];
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

  const columnsSelected = [
    'id', 'author_id', 'post_type', 'image_url', 'video_url', 'content_type',
    'caption', 'location_label', 'vehicle_id', 'badge_id', 'recipient_vehicle_id',
    'created_at', 'published_at', 'privacy_level', 'moderation_status',
    'heat_score', 'quality_score', 'rating_look', 'rating_sound', 'rating_condition',
    'rating_driver', 'spot_type', 'sentiment', 'rating_vehicle', 'rating_driving',
    'looks_rating', 'sound_rating', 'condition_rating', 'author:profiles'
  ];

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
      vehicles:vehicle_id(id, year, make, model, color, stock_image_url, profile_image_url)
    `)
    .order('created_at', { ascending: false })
    .limit(limit + 100);

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

  const filteredPosts = allPosts.filter((post: any) => {
    const isOwnPost = post.author_id === userId;
    const isApproved = post.moderation_status === 'approved';
    const isPublished = !post.published_at || post.published_at <= now;
    const isNotBlocked = !blockedUserIds.has(post.author_id);
    const isNotMuted = !mutedUserIds.has(post.author_id);

    // Show if: (approved AND published) OR own post (regardless of status), AND not blocked/muted
    return ((isApproved && isPublished) || isOwnPost) && isNotBlocked && isNotMuted;
  });



  const enrichedPosts = await Promise.all(
    filteredPosts.slice(0, limit).map(async (post: any) => {
      try {

        const { count: likeCount } = await supabase
          .from('reactions')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // Use comment_count from database if available, otherwise count manually
        let commentCount = post.comment_count;
        if (commentCount === undefined || commentCount === null) {
          const { count } = await supabase
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          commentCount = count;
        }

        const { data: userLike } = await supabase
          .from('reactions')
          .select('*')
          .eq('post_id', post.id)
          .eq('user_id', userId)
          .maybeSingle();

        const { data: authorBadges, error: badgesError } = await supabase
          .from('user_inventory')
          .select(`
            badge_id,
            badges!inner(id, name, icon, type)
          `)
          .eq('user_id', post.author_id)
          .eq('badges.type', 'status');

        if (badgesError) {
          // Only log schema-related errors once per session
          const errorCode = badgesError.code || 'unknown';
          if (!sessionStorage.getItem(`badge_error_${errorCode}`)) {
            console.error('Badge loading error:', badgesError.message);
            sessionStorage.setItem(`badge_error_${errorCode}`, 'logged');
          }
        }

        const statusBadges: AuthorBadge[] = (authorBadges || []).map((item: any) => ({
          id: item.badges.id,
          name: item.badges.name,
          icon: item.badges.icon,
          type: item.badges.type
        }));

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
    })
  );

  const lastPost = enrichedPosts[enrichedPosts.length - 1];
  const nextCursor = lastPost ? {
    timestamp: lastPost.created_at,
    isFavorite: false
  } : null;

  return { posts: enrichedPosts, nextCursor };
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
    (data || []).forEach((block: any) => {
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

    const result = new Set((data || []).map((follow: any) => follow.following_id));
    return result;
  } catch (err) {
    console.error('getMutedUserIds exception:', err);
    return new Set();
  }
}

/**
 * Refresh feed - load from the beginning with cursor pagination
 */
export async function refreshFeed(
  userId: string,
  limit = 20
): Promise<FeedResult> {
  return loadFeedCursor(userId, limit);
}
