import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';
import { useFeed } from '../hooks/useFeed';
import { PostSkeleton } from '../components/ui/Skeleton';
import { RefreshCw, Rss, Camera } from 'lucide-react';
import PostCard from '../components/PostCard';

interface NewFeedPageProps {
  onNavigate: OnNavigate;
}

export function NewFeedPage({ onNavigate }: NewFeedPageProps) {
  const { user, loading: authLoading } = useAuth();
  const { posts, loading, error, refreshFeed, hasMore, loadMore } = useFeed(user?.id);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll: observe sentinel element at end of feed
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0, rootMargin: '400px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  if (authLoading) {
    return (
      <Layout currentPage="feed" onNavigate={onNavigate}>
        <div className="max-w-2xl mx-auto space-y-3">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout currentPage="feed" onNavigate={onNavigate}>
        <div className="max-w-lg mx-auto py-16 text-center space-y-6">
          <div
            className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center border"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--border-2)' }}
          >
            <Rss className="w-7 h-7 text-tertiary" strokeWidth={1.2} />
          </div>
          <div>
            <h2 className="text-[18px] font-semibold text-white">
              Welcome to MotoRate
            </h2>
            <p className="text-[13px] mt-2 leading-[1.65] text-secondary">
              Join the community to see automotive content, share your rides, and connect with enthusiasts.
            </p>
          </div>
          <button
            onClick={() => onNavigate('feed')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all active:scale-95"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            Sign In to View Feed
          </button>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout currentPage="feed" onNavigate={onNavigate}>
        <div className="max-w-2xl mx-auto space-y-3">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentPage="feed" onNavigate={onNavigate}>
        <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
          <Rss className="w-8 h-8 mx-auto text-quaternary" strokeWidth={1} />
          <p className="text-[14px] font-medium text-secondary">Error loading feed</p>
          <p className="text-[11px] text-tertiary">{error.message}</p>
          <button
            onClick={refreshFeed}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all active:scale-95"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
            Try Again
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="feed" onNavigate={onNavigate}>
      <div className="max-w-2xl mx-auto pb-20">
        {/* Empty state */}
        {posts.length === 0 && (
          <div className="py-16 text-center space-y-4">
            <Rss className="w-8 h-8 mx-auto text-quaternary" strokeWidth={1} />
            <div>
              <p className="text-[14px] font-medium text-secondary">No activity yet</p>
              <p className="text-[11px] mt-1 text-tertiary">
                Spot your first vehicle to get started
              </p>
            </div>
            <button
              onClick={() => onNavigate('scan')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 text-white"
              style={{ background: 'linear-gradient(135deg, var(--orange), var(--gold-h))' }}
            >
              <Camera className="w-3.5 h-3.5" strokeWidth={2} />
              Spot a Ride
            </button>
          </div>
        )}

        {/* Posts list */}
        {posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post as any} onNavigate={onNavigate} />
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={loadMoreRef} className="py-4 flex justify-center">
              {hasMore && (
                <div className="flex items-center gap-2 text-tertiary">
                  <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                  <span className="text-[11px]">Loading more...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
