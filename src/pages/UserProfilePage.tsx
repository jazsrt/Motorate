import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { VEHICLE_PUBLIC_COLUMNS } from '../lib/vehicles';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { ArrowLeft, Car, Award, Instagram, Music, Eye, MessageCircle, Calendar, Lock, Flag, Image, ImageIcon, MapPin } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { TierBadge } from '../components/TierBadge';
import { VerifiedBadge } from '../components/VerifiedBadge';
// Badge import removed - unused
import { BadgeCoin } from '../components/BadgeCoin';
import { ReactionButton } from '../components/ReactionButton';
// DashLight, DigitalDisplay imports removed - unused
import { FollowButton } from '../components/FollowButton';
import { BlockUserButton } from '../components/BlockUserButton';
import { ReportModal } from '../components/ReportModal';
import { PrivacyGate } from '../components/PrivacyGate';
import { ProfileInsights } from '../components/ProfileInsights';
import { trackProfileView } from '../lib/profileViews';
import { ReviewProfileSection } from '../components/ReviewProfileSection';
import { useWeeklyMetrics } from '../hooks/useWeeklyMetrics';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { getTierFromScore } from '../lib/tierConfig';
import { getBadgeType, getBadgeImagePath } from '../lib/badgeUtils';
import { MotoFansSection } from '../components/MotoFansSection';

interface UserProfilePageProps {
  userId: string;
  onNavigate: OnNavigate;
  onViewVehicle: (vehicleId: string) => void;
  onBack: () => void;
}

