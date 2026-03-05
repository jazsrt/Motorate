import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';
import { useFeed } from '../hooks/useFeed';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { PostSkeleton } from '../components/ui/Skeleton';
import { Plus, RefreshCw, Rss, TrendingUp, Camera, Crosshair, Zap, Trophy, Car, Award } from 'lucide-react';
import PostCard from '../components/PostCard';
import { SuggestedUsers } from '../components/SuggestedUsers';
import { useWeeklyMetrics } from '../hooks/useWeeklyMetrics';
import { CompetitiveRankBar } from '../components/feed/CompetitiveRankBar';
import { WeeklyRecapModal } from '../components/WeeklyRecapModal';


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
  const { posts, loading, error, refreshFeed } = useFeed(user?.id);
  const weeklyMetrics = useWeeklyMetrics(user?.id);
  const [activeFilter, setActiveFilter] = useState<'all' | 'posts' | 'spots' | 'reviews' | 'following'>(() => {
    try {
      const saved = sessionStorage.getItem(FEED_FILTER_KEY);
      if (saved === 'all' || saved === 'posts' || saved === 'spots') return saved;
      return 'all';
    } catch {
      return 'all';
    }
  });

  const [showRecap, setShowRecap] = useState(() => {
    try {
      const lastSeen = localStorage.getItem('motorate_recap_seen');
      if (!lastSeen) return true;
      return (Date.now() - parseInt(lastSeen)) / 86400000 >= 7;
    } catch { return false; }
  });

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
    if (activeFilter === 'following') {
      return [...posts];
    }
    return posts.filter(post => !SPOT_TYPES.has((post as any).post_type) && !(post as any).spot_history_id);
  }, [posts, activeFilter]);

  const recentHotVehicles = useMemo(() => {
    const vehicleMap = new Map<string, { name: string; location: string; spotCount: number; vehicleId: string }>();
    posts.forEach(post => {
      const v = post.vehicles;
      if (v?.id) {
        const key = v.id;
        const existing = vehicleMap.get(key);
        const name = [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Unknown Vehicle';
        if (existing) {
          existing.spotCount++;
        } else {
          vehicleMap.set(key, { name, location: (post as any).location || 'Nearby', spotCount: 1, vehicleId: v.id });
        }
      }
    });
    return Array.from(vehicleMap.values()).sort((a, b) => b.spotCount - a.spotCount).slice(0, 6);
  }, [posts]);


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

  const recentPostCount = posts.filter(p => new Date(p.created_at) > new Date(Date.now() - 60 * 60 * 1000)).length;

  return (
    <Layout currentPage="feed" onNavigate={onNavigate}>
      <div className="max-w-2xl mx-auto -mt-5 pb-20 page-enter">

        {/* Competitive Rank Bar (with badge nudge built in) */}
        {!weeklyMetrics.loading && weeklyMetrics.globalRank > 0 && (
          <CompetitiveRankBar
            rank={weeklyMetrics.globalRank}
            city="Chicago"
            totalUsers={weeklyMetrics.totalUsers}
            topPercent={weeklyMetrics.topPercent}
            spotsThisWeek={weeklyMetrics.spotsThisWeek}
            userId={user?.id}
          />
        )}

        {/* Hot Rail */}
        {recentHotVehicles.length > 0 && (
          <div className="mb-4 -mx-4 stg">
            <div className="px-4 mb-2.5 flex items-center gap-1.5">
              <Zap className="w-2.5 h-2.5" strokeWidth={1.4} style={{ color: 'var(--orange)' }} />
              <span className="text-[8px] font-semibold uppercase tracking-wider text-tertiary">Hot in Your Area</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
              {recentHotVehicles.map((card, i) => (
                <div
                  key={i}
                  className="card-v3 flex-shrink-0 w-[120px] overflow-hidden cursor-pointer active:scale-95 transition-transform"
                  onClick={() => card.vehicleId && onNavigate('vehicle-detail', { vehicleId: card.vehicleId })}
                >
                  <div className="h-[68px] flex items-center justify-center" style={{ background: 'var(--s2)' }}>
                    <Car className="w-6 h-6 opacity-40 text-quaternary" strokeWidth={0.8} />
                  </div>
                  <div className="p-2.5">
                    <p className="text-[8px] font-medium leading-tight text-primary">{card.name}</p>
                    <p className="text-[7px] mt-0.5 text-quaternary">{card.location}</p>
                    <p className="text-[7px] font-medium mt-1 font-mono" style={{ color: 'var(--orange)' }}>{card.spotCount} spots today</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 px-4 stg" style={{ scrollbarWidth: 'none' }}>
          {([
            { key: 'all',       label: 'All' },
            { key: 'spots',     label: 'Spots' },
            { key: 'reviews',   label: 'Full Spots' },
            { key: 'posts',     label: 'Posts' },
            { key: 'following', label: 'Following' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-all whitespace-nowrap tracking-wide ${
                activeFilter === key
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                  : 'text-quaternary border border-white/5 active:scale-95'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="stg">
          {/* Empty states */}
          {filteredPosts.length === 0 && posts.length === 0 && (
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

          {filteredPosts.length === 0 && posts.length > 0 && (
            <div className="py-16 text-center space-y-4">
              <Rss className="w-8 h-8 mx-auto text-quaternary" strokeWidth={1} />
              <div>
                <p className="text-[14px] font-medium text-secondary">
                  No {activeFilter !== 'all' ? activeFilter : ''} found
                </p>
                <p className="text-[11px] mt-1 text-tertiary">
                  {activeFilter !== 'all' ? 'Try a different filter' : 'Try adjusting your filters'}
                </p>
              </div>
              <button
                onClick={() => setActiveFilter('all')}
                className="text-[11px] font-medium uppercase tracking-wider transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                Show all posts
              </button>
            </div>
          )}

          {/* Posts Feed — SuggestedUsers injected after 2nd post */}
          {filteredPosts.length > 0 && (
            <div className="space-y-4">
              {filteredPosts.map((post, idx) => (
                <div key={post.id} className={`space-y-4 v3-stagger v3-stagger-${Math.min(idx + 2, 7)}`}>
                  <PostCard post={post as any} onNavigate={onNavigate} />
                  {idx === 1 && <SuggestedUsers onNavigate={onNavigate} />}
                  {idx === 4 && <BadgeEarnCard />}
                </div>
              ))}
            </div>
          )}
        </div>
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
