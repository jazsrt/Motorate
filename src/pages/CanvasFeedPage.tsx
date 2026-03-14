import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { useFeed } from '../hooks/useFeed';
import { PostSkeleton } from '../components/ui/Skeleton';
import { Heart, MessageCircle, Share2, Crosshair, Car, Rss, RefreshCw, Camera, MoreHorizontal, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LiveStatsBar } from '../components/LiveStatsBar';
import { NotificationBell } from '../components/NotificationBell';
import { getTierFromScore } from '../lib/tierConfig';

interface CanvasFeedPageProps {
  onNavigate: OnNavigate;
}

export function CanvasFeedPage({ onNavigate }: CanvasFeedPageProps) {
  const { user, profile, loading: authLoading } = useAuth();
  const { posts, loading, error, refreshFeed, hasMore, loadMore } = useFeed(user?.id);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  // Load user's existing likes
  useEffect(() => {
    if (!user?.id || posts.length === 0) return;
    const postIds = posts.map(p => p.id);
    supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds)
      .then(({ data }) => {
        if (data) setLikedPosts(new Set(data.map(l => l.post_id)));
      });
  }, [user?.id, posts]);

  // Init like counts from posts
  useEffect(() => {
    const counts: Record<string, number> = {};
    posts.forEach(p => { counts[p.id] = p.like_count || 0; });
    setLikeCounts(prev => ({ ...prev, ...counts }));
  }, [posts]);

  // Track active card for loading more
  useEffect(() => {
    if (activeIndex >= posts.length - 3 && hasMore && !loading) {
      loadMore();
    }
  }, [activeIndex, posts.length, hasMore, loading, loadMore]);

  // Snap-scroll observer to detect active card
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cards = container.querySelectorAll('[data-card-index]');
    if (cards.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = parseInt((entry.target as HTMLElement).dataset.cardIndex || '0');
            setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [posts]);

  const handleLike = useCallback(async (postId: string) => {
    if (!user?.id) return;
    const isLiked = likedPosts.has(postId);

    // Optimistic update
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });
    setLikeCounts(prev => ({
      ...prev,
      [postId]: (prev[postId] || 0) + (isLiked ? -1 : 1),
    }));

    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
      }
    } catch {
      // Revert on error
      setLikedPosts(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      setLikeCounts(prev => ({
        ...prev,
        [postId]: (prev[postId] || 0) + (isLiked ? 1 : -1),
      }));
    }
  }, [user?.id, likedPosts]);

  const handleShare = useCallback(async (post: any) => {
    const vehicle = post.vehicles;
    const title = vehicle
      ? `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim()
      : 'Check this out on MotoRate';
    try {
      if (navigator.share) {
        await navigator.share({ title, text: post.caption || title, url: window.location.href });
      }
    } catch {}
  }, []);

  // Loading state
  if (authLoading || (loading && posts.length === 0)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="space-y-3 w-full max-w-sm px-4">
          <div className="skel h-[60vh] rounded-2xl" />
          <div className="skel h-4 w-3/4 rounded" />
          <div className="skel h-3 w-1/2 rounded" />
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
        <div className="text-center space-y-5">
          <Rss className="w-10 h-10 mx-auto" strokeWidth={1} style={{ color: 'var(--muted)' }} />
          <h2 className="text-lg font-display font-semibold" style={{ color: 'var(--white)' }}>Welcome to MotoRate</h2>
          <p className="text-sm" style={{ color: 'var(--subtle)' }}>Sign in to view the feed</p>
          <button
            onClick={() => onNavigate('feed')}
            className="px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-white"
            style={{ background: 'var(--accent)' }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
        <div className="text-center space-y-4">
          <Rss className="w-8 h-8 mx-auto" strokeWidth={1} style={{ color: 'var(--muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--light)' }}>Error loading feed</p>
          <button
            onClick={refreshFeed}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty feed
  if (posts.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
        <div className="text-center space-y-5">
          <Crosshair className="w-10 h-10 mx-auto" strokeWidth={1} style={{ color: 'var(--muted)' }} />
          <h2 className="text-lg font-display font-semibold" style={{ color: 'var(--white)' }}>No spots yet</h2>
          <p className="text-sm" style={{ color: 'var(--subtle)' }}>Be the first to spot a vehicle</p>
          <button
            onClick={() => onNavigate('scan')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-white"
            style={{ background: 'var(--accent)' }}
          >
            <Camera className="w-4 h-4" strokeWidth={2} />
            Spot a Ride
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0" style={{ background: 'var(--black)' }}>
      {/* Top bar — floating over canvas */}
      <div
        className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-5"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 48px)',
          paddingBottom: '12px',
          background: 'linear-gradient(to bottom, rgba(6,8,10,0.8) 0%, transparent 100%)',
        }}
      >
        <span
          className="font-display text-sm font-light uppercase"
          style={{ letterSpacing: '5px', color: 'var(--light)' }}
        >
          MOTORATE
        </span>
        <div className="flex items-center gap-3">
          <NotificationBell onNavigate={onNavigate} />
        </div>
      </div>

      {/* Canvas — snap scroll container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory hide-scrollbar"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {posts.map((post, idx) => {
          const vehicle = post.vehicles;
          const imageUrl =
            (post.image_urls && post.image_urls[0]) ||
            vehicle?.stock_image_url ||
            vehicle?.photo_url_1 ||
            null;

          const vehicleName = vehicle
            ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
            : '';
          const authorHandle = post.author?.handle || 'unknown';
          const isLiked = likedPosts.has(post.id);
          const likeCount = likeCounts[post.id] || post.like_count || 0;
          const commentCount = post.comment_count || 0;
          const viewCount = post.view_count || 0;

          return (
            <div
              key={post.id}
              data-card-index={idx}
              className="h-screen w-full relative snap-start snap-always flex-shrink-0"
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* Background image */}
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={vehicleName || 'Vehicle'}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading={idx < 3 ? 'eager' : 'lazy'}
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: 'var(--carbon-1)' }}
                >
                  <div style={{ width:'100%', height:'100%', background:'var(--carbon-2,#0e1320)' }} />
                </div>
              )}

              {/* Gradient overlays */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to top, rgba(6,8,10,0.95) 0%, rgba(6,8,10,0.4) 35%, transparent 55%)',
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, rgba(6,8,10,0.5) 0%, transparent 20%)',
                }}
              />

              {/* Right-side action bar */}
              <div className="absolute right-4 bottom-44 z-20 flex flex-col items-center gap-6">
                {/* Like */}
                <button
                  onClick={() => handleLike(post.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isLiked ? 'like-pop' : ''}`}
                    style={{
                      background: isLiked ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    <Heart
                      size={20}
                      strokeWidth={isLiked ? 0 : 1.5}
                      fill={isLiked ? 'var(--accent)' : 'none'}
                      style={{ color: isLiked ? 'var(--accent)' : 'var(--white)' }}
                    />
                  </div>
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--light)' }}>
                    {likeCount}
                  </span>
                </button>

                {/* Comment */}
                <button
                  onClick={() => onNavigate('post-detail', { postId: post.id })}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}
                  >
                    <MessageCircle size={20} strokeWidth={1.5} style={{ color: 'var(--white)' }} />
                  </div>
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--light)' }}>
                    {commentCount}
                  </span>
                </button>

                {/* Share */}
                <button
                  onClick={() => handleShare(post)}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}
                  >
                    <Share2 size={20} strokeWidth={1.5} style={{ color: 'var(--white)' }} />
                  </div>
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--light)' }}>
                    Share
                  </span>
                </button>
              </div>

              {/* Bottom info overlay */}
              <div className="absolute bottom-0 left-0 right-0 z-20 px-5" style={{ paddingBottom: 'max(100px, calc(90px + env(safe-area-inset-bottom)))' }}>
                {/* Author row */}
                <button
                  onClick={() => onNavigate('user-profile', post.author?.id)}
                  className="flex items-center gap-2.5 mb-3"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold uppercase"
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(8px)',
                      color: 'var(--white)',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    {authorHandle.charAt(0)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--white)' }}>
                      @{authorHandle}
                    </span>
                  </div>
                </button>

                {/* Vehicle info */}
                {vehicleName && (
                  <button
                    onClick={() => vehicle?.id && onNavigate('vehicle-detail', { vehicleId: vehicle.id })}
                    className="block mb-2"
                  >
                    <h2
                      className="font-display text-2xl font-bold uppercase"
                      style={{ color: 'var(--white)', letterSpacing: '1px', lineHeight: 1.1 }}
                    >
                      {vehicleName}
                    </h2>
                  </button>
                )}

                {/* Caption */}
                {post.caption && (
                  <p
                    className="text-[13px] leading-[1.5] mb-3 line-clamp-2"
                    style={{ color: 'var(--dim)' }}
                  >
                    {post.caption}
                  </p>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-4">
                  {viewCount > 0 && (
                    <span className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums" style={{ color: 'var(--subtle)' }}>
                      <Eye size={13} strokeWidth={1.5} />
                      {viewCount.toLocaleString()}
                    </span>
                  )}
                  {post.rating_vehicle != null && (
                    <span className="text-[11px] font-mono tabular-nums" style={{ color: 'var(--accent)' }}>
                      {post.rating_vehicle.toFixed(1)}/5
                    </span>
                  )}
                </div>
              </div>

              {/* Scroll indicator (first card only) */}
              {idx === 0 && posts.length > 1 && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 animate-bounce">
                  <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5">
                    <div className="w-1 h-2 rounded-full bg-white/50" />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Loading sentinel */}
        {hasMore && (
          <div className="h-screen flex items-center justify-center snap-start" style={{ background: 'var(--black)' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--subtle)' }}>
              <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              <span className="text-xs">Loading more...</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav — reused from Layout but rendered inline for canvas */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center"
        style={{
          background: 'rgba(6,8,10,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          padding: '8px 0',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-center w-full relative">
          {/* Feed */}
          <button onClick={() => {}} className="bot-nav-item active">
            <Rss size={22} strokeWidth={1.5} />
            <span>Feed</span>
          </button>

          {/* Rank */}
          <button onClick={() => onNavigate('rankings')} className="bot-nav-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21v-6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6"/><path d="M4 21v-4a2 2 0 0 1 2-2h0"/><path d="M18 21v-4a2 2 0 0 0-2-2h0"/><path d="M12 3l2 4h-4l2-4z"/></svg>
            <span>Rank</span>
          </button>

          {/* Spot FAB */}
          <div className="flex-1 flex justify-center" style={{ position: 'relative' }}>
            <button
              onClick={() => onNavigate('scan')}
              aria-label="Spot a vehicle"
              style={{
                position: 'absolute',
                top: '-28px',
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'var(--accent)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 28px rgba(249,115,22,0.5), 0 4px 14px rgba(0,0,0,0.6)',
                cursor: 'pointer',
              }}
            >
              <Crosshair size={24} strokeWidth={2} color="#fff" />
            </button>
          </div>

          {/* Garage */}
          <button onClick={() => onNavigate('my-garage')} className="bot-nav-item">
            <Car size={22} strokeWidth={1.5} />
            <span>Garage</span>
          </button>

          {/* Badges */}
          <button onClick={() => onNavigate('badges')} className="bot-nav-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
            <span>Badges</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