export function UserProfilePage({ userId, onNavigate, onViewVehicle, onBack }: UserProfilePageProps) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [_followingCount, setFollowingCount] = useState(0);
  const [spotsCount, setSpotsCount] = useState(0);
  const [_reviewsCount, setReviewsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [activeTab, setActiveTab] = useState<'garage' | 'posts' | 'badges' | 'reviews'>('garage');
  const [profileViewCount, _setProfileViewCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [showReportModal, setShowReportModal] = useState(false);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [ratingsLoaded, setRatingsLoaded] = useState(false);
  const [allPhotos, setAllPhotos] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lockedBadges, setLockedBadges] = useState<any[]>([]);

  const isOwnProfile = currentUser?.id === userId;
  const isPrivate = profile?.is_private === true;
  const canViewContent = !isPrivate || followStatus === 'accepted' || isOwnProfile;
  const weeklyMetrics = useWeeklyMetrics(isOwnProfile ? profile?.id : undefined);

  const checkFollowStatus = useCallback(async () => {
    if (!currentUser || isOwnProfile) return;

    const { data } = await supabase
      .from('follows')
      .select('status')
      .eq('follower_id', currentUser.id)
      .eq('following_id', userId)
      .maybeSingle();

    if (data) {
      const status = data.status as 'pending' | 'accepted';
      setFollowStatus(status);
      setIsFollowing(status === 'accepted');
    } else {
      setFollowStatus('none');
      setIsFollowing(false);
    }
  }, [currentUser, isOwnProfile, userId]);

  const loadProfile = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    setProfile(data);
    setLoading(false);

    if (currentUser && currentUser.id !== userId) {
      await trackProfileView(userId, currentUser.id);
    }
  }, [userId, currentUser]);

  const loadVehicles = useCallback(async () => {
    setLoadingVehicles(true);
    try {
      // PLATE: hidden — public surface
      const { data } = await supabase
        .from('vehicles')
        .select(VEHICLE_PUBLIC_COLUMNS)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (data) setVehicles(data);
      setVehiclesLoaded(true);
    } finally {
      setLoadingVehicles(false);
    }
  }, [userId]);

  const loadBadges = useCallback(async () => {
    const { data: earnedData } = await supabase
      .from('user_badges')
      .select(`
        id,
        earned_at,
        tier,
        badge_id,
        badge:badges(id, name, icon_name, category, description)
      `)
      .eq('user_id', userId);

    if (earnedData) setBadges(earnedData);

    const { data: allBadgeData } = await supabase
      .from('badges')
      .select('id, name, icon_name, category, tier, tier_threshold')
      .order('tier_threshold', { ascending: true })
      .limit(60);

    if (allBadgeData && earnedData) {
      const earnedIds = new Set(earnedData.map((ub: any) => ub.badge_id));
      const locked = allBadgeData.filter((b: any) => !earnedIds.has(b.id)).slice(0, 5);
      setLockedBadges(locked);
    }
  }, [userId]);

  const loadAllPhotos = useCallback(async () => {
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('photos')
      .eq('owner_id', userId);

    const photos: string[] = [];
    vehicleData?.forEach((v: any) => {
      if (v.photos && Array.isArray(v.photos)) {
        v.photos.forEach((p: any) => {
          if (p.url) photos.push(p.url);
        });
      }
    });

    setAllPhotos(photos);
  }, [userId]);

  const loadFollowCounts = useCallback(async () => {
    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId)
      .eq('status', 'accepted');

    const { count: following } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId)
      .eq('status', 'accepted');

    setFollowerCount(followers || 0);
    setFollowingCount(following || 0);
  }, [userId]);

  const loadRatings = useCallback(async () => {
    setLoadingRatings(true);
    try {
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('id')
        .eq('owner_id', userId);

      if (!vehicleData || vehicleData.length === 0) {
        setRatingsLoaded(true);
        return;
      }

      const vehicleIds = vehicleData.map(v => v.id);

      await supabase
        .from('reviews')
        .select('rating_driver, rating_vehicle')
        .in('vehicle_id', vehicleIds);

      setRatingsLoaded(true);
    } finally {
      setLoadingRatings(false);
    }
  }, [userId]);

  const loadUserPosts = useCallback(async () => {
    setLoadingPosts(true);
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        post_type,
        caption,
        image_url,
        created_at,
        location_label,
        moderation_status
      `)
      .eq('author_id', userId)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data && !error) {
      const postsWithCounts = await Promise.all(
        data.map(async (post) => {
          const { count: likeCount } = await supabase
            .from('reactions')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { count: commentCount } = await supabase
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          return {
            ...post,
            like_count: likeCount || 0,
            comment_count: commentCount || 0,
          };
        })
      );

      setUserPosts(postsWithCounts);
    }
    setPostsLoaded(true);
    setLoadingPosts(false);
  }, [userId]);

  const loadProfileViews = async () => {
    // profile_views table not yet created in Supabase — skip query to avoid 400 errors
  };


  const loadSpotAndReviewCounts = useCallback(async () => {
    const { count: spots } = await supabase
      .from('spot_history')
      .select('*', { count: 'exact', head: true })
      .eq('spotter_id', userId);

    const { count: reviews } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId);

    setSpotsCount(spots || 0);
    setReviewsCount(reviews || 0);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadProfile();
      loadBadges();
      loadFollowCounts();
      loadProfileViews();
      checkFollowStatus();
      loadSpotAndReviewCounts();
      loadAllPhotos();
    }
  }, [userId, followStatus, checkFollowStatus, loadAllPhotos, loadBadges, loadFollowCounts, loadProfile, loadSpotAndReviewCounts]);

  useEffect(() => {
    if (!userId || !canViewContent) return;

    if (activeTab === 'garage' && !vehiclesLoaded) {
      loadVehicles();
    } else if (activeTab === 'posts' && !postsLoaded) {
      loadUserPosts();
    } else if (activeTab === 'reviews' && !ratingsLoaded) {
      loadRatings();
    }
  }, [activeTab, userId, canViewContent, loadVehicles, loadUserPosts, loadRatings, vehiclesLoaded, postsLoaded, ratingsLoaded]);

  const featuredVehicle = vehicles[0] || null;
  const featuredPhoto = featuredVehicle?.profile_image_url || featuredVehicle?.stock_image_url || null;
  const userTier = getTierFromScore(profile?.reputation_score || 0);

  if (loading) {
    return (
      <Layout currentPage="profile" onNavigate={onNavigate}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
          <div style={{ width: 24, height: 24, border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#F97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout currentPage="profile" onNavigate={onNavigate}>
        <div style={{ textAlign: 'center' as const, padding: '48px 24px' }}>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e' }}>Profile not found</p>
          <button onClick={onBack} style={{ marginTop: 12, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, color: '#F97316', background: 'none', border: 'none', cursor: 'pointer' }}>
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div style={{ background: '#030508', minHeight: '100vh', paddingBottom: 100 }}>
        {/* ── 1. HERO ── */}
        <div style={{ background: '#0a0d14', position: 'relative' }}>
          {/* Cover strip */}
          <div style={{ height: 80, background: '#0d1117', overflow: 'hidden', position: 'relative' }}>
            {featuredPhoto && <img src={featuredPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />}
          </div>

          {/* Back button */}
          <button onClick={onBack} style={{ position: 'absolute', top: 14, left: 14, width: 32, height: 32, borderRadius: 8, background: 'rgba(3,5,8,0.7)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 3 }}>
            <ArrowLeft size={14} color="#eef4f8" />
          </button>

          {/* Avatar */}
          <div style={{ marginTop: -28, position: 'relative', zIndex: 2, padding: '0 16px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1e2a38', border: '3px solid #0a0d14', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#eef4f8' }}>{(profile?.handle || '?')[0].toUpperCase()}</span>
              )}
            </div>
          </div>

          {/* Name + Handle */}
          <div style={{ padding: '8px 16px 0' }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
              {profile?.handle || 'Anonymous'}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5a6e7e', marginTop: 2, letterSpacing: '0.05em' }}>
              @{profile?.handle || 'user'} · {userTier.name} Tier
              {isPrivate && <span style={{ color: '#3a4e60', marginLeft: 6 }}>Private</span>}
            </div>
            {profile?.bio && (
              <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7a8e9e', marginTop: 4, lineHeight: 1.4 }}>{profile.bio}</div>
            )}
          </div>

          {/* Featured badges */}
          {badges.length > 0 && (
            <div style={{ display: 'flex', gap: 6, padding: '8px 16px 0', flexWrap: 'wrap' as const }}>
              {badges.slice(0, 3).map((item: any) => {
                const badge = item.badge || item;
                return (
                  <div key={badge.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, background: 'rgba(240,160,48,0.10)', border: '1px solid rgba(240,160,48,0.25)' }}>
                    <BadgeCoin tier={((item.tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'plat')} name={badge.name} icon_path={getBadgeImagePath(badge)} size="sm" />
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#f0a030' }}>{badge.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          {!isOwnProfile && currentUser && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 16px 0' }}>
              <FollowButton targetUserId={userId} onFollowChange={(f) => { setFollowStatus(f ? 'accepted' : 'none'); setIsFollowing(f); }} />
              <button onClick={() => onNavigate('messages', userId)} style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7a8e9e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MessageCircle size={10} /> Message
              </button>
              <button onClick={() => setShowReportModal(true)} style={{ marginLeft: 'auto', padding: '6px 10px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, color: '#3a4e60', cursor: 'pointer' }}>
                <Flag size={10} />
              </button>
            </div>
          )}

          {/* Stat strip */}
          <div style={{ display: 'flex', gap: 20, padding: '12px 16px 14px' }}>
            {[
              { label: 'Spots', value: spotsCount },
              { label: 'Badges', value: badges.length },
              { label: 'Friends', value: followerCount },
              { label: 'Vehicles', value: vehicles.length },
            ].map(stat => (
              <div key={stat.label}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#eef4f8' }}>{stat.value}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5a6e7e', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginLeft: 5 }}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy gate */}
        {!canViewContent && (
          <PrivacyGate profileUserId={userId} profileHandle={profile?.handle || 'this user'} isFollowing={isFollowing} onFollowChange={checkFollowStatus} />
        )}

        {canViewContent && (
          <>
            {/* ── 2. FEATURED VEHICLE ── */}
            {featuredVehicle ? (
              <div onClick={() => onViewVehicle(featuredVehicle.id)} style={{ position: 'relative', width: '100%', height: 160, overflow: 'hidden', background: '#0d1117', cursor: 'pointer', borderTop: '1px solid rgba(249,115,22,0.08)' }}>
                {featuredPhoto ? (
                  <img src={featuredPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7, display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1e2a38" strokeWidth="1"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17H3v-6l2-5h9l4 5h3v6h-2"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.9) 0%, transparent 60%)' }} />
                <div style={{ position: 'absolute', bottom: 10, left: 14, right: 14 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316' }}>{featuredVehicle.make}</div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>{featuredVehicle.model}</div>
                </div>
              </div>
            ) : null}

            {/* ── 3. FLEET ── */}
            {vehicles.length > 1 && (
              <div>
                <div style={{ padding: '12px 16px 8px' }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>Fleet · {vehicles.length}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, padding: '0 14px 14px', overflowX: 'auto', scrollbarWidth: 'none' as const }}>
                  {vehicles.slice(1).map(v => {
                    const vPhoto = v.profile_image_url || v.stock_image_url;
                    return (
                      <div key={v.id} onClick={() => onViewVehicle(v.id)} style={{ flexShrink: 0, width: 130, borderRadius: 10, overflow: 'hidden', background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                        {vPhoto ? <img src={vPhoto} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: 80, background: '#111720', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3a4e60" strokeWidth="1"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17H3v-6l2-5h9l4 5h3v6h-2"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>}
                        <div style={{ padding: '6px 8px' }}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316' }}>{v.make}</div>
                          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>{v.model}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 4. BADGES ── */}
            {badges.length > 0 && (
              <div>
                <div style={{ padding: '12px 16px 8px' }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>Badges · {badges.length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '0 14px 14px' }}>
                  {badges.slice(0, 8).map((item: any) => {
                    const badge = item.badge || item;
                    return (
                      <div key={badge.id} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4 }}>
                        <BadgeCoin tier={((item.tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'plat')} name={badge.name} icon_path={getBadgeImagePath(badge)} size="md" />
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#5a6e7e', textAlign: 'center' as const, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{badge.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 5. MOTOFANS ── */}
            <MotoFansSection userId={userId} onNavigate={onNavigate} />
          </>
        )}
      </div>

      {showReportModal && <ReportModal contentType="profile" contentId={userId} onClose={() => setShowReportModal(false)} />}
      {lightboxOpen && allPhotos.length > 0 && <PhotoLightbox photos={allPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
