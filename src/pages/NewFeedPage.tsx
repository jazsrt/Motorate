import { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';
import { useFeed } from '../hooks/useFeed';
import { supabase } from '../lib/supabase';
import { FeedPostCard } from '../components/feed/FeedPostCard';
import { StoryRail } from '../components/feed/StoryRail';
import { AchievementCarousel } from '../components/feed/AchievementCarousel';
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
});

export function NewFeedPage({ onNavigate, focusPostId }: NewFeedPageProps) {
  const { user, loading: authLoading } = useAuth();
  const { posts, loading, error, refreshFeed, hasMore, loadMore } = useFeed(user?.id);
  const sentinelRef = useInfiniteScroll({ loading, hasMore, onLoadMore: loadMore, rootMargin: '300px' });
  const [filterType, setFilterType] = useState<'all' | 'following' | 'spots' | 'badges'>('all');
  const [focusPost, setFocusPost] = useState<any>(null);
  const [focusLoading, setFocusLoading] = useState(!!focusPostId);

  useEffect(() => {
    if (!focusPostId) return;
    setFocusLoading(true);
    supabase
      .from('posts')
      .select(`
        id, author_id, post_type, spot_type, sentiment, caption, image_url, video_url, content_type,
        location_label, vehicle_id, created_at, view_count, comment_count,
        rating_driver, rating_driving, rating_vehicle, looks_rating, sound_rating, condition_rating,
        author:profiles!posts_author_id_fkey(handle, avatar_url, is_admin),
        vehicles:vehicle_id(id, year, make, model, color, plate_state, plate_number, stock_image_url, profile_image_url, reputation_score, spots_count)
      `)
      .eq('id', focusPostId)
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
          view_count: data.view_count || 0, vehicle_id: data.vehicle_id,
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

  const hasActiveFilters = filterType !== 'all';

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
      {/* Story rail — vehicles the user tracks */}
      {user && <StoryRail onNavigate={onNavigate} />}

      {/* Achievement carousel */}
      <AchievementCarousel />

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
          <div style={{ padding: '10px 16px 6px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316' }}>
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
        <div>
          {displayPosts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post as unknown as Parameters<typeof FeedPostCard>[0]['post']}
              vehicleRank={null}
              currentUserId={user?.id}
              onNavigate={onNavigate}
            />
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
