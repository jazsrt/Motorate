import { useState, useEffect, useCallback } from 'react';
import { loadFeedCursor, FeedPost, FeedCursor } from '../lib/feed';

interface UseFeedReturn {
  posts: Array<FeedPost & {
    id: string;
    author: { id: string; handle: string; avatar_url: string | null };
    view_count?: number;
  }>;
  loading: boolean;
  error: Error | null;
  refreshFeed: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => void;
}

export function useFeed(userId?: string): UseFeedReturn {
  const [posts, setPosts] = useState<UseFeedReturn['posts']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<FeedCursor | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);

  const loadPosts = useCallback(async (reset = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await loadFeedCursor(userId, 10, reset ? undefined : cursor);

      // Map posts with existing view_count from database (already included in feed query)
      const postsWithViews = result.posts.map(post => {
        // Resolve best image: post image > vehicle profile > stock
        const postImage = post.image_url || null;
        const vehicleProfileImage = post.vehicles?.profile_image_url || null;
        const vehicleStockImage = post.vehicles?.stock_image_url || null;
        const resolvedImage = postImage || vehicleProfileImage || vehicleStockImage || null;

        return {
          id: post.post_id,
          author_id: post.author_id,
          post_type: post.post_type,
          spot_type: post.spot_type,
          sentiment: post.sentiment,
          caption: post.caption,
          image_urls: resolvedImage ? [resolvedImage] : null,
          video_url: post.video_url || null,
          content_type: post.content_type || (post.video_url ? 'video' : 'image'),
          location: post.location_label,
          created_at: post.created_at,
          like_count: post.like_count,
          comment_count: post.comment_count,
          view_count: post.view_count || 0,
          vehicle_id: post.vehicle_id,
          rating_driver: post.rating_driver,
          rating_driving: post.rating_driving,
          rating_vehicle: post.rating_vehicle,
          looks_rating: post.looks_rating || null,
          sound_rating: post.sound_rating || null,
          condition_rating: post.condition_rating || null,
          vehicles: post.vehicles || null,
          author: {
            id: post.author_id,
            handle: post.author_handle || 'unknown',
            avatar_url: post.author_avatar_url
          },
          profiles: {
            verified: post.author_is_verified || false
          }
        };
      })

      // Safety net: filter out spot/review posts with no image
      .filter(p => {
        if (p.post_type === 'spot' || p.post_type === 'review') {
          return p.image_urls && p.image_urls.length > 0 && p.image_urls[0];
        }
        return true;
      });

      setPosts(reset ? postsWithViews as any : [...posts, ...postsWithViews] as any);
      setCursor(result.nextCursor || undefined);
      setHasMore(!!result.nextCursor);
    } catch (err) {
      console.error('Error loading feed:', err);
      setError(err instanceof Error ? err : new Error('Failed to load feed'));
    } finally {
      setLoading(false);
    }
  }, [userId, cursor, posts]);

  const refreshFeed = useCallback(async () => {
    setCursor(undefined);
    setHasMore(true);
    await loadPosts(true);
  }, [loadPosts]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadPosts(false);
    }
  }, [loading, hasMore, loadPosts]);

  useEffect(() => {
    if (userId) {
      loadPosts(true);
    }
  }, [userId, loadPosts]);

  return { posts, loading, error, refreshFeed, hasMore, loadMore };
}
