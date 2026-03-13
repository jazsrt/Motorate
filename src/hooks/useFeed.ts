import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
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
  const [posts, setPosts] = useState<any[]>([]);
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

      const result = await loadFeedCursor(userId, 20, reset ? undefined : cursor);

      // Map posts with existing view_count from database (already included in feed query)
      const postsWithViews = result.posts.map(post => {
        return {
          id: post.post_id,
          author_id: post.author_id,
          post_type: post.post_type,
          spot_type: post.spot_type,
          sentiment: post.sentiment,
          caption: post.caption,
          image_urls: post.image_url ? [post.image_url] : null,
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
          looks_rating: post.looks_rating || post.rating_look || null,
          sound_rating: post.sound_rating || post.rating_sound || null,
          condition_rating: post.condition_rating || post.rating_condition || null,
          vehicles: post.vehicles || null,
          author: {
            id: post.author_id,
            handle: post.author_handle || 'Spotter',
            avatar_url: post.author_avatar_url
          },
          profiles: {
            verified: post.author_is_verified || false
          }
        };
      });

      setPosts(reset ? postsWithViews : [...posts, ...postsWithViews]);
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
  }, [userId]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadPosts(false);
    }
  }, [loading, hasMore, loadPosts]);

  useEffect(() => {
    if (userId) {
      loadPosts(true);
    }
  }, [userId]);

  return { posts, loading, error, refreshFeed, hasMore, loadMore };
}
