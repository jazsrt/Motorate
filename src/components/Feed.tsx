import { useEffect, useRef } from 'react';
import { useFeed } from '../hooks/useFeed';
import PostCard from './PostCard';
import LoadingSpinner from './ui/LoadingSpinner';
import { PostCardSkeleton } from './ui/PostCardSkeleton';

export default function Feed() {
  const { posts, loading, hasMore, loadMore } = useFeed();
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadMore]);

  return (
    <div className="space-y-4">
      {posts.map(post => <PostCard key={post.id} post={post} />)}
      {loading && posts.length === 0 && (
        <>
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </>
      )}
      {loading && posts.length > 0 && <LoadingSpinner />}
      {hasMore && <div ref={loadMoreRef} className="h-20" />}
      {!hasMore && posts.length > 0 && (
        <p className="text-center text-gray-500 py-8">You've reached the end!</p>
      )}
    </div>
  );
}
