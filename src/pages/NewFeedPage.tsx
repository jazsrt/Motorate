import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';
import { useFeed } from '../hooks/useFeed';
import { PostSkeleton } from '../components/ui/Skeleton';
import { RefreshCw, Rss, Camera, Zap, Award, SlidersHorizontal } from 'lucide-react';
import { StreamPostCard } from '../components/feed/StreamPostCard';
import { SuggestedUsers } from '../components/SuggestedUsers';
import { useWeeklyMetrics } from '../hooks/useWeeklyMetrics';
import { WeeklyRecapModal } from '../components/WeeklyRecapModal';
import { NearMissBadgeNudge } from '../components/NearMissBadgeNudge';
import { getVehicleImage } from '../lib/vehicleUtils';

interface NewFeedPageProps {
  onNavigate: OnNavigate;
}

const FEED_FILTER_KEY = 'motorate_feed_filter';

function BadgeEarnCard() {
  return (
    <div
      className="card-v3 flex items-center gap-3 px-4 py-3"
      style={{
        background: 'linear-gradient(135deg, rgba(249,115,22,0.08), var(--s1) 40%, var(--s2) 100%)',
        border: '1px solid rgba(249,115,22,0.15)',
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(145deg, var(--gold-l), var(--gold-m) 40%, var(--gold-h) 55%, var(--gold-m) 70%, var(--gold-l))' }}
      >
        <Award className="w-4 h-4" strokeWidth={1.2} style={{ color: '#1a1400' }} />
      </div>
      <div>
        <p className="text-[7px] font-bold uppercase tracking-wider" style={{ color: 'var(--orange)' }}>Badge Earned</p>
        <p className="text-[11px] mt-0.5 text-primary">
          A community member just earned a new badge!
        </p>
      </div>
    </div>
  );
}

export function NewFeedPage({ onNavigate }: NewFeedPageProps) {
  const { user, loading: authLoading } = useAuth();
  const { posts, loading, error, refreshFeed, hasMore, loadMore } = useFeed(user?.id);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [feedMode, setFeedMode] = useState<'canvas' | 'stream'>('stream');

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0, rootMargin: '400px' }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  const weeklyMetrics = useWeeklyMetrics(user?.id);
  const [activeFilter, setActiveFilter] = useState<'all' | 'posts' | 'spots' | 'reviews' | 'following'>(() => {
    try {
      const saved = sessionStorage.getItem(FEED_FILTER_KEY);
      if (saved === 'all' || saved === 'posts' || saved === 'spots') return saved;
      return 'all';
    } catch { return 'all'; }
  });

  const [showRecap, setShowRecap] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(FEED_FILTER_KEY, activeFilter);
  }, [activeFilter]);

  const filteredPosts = useMemo(() => {
    if (activeFilter === 'all') return [...posts];
    const SPOT_TYPES = new Set(['spot', 'review', 'claim']);
    if (activeFilter === 'spots') {
      return posts.filter(post => (post as any).post_type === 'spot' || !!(post as any).spot_history_id);
    }
    if (activeFilter === 'reviews') {
      return posts.filter(post => (post as any).post_type === 'review' || !!(post as any).review_id);
    }
    if (activeFilter === 'following') return [...posts];
    return posts.filter(post => !SPOT_TYPES.has((post as any).post_type) && !(post as any).spot_history_id);
  }, [posts, activeFilter]);

  // Story rail: top 5 vehicles from feed
  const storyVehicles = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ id: string; name: string; imageUrl: string | null }> = [];
    for (const post of posts) {
      const v = post.vehicles;
      if (!v?.id || seen.has(v.id)) continue;
      seen.add(v.id);
      const img = getVehicleImage(v as any, 'stock');
      result.push({
        id: v.id,
        name: (v.make || v.model || 'Vehicle').slice(0, 8),
        imageUrl: img,
      });
      if (result.length >= 5) break;
    }
    return result;
  }, [posts]);

  // Check seen stories
  const isStorySeen = (vehicleId: string) => {
    try {
      return localStorage.getItem(`story_seen_${vehicleId}`) === '1';
    } catch { return false; }
  };

  const markStorySeen = (vehicleId: string) => {
    try { localStorage.setItem(`story_seen_${vehicleId}`, '1'); } catch {}
  };

  if (authLoading) {
    return (
      <Layout currentPage="feed" onNavigate={onNavigate}>
        <div className="max-w-2xl mx-auto space-y-3"><PostSkeleton /><PostSkeleton /></div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout currentPage="feed" onNavigate={onNavigate}>
        <div className="max-w-lg mx-auto py-16 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-2)' }}>
            <Rss className="w-7 h-7 text-tertiary" strokeWidth={1.2} />
          </div>
          <div>
            <h2 className="text-[18px] font-semibold text-white">Welcome to MotoRate</h2>
            <p className="text-[13px] mt-2 leading-[1.65] text-secondary">Join the community to see automotive content, share your rides, and connect with enthusiasts.</p>
          </div>
          <button onClick={() => onNavigate('feed')} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all active:scale-95" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
            Sign In to View Feed
          </button>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout currentPage="feed" onNavigate={onNavigate}>
        <div className="max-w-2xl mx-auto space-y-3"><PostSkeleton /><PostSkeleton /><PostSkeleton /></div>
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
          <button onClick={refreshFeed} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all active:scale-95" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />Try Again
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="feed" onNavigate={onNavigate}>
      <div className="max-w-2xl mx-auto pb-20 animate-page-enter">

        {/* ── ROW 1: LOGO BAR ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--black, #030508)', padding: '10px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--white, #f2f4f7)' }}>
              MOTO<span style={{ color: 'var(--accent, #F97316)' }}>R</span>ATE
            </span>
          </div>

          {/* ── ROW 2: MODE TOGGLE + CONTROLS ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            {/* Mode toggle pill */}
            <div style={{
              display: 'flex',
              background: 'rgba(7,10,15,0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20,
              padding: 2,
            }}>
              {(['Canvas', 'Stream'] as const).map(mode => {
                const isActive = feedMode === mode.toLowerCase();
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      if (mode === 'Canvas') onNavigate('post-detail');
                      else setFeedMode('stream');
                    }}
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      padding: '4px 11px',
                      borderRadius: 16,
                      border: 'none',
                      cursor: 'pointer',
                      background: isActive ? 'var(--accent, #F97316)' : 'transparent',
                      color: isActive ? '#030508' : 'var(--dim, #6a7486)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>

            {/* Right: filter + location */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontFamily: '"Barlow Condensed", sans-serif', fontSize: 9, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.12em',
                padding: '4px 11px', borderRadius: 16,
                background: 'rgba(7,10,15,0.85)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'var(--dim, #6a7486)', cursor: 'pointer',
              }}>
                <SlidersHorizontal size={10} />FILTER
              </button>
              <span style={{
                fontFamily: '"Barlow Condensed", sans-serif', fontSize: 9, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.12em',
                padding: '4px 11px', borderRadius: 16,
                border: '1px solid var(--accent, #F97316)',
                color: 'var(--accent, #F97316)',
              }}>
                LOCAL
              </span>
            </div>
          </div>
        </div>

        {/* ── STORY RAIL ── */}
        {storyVehicles.length > 0 && (
          <div style={{ display: 'flex', gap: 10, padding: '0 14px 14px', overflowX: 'auto', scrollbarWidth: 'none' as any }}>
            {storyVehicles.map(sv => {
              const seen = isStorySeen(sv.id);
              return (
                <div
                  key={sv.id}
                  onClick={() => {
                    markStorySeen(sv.id);
                    onNavigate('vehicle-detail', { vehicleId: sv.id });
                  }}
                  style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}
                >
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%', padding: 2,
                    background: seen ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--accent, #F97316), #ff6000)',
                  }}>
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
                      border: '2px solid var(--black, #030508)',
                      background: 'var(--carbon-1, #0a0d14)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {sv.imageUrl ? (
                        <img src={sv.imageUrl} alt={sv.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'var(--carbon-2, #0e1320)' }} />
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontFamily: '"Barlow Condensed", sans-serif', fontSize: 8, fontWeight: 700,
                    textTransform: 'uppercase', color: 'var(--dim, #6a7486)',
                    maxWidth: 62, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}>
                    {sv.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Near-Miss Badge Nudge */}
        <NearMissBadgeNudge userId={user?.id} />

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 px-4" style={{ scrollbarWidth: 'none' }}>
          {([
            { key: 'all', label: 'All' },
            { key: 'spots', label: 'Spots' },
            { key: 'reviews', label: 'Full Spots' },
            { key: 'posts', label: 'Posts' },
            { key: 'following', label: 'Following' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`text-[11px] font-semibold px-4 py-1.5 rounded-full transition-all whitespace-nowrap tracking-wide ${
                activeFilter === key
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                  : 'text-quaternary border border-white/5 active:scale-95'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Empty states */}
        {filteredPosts.length === 0 && posts.length === 0 && (
          <div className="py-16 text-center space-y-4">
            <Rss className="w-8 h-8 mx-auto text-quaternary" strokeWidth={1} />
            <div>
              <p className="text-[14px] font-medium text-secondary">No activity yet</p>
              <p className="text-[11px] mt-1 text-tertiary">Spot your first vehicle to get started</p>
            </div>
            <button onClick={() => onNavigate('scan')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 text-white" style={{ background: 'linear-gradient(135deg, var(--orange), var(--gold-h))' }}>
              <Camera className="w-3.5 h-3.5" strokeWidth={2} />Spot a Ride
            </button>
          </div>
        )}

        {filteredPosts.length === 0 && posts.length > 0 && (
          <div className="py-16 text-center space-y-4">
            <Rss className="w-8 h-8 mx-auto text-quaternary" strokeWidth={1} />
            <div>
              <p className="text-[14px] font-medium text-secondary">No {activeFilter !== 'all' ? activeFilter : ''} found</p>
              <p className="text-[11px] mt-1 text-tertiary">{activeFilter !== 'all' ? 'Try a different filter' : 'Try adjusting your filters'}</p>
            </div>
            <button onClick={() => setActiveFilter('all')} className="text-[11px] font-medium uppercase tracking-wider transition-colors" style={{ color: 'var(--accent)' }}>Show all posts</button>
          </div>
        )}

        {/* Posts Feed — StreamPostCard */}
        {filteredPosts.length > 0 && (
          <div className="space-y-4">
            {filteredPosts.map((post, idx) => (
              <div key={post.id} className="space-y-4">
                <StreamPostCard
                  post={{
                    id: post.id,
                    created_at: post.created_at,
                    author_id: (post as any).author_id,
                    vehicle_id: (post as any).vehicle_id,
                    vehicles: post.vehicles as any,
                    author_handle: (post as any).author?.handle ?? (post as any).author_handle,
                    author_avatar_url: (post as any).author?.avatar_url ?? (post as any).author_avatar_url,
                    profiles: {
                      id: (post as any).author_id,
                      handle: (post as any).author?.handle ?? (post as any).author_handle,
                      avatar_url: (post as any).author?.avatar_url ?? (post as any).author_avatar_url,
                      reputation_score: (post as any).profiles?.reputation_score ?? null,
                    },
                    like_count: (post as any).like_count,
                    comment_count: (post as any).comment_count,
                    view_count: (post as any).view_count,
                  }}
                  currentUserId={user?.id}
                  onNavigate={onNavigate}
                />
                {idx === 1 && <SuggestedUsers onNavigate={onNavigate} />}
                {idx === 4 && <BadgeEarnCard />}
              </div>
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

      {showRecap && (
        <WeeklyRecapModal
          rank={weeklyMetrics?.globalRank || 0}
          previousRank={weeklyMetrics?.previousRank || 0}
          location="Chicago"
          spotsThisWeek={weeklyMetrics?.spotsThisWeek || 0}
          reviewsThisWeek={weeklyMetrics?.reviewsThisWeek || 0}
          badgesThisWeek={0}
          onClose={() => {
            setShowRecap(false);
            localStorage.setItem('motorate_recap_seen', Date.now().toString());
          }}
        />
      )}
    </Layout>
  );
}
