import { useState, useEffect, useRef, useMemo } from 'react';
import { SlidersHorizontal, X, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';
import { useFeed } from '../hooks/useFeed';
import { FeedPostCard } from '../components/feed/FeedPostCard';
import { CompetitionStrip } from '../components/feed/CompetitionStrip';

interface NewFeedPageProps {
  onNavigate: OnNavigate;
}

const pillStyle = (active: boolean): React.CSSProperties => ({
  flexShrink: 0, padding: '5px 13px', borderRadius: 20,
  background: active ? 'rgba(249,115,22,0.12)' : 'rgba(10,13,20,0.9)',
  border: `1px solid ${active ? 'rgba(249,115,22,0.45)' : 'rgba(255,255,255,0.06)'}`,
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
  letterSpacing: '0.08em', textTransform: 'uppercase' as const,
  color: active ? '#F97316' : '#445566', cursor: 'pointer', whiteSpace: 'nowrap' as const,
});

export function NewFeedPage({ onNavigate }: NewFeedPageProps) {
  const { user, loading: authLoading } = useAuth();
  const { posts, loading, error, refreshFeed, hasMore, loadMore } = useFeed(user?.id);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterMake, setFilterMake] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'spots' | 'posts'>('all');

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

  // Extract available makes from loaded posts
  const availableMakes = useMemo(() => {
    const makes = new Set<string>();
    posts.forEach((p: any) => {
      if (p.vehicles?.make) makes.add(p.vehicles.make);
    });
    return Array.from(makes).sort();
  }, [posts]);

  // Client-side filtering
  const displayPosts = useMemo(() => {
    return posts.filter((p: any) => {
      if (filterMake && p.vehicles?.make !== filterMake) return false;
      if (filterType === 'spots' && p.post_type !== 'spot') return false;
      if (filterType === 'posts' && p.post_type === 'spot') return false;
      return true;
    });
  }, [posts, filterMake, filterType]);

  const hasActiveFilters = filterMake !== null || filterType !== 'all';

  // Auth loading skeleton
  if (authLoading) {
    return (
      <Layout currentPage="feed" onNavigate={onNavigate}>
        <div>
          {[300, 285, 315].map((h, i) => (
            <div key={i} style={{ width: '100%', height: h + 48, background: '#0a0d14', marginTop: i > 0 ? 4 : 0, borderTop: i > 0 ? '1px solid rgba(249,115,22,0.12)' : 'none' }}>
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

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#070a0f', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20,
            background: hasActiveFilters ? 'rgba(249,115,22,0.08)' : 'rgba(7,10,15,0.82)',
            border: `1px solid ${hasActiveFilters ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.07)'}`,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: hasActiveFilters ? '#F97316' : '#5a6e7e', cursor: 'pointer',
          }}
        >
          <SlidersHorizontal size={12} />
          <span>Filter</span>
          {hasActiveFilters && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F97316', flexShrink: 0 }} />}
        </button>

        {/* Type pills */}
        {(['All', 'Spots', 'Posts'] as const).map((label) => {
          const key = label.toLowerCase() as 'all' | 'spots' | 'posts';
          return (
            <button key={label} onClick={() => setFilterType(key)} style={pillStyle(filterType === key)}>
              {label}
            </button>
          );
        })}

        {/* Active make pill with clear */}
        {filterMake && (
          <button onClick={() => setFilterMake(null)} style={{ ...pillStyle(true), display: 'flex', alignItems: 'center', gap: 4 }}>
            {filterMake} <X size={10} />
          </button>
        )}
      </div>

      {/* Filter drawer */}
      {filterOpen && (
        <div style={{ padding: '12px 16px 14px', background: 'rgba(7,10,15,0.97)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#445566' }}>Filter by Make</span>
            {hasActiveFilters && (
              <button onClick={() => { setFilterMake(null); setFilterType('all'); }} style={{ background: 'none', border: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#F97316', cursor: 'pointer' }}>
                Clear All
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none' as const, paddingBottom: 2 }}>
            <button onClick={() => setFilterMake(null)} style={pillStyle(filterMake === null)}>All</button>
            {availableMakes.map(make => (
              <button key={make} onClick={() => setFilterMake(make)} style={pillStyle(filterMake === make)}>
                {make}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && posts.length === 0 && (
        <div>
          {[300, 285, 315].map((h, i) => (
            <div key={i} style={{ width: '100%', height: h + 48, background: '#0a0d14', marginTop: i > 0 ? 4 : 0, borderTop: i > 0 ? '1px solid rgba(249,115,22,0.12)' : 'none' }}>
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
          <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', marginBottom: 8 }}>
            {hasActiveFilters ? 'No Matching Posts' : 'No Posts Yet'}
          </p>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e' }}>
            {hasActiveFilters ? 'Try changing your filters.' : 'Own a car? Claim it and start posting.'}
          </p>
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

      {/* New Post FAB */}
      <button
        onClick={() => onNavigate('create-post')}
        aria-label="New Post"
        style={{
          position: 'fixed', bottom: 88, right: 16, zIndex: 30,
          width: 44, height: 44, borderRadius: 12,
          background: '#0a0d14', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}
      >
        <Plus size={20} strokeWidth={2} color="#F97316" />
      </button>

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
