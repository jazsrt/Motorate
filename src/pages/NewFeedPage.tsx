import { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';
import { useFeed } from '../hooks/useFeed';
import { supabase } from '../lib/supabase';
import { FeedPostCard } from '../components/feed/FeedPostCard';
import { StoryRail } from '../components/feed/StoryRail';
import { FirstStepsCard } from '../components/FirstStepsCard';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

interface NewFeedPageProps {
  onNavigate: OnNavigate;
  focusPostId?: string;
}

const pillStyle = (active: boolean): React.CSSProperties => ({
  flexShrink: 0, padding: '4px 12px', borderRadius: 20,
  background: active ? 'rgba(249,115,22,0.10)' : 'transparent',
  border: `1px solid ${active ? 'rgba(249,115,22,0.40)' : 'rgba(255,255,255,0.06)'}`,
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase' as const,
  color: active ? '#F97316' : '#3a4e60', cursor: 'pointer', whiteSpace: 'nowrap' as const,
  transition: 'all 0.2s',
});

export function NewFeedPage({ onNavigate, focusPostId }: NewFeedPageProps) {
  const { user, loading: authLoading } = useAuth();
  const { posts, loading, error, refreshFeed, hasMore, loadMore } = useFeed(user?.id);
  const sentinelRef = useInfiniteScroll({ loading, hasMore, onLoadMore: loadMore, rootMargin: '300px' });
  const [filterType, setFilterType] = useState<'all' | 'following' | 'spots' | 'badges'>('all');
  const [focusPost, setFocusPost] = useState<any>(null);
  const [focusLoading, setFocusLoading] = useState(!!focusPostId);
  const [tickerItems, setTickerItems] = useState<{text: string, handle: string, detail: string, color: string, ts: string}[]>([]);
  const [showFirstSteps, setShowFirstSteps] = useState(false);

  useEffect(() => {
    if (!user) return;
    const dismissed = localStorage.getItem(`motorate_first_steps_dismissed_${user.id}`);
    if (!dismissed) setShowFirstSteps(true);
  }, [user]);

  useEffect(() => {
    async function loadTicker() {
      try {
        // Spots query
        const spotRes = await supabase
          .from('posts')
          .select('post_type, created_at, author:profiles!posts_author_id_fkey(handle), vehicles:vehicle_id(make, model)')
          .eq('post_type', 'spot')
          .eq('moderation_status', 'approved')
          .not('vehicle_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(10);

        // Badge earns — two-step (no FK from user_badges to badges)
        const badgeRes = await supabase
          .from('user_badges')
          .select('earned_at, badge_id, user:profiles!user_badges_user_id_fkey(handle)')
          .order('earned_at', { ascending: false })
          .limit(10);

        const badgeIds = (badgeRes.data || []).map((b: any) => b.badge_id).filter(Boolean);
        let badgeMap: Record<string, { name: string; tier: string | null }> = {};
        if (badgeIds.length > 0) {
          const { data: badgeNames } = await supabase
            .from('badges')
            .select('id, name, tier')
            .in('id', badgeIds);
          badgeMap = Object.fromEntries((badgeNames || []).map((b: any) => [b.id, b]));
        }

        const spots = (spotRes.data || []).map((s: any) => {
          const author = Array.isArray(s.author) ? s.author[0] : s.author;
          const vehicle = Array.isArray(s.vehicles) ? s.vehicles[0] : s.vehicles;
          const handle = author?.handle || 'someone';
          const detail = [vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || 'a vehicle';
          return { text: `@${handle} spotted ${detail}`, handle, detail, color: '#F97316', ts: s.created_at };
        });

        const badges = (badgeRes.data || []).map((b: any) => {
          const u = Array.isArray(b.user) ? b.user[0] : b.user;
          const handle = u?.handle || 'someone';
          const info = badgeMap[b.badge_id];
          const detail = info ? [info.name, info.tier].filter(Boolean).join(' ') : 'a badge';
          return { text: `@${handle} earned ${detail}`, handle, detail, color: '#f0a030', ts: b.earned_at };
        });

        const combined = [...spots, ...badges]
          .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
          .slice(0, 15);

        if (combined.length > 0) {
          setTickerItems([...combined, ...combined]);
        }
      } catch (err) {
        console.error('[NewFeedPage] Ticker load failed:', err);
      }
    }
    loadTicker();
  }, []);

  useEffect(() => {
    if (!focusPostId) return;
    setFocusLoading(true);
    supabase
      .from('posts')
      .select(`
        id, author_id, post_type, spot_type, sentiment, caption, image_url, video_url, content_type,
        location_label, vehicle_id, created_at, view_count, comment_count,
        review_id,
        rating_driver, rating_driving, rating_vehicle, looks_rating, sound_rating, condition_rating,
        author:profiles!posts_author_id_fkey(handle, avatar_url, is_admin),
        vehicles:vehicle_id(id, year, make, model, color, owner_id, stock_image_url, profile_image_url, reputation_score, spots_count)
      `)
      .eq('id', focusPostId)
      .eq('moderation_status', 'approved')
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) { setFocusLoading(false); return; }
        const author = Array.isArray(data.author) ? data.author[0] : data.author;
        const vehicles = Array.isArray(data.vehicles) ? data.vehicles[0] : data.vehicles;
        const postImage = data.image_url || null;
        const vehicleImage = vehicles?.profile_image_url || vehicles?.stock_image_url || null;
        const { data: reactions } = await supabase.from('reactions').select('user_id').eq('post_id', data.id);
        setFocusPost({
          id: data.id, author_id: data.author_id, post_type: data.post_type, spot_type: data.spot_type,
          sentiment: data.sentiment, caption: data.caption,
          image_urls: (postImage || vehicleImage) ? [postImage || vehicleImage] : null,
          video_url: data.video_url || null, content_type: data.content_type || (data.video_url ? 'video' : 'image'),
          location: data.location_label, created_at: data.created_at,
          like_count: reactions?.length || 0, comment_count: data.comment_count || 0,
          view_count: data.view_count || 0, vehicle_id: data.vehicle_id, review_id: data.review_id,
          rating_driver: data.rating_driver, rating_driving: data.rating_driving, rating_vehicle: data.rating_vehicle,
          looks_rating: data.looks_rating, sound_rating: data.sound_rating, condition_rating: data.condition_rating,
          vehicles: vehicles || null,
          author: { id: data.author_id, handle: author?.handle || 'unknown', avatar_url: author?.avatar_url || null },
          profiles: { verified: author?.is_admin || false },
        });
        setFocusLoading(false);
      });
  }, [focusPostId]);

  // Client-side filtering
  const displayPosts = useMemo(() => {
    return posts.filter((p: any) => {
      if (filterType === 'spots' && p.post_type !== 'spot') return false;
      if (filterType === 'following' && p.post_type === 'spot') return false;
      if (filterType === 'badges' && p.post_type !== 'badge' && p.post_type !== 'badge_given') return false;
      return true;
    });
  }, [posts, filterType]);

  const _hasActiveFilters = filterType !== 'all';

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
      {/* First Steps onboarding card — shown until dismissed */}
      {showFirstSteps && user && (
        <FirstStepsCard
          userId={user.id}
          onNavigate={onNavigate}
          onDismiss={() => {
            localStorage.setItem(`motorate_first_steps_dismissed_${user.id}`, 'true');
            setShowFirstSteps(false);
          }}
        />
      )}

      {/* Story rail — vehicles the user tracks */}
      {user && <StoryRail onNavigate={onNavigate} />}


      {/* Live activity ticker */}
      {tickerItems.length > 0 && (
        <div style={{
          height: 26, background: 'rgba(6,9,14,0.98)',
          borderBottom: '1px solid rgba(249,115,22,0.10)',
          display: 'flex', alignItems: 'center', overflow: 'hidden', flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', gap: 28, padding: '0 16px',
            whiteSpace: 'nowrap',
            animation: `tick ${tickerItems.length * 2}s linear infinite`,
          }}>
            {tickerItems.map((item, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', color: '#5a6e7e' }}>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span>@<b style={{ color: '#9aaebc', fontWeight: 700 }}>{item.handle}</b>{' '}{item.color === '#F97316' ? 'spotted' : 'earned'}{' '}<b style={{ color: '#9aaebc', fontWeight: 700 }}>{item.detail}</b></span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 14px', background: '#0a0d14', borderBottom: '1px solid rgba(255,255,255,0.04)', overflowX: 'auto', scrollbarWidth: 'none' as const }}>
        {([
          { key: 'all' as const, label: 'All' },
          { key: 'following' as const, label: 'Following' },
          { key: 'spots' as const, label: 'Spots' },
          { key: 'badges' as const, label: 'Badges' },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => setFilterType(key)} style={pillStyle(filterType === key)}>
            {label}
          </button>
        ))}
      </div>

      {/* Focused post (from shared link) */}
      {focusPostId && focusLoading && (
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ width: 20, height: 20, margin: '0 auto', border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#F97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
      {focusPost && (
        <div>
          <div style={{ padding: '10px 16px 6px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
            Shared Post
          </div>
          <FeedPostCard
            post={focusPost}
            vehicleRank={null}
            currentUserId={user?.id}
            onNavigate={onNavigate}
          />
          <div style={{ height: 2, background: 'rgba(249,115,22,0.15)', margin: '4px 0' }} />
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e2a38" strokeWidth="1.5" style={{ marginBottom: 16, display: 'block' }}>
            <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect width="13" height="8" x="9" y="13" rx="2"/>
          </svg>
          <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8', marginBottom: 6 }}>
            {filterType === 'following' ? 'Nothing Here Yet'
              : filterType === 'spots' ? 'No Spots Yet'
              : filterType === 'badges' ? 'No Badge Events Yet'
              : 'No Posts Yet'}
          </p>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e', lineHeight: 1.5, marginBottom: 20 }}>
            {filterType === 'following' ? 'Follow vehicles to see their activity here.'
              : filterType === 'spots' ? 'Spotted vehicles will appear here.'
              : filterType === 'badges' ? 'Badge events from the community will show up here.'
              : <>Spot a car or claim yours<br />to get started.</>}
          </p>
          {filterType === 'following' ? (
            <button onClick={() => onNavigate('search')} style={{ padding: '10px 24px', background: '#F97316', color: '#030508', border: 'none', borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>
              Explore Vehicles
            </button>
          ) : filterType === 'spots' ? (
            <button onClick={() => onNavigate('scan')} style={{ padding: '10px 24px', background: '#F97316', color: '#030508', border: 'none', borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>
              Spot a Vehicle
            </button>
          ) : filterType === 'all' ? (
            <button onClick={() => onNavigate('scan')} style={{ padding: '10px 24px', background: '#F97316', color: '#030508', border: 'none', borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>
              Spot a Car
            </button>
          ) : null}
        </div>
      )}

      {/* Feed posts */}
      {displayPosts.length > 0 && (
        <div className="page-enter">
          {displayPosts.map((post, i) => (
            <div key={post.id} className={i < 7 ? `v3-stagger v3-stagger-${i + 1}` : undefined}>
              <FeedPostCard
                post={post as unknown as Parameters<typeof FeedPostCard>[0]['post']}
                vehicleRank={null}
                currentUserId={user?.id}
                onNavigate={onNavigate}
              />
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} style={{ padding: '16px 0', display: 'flex', justifyContent: 'center' }}>
            {loading && posts.length > 0 && (
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
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 16px', borderRadius: 12,
          background: '#F97316', border: 'none',
          cursor: 'pointer', boxShadow: '0 4px 20px rgba(249,115,22,0.35)',
        }}
      >
        <Plus size={16} strokeWidth={2.5} color="#030508" />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#030508' }}>Post</span>
      </button>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes tick {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </Layout>
  );
}
