import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';
import { useFeed } from '../hooks/useFeed';
import { FeedPostCard } from '../components/feed/FeedPostCard';
import { CompetitionStrip } from '../components/feed/CompetitionStrip';

interface NewFeedPageProps {
  onNavigate: OnNavigate;
}

export function NewFeedPage({ onNavigate }: NewFeedPageProps) {
  const { user, loading: authLoading } = useAuth();
  const { posts, loading, error, refreshFeed, hasMore, loadMore } = useFeed(user?.id);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState<'near' | 'following' | 'top'>('near');

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0, rootMargin: '400px' }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  // Filter to owner posts only. Fall back to all posts if filter returns empty.
  const ownerPosts = posts.filter(post => {
    const v = (post as any).vehicles;
    if (!v) return false;
    if (v.is_claimed && v.owner_id && post.author_id === v.owner_id) return true;
    if ((post as any).post_type === 'post') return true;
    return false;
  });
  // Aspirational filter — data may not be perfect yet, fall back to all posts
  const displayPosts = ownerPosts.length > 0 ? ownerPosts : posts;

  // Auth loading skeleton
  if (authLoading) {
    return (
      <Layout currentPage="feed" onNavigate={onNavigate}>
        <div>
          {[330, 315, 345].map((h, i) => (
            <div key={i} style={{ width: '100%', height: h + 48, background: '#0a0d14', marginTop: i > 0 ? 6 : 0, borderTop: i > 0 ? '1px solid rgba(249,115,22,0.15)' : 'none' }}>
              <div style={{ width: '100%', height: h, background: 'linear-gradient(90deg, #0a0d14 25%, #0e1320 50%, #0a0d14 75%)', backgroundSize: '200% 100%', animation: 'motorate-shimmer 1.5s infinite' }} />
            </div>
          ))}
        </div>
      </Layout>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <Layout currentPage="feed" onNavigate={onNavigate}>
        <div style={{ padding: '64px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', marginBottom: 8 }}>Welcome to MotoRate</p>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e', marginBottom: 24 }}>Sign in to see automotive content.</p>
          <button onClick={() => onNavigate('feed')} style={{ padding: '10px 24px', background: '#F97316', color: '#030508', border: 'none', borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Sign In
          </button>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout currentPage="feed" onNavigate={onNavigate}>
        <div style={{ padding: '64px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', marginBottom: 8 }}>Error Loading Feed</p>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e', marginBottom: 16 }}>{error.message}</p>
          <button onClick={refreshFeed} style={{ padding: '10px 24px', background: '#F97316', color: '#030508', border: 'none', borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="feed" onNavigate={onNavigate}>
      {/* Competition strip */}
      <CompetitionStrip />

      {/* Scope selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px 8px', background: 'rgba(6,9,14,0.97)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {(['Near Me', 'Following', 'Top Ranked'] as const).map((label, i) => {
          const key = (['near', 'following', 'top'] as const)[i];
          const isOn = scope === key;
          return (
            <button key={label} onClick={() => setScope(key)}
              style={{ flex: 1, textAlign: 'center', padding: '6px 0', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: isOn ? '#F97316' : '#5a6e7e', background: isOn ? 'rgba(249,115,22,0.09)' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: 5, transition: 'all 0.18s' }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {loading && posts.length === 0 && (
        <div>
          {[330, 315, 345].map((h, i) => (
            <div key={i} style={{ width: '100%', height: h + 48, background: '#0a0d14', marginTop: i > 0 ? 6 : 0, borderTop: i > 0 ? '1px solid rgba(249,115,22,0.15)' : 'none' }}>
              <div style={{ width: '100%', height: h, background: 'linear-gradient(90deg, #0a0d14 25%, #0e1320 50%, #0a0d14 75%)', backgroundSize: '200% 100%', animation: 'motorate-shimmer 1.5s infinite' }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {displayPosts.length === 0 && !loading && (
        <div style={{ padding: '64px 24px', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3a4e60" strokeWidth="1" style={{ margin: '0 auto 16px', display: 'block' }}>
            <circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
          </svg>
          <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', marginBottom: 8 }}>No Posts Yet</p>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e' }}>Own a car? Claim it and start posting.</p>
        </div>
      )}

      {/* Feed posts */}
      {displayPosts.length > 0 && (
        <div>
          {displayPosts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post as any}
              vehicleRank={null}
              currentUserId={user?.id}
              onNavigate={onNavigate}
            />
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} style={{ padding: '16px 0', display: 'flex', justifyContent: 'center' }}>
            {hasMore && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#F97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5a6e7e' }}>Loading</span>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes motorate-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}
