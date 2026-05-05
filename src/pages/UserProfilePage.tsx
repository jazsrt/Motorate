import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { VEHICLE_PUBLIC_COLUMNS } from '../lib/vehicles';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { FollowButton } from '../components/FollowButton';
import { ReportModal } from '../components/ReportModal';
import { PrivacyGate } from '../components/PrivacyGate';
import { trackProfileView } from '../lib/profileViews';
import { useWeeklyMetrics } from '../hooks/useWeeklyMetrics';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { getTierFromScore } from '../lib/tierConfig';
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
  const [_badges, setBadges] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [_followingCount, setFollowingCount] = useState(0);
  const [spotsCount, setSpotsCount] = useState(0);
  const [_reviewsCount, setReviewsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [_loadingPosts, setLoadingPosts] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [_loadingRatings, setLoadingRatings] = useState(false);
  const [activeTab, setActiveTab] = useState<'fleet' | 'spots' | 'friends' | 'posts'>('fleet');
  const [_profileViewCount, _setProfileViewCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [showReportModal, setShowReportModal] = useState(false);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [ratingsLoaded, setRatingsLoaded] = useState(false);
  const [allPhotos, setAllPhotos] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, _setLightboxIndex] = useState(0);
  const [_lockedBadges, setLockedBadges] = useState<any[]>([]);

  const isOwnProfile = currentUser?.id === userId;
  const isPrivate = profile?.is_private === true;
  const canViewContent = !isPrivate || followStatus === 'accepted' || isOwnProfile;
  const _weeklyMetrics = useWeeklyMetrics(isOwnProfile ? profile?.id : undefined);

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

    if (activeTab === 'fleet' && !vehiclesLoaded) {
      loadVehicles();
    } else if ((activeTab === 'posts' || activeTab === 'spots') && !postsLoaded) {
      loadUserPosts();
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
        {/* ── 1. HERO — Full bleed vehicle image, identity overlaid ── */}
        {!isPrivate || followStatus === 'accepted' ? (
          <div style={{ position: 'relative', width: '100%', height: 300, overflow: 'hidden', flexShrink: 0 }}>
            {featuredPhoto ? (
              <img src={featuredPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg, #120a04 0%, #0c0602 40%, #030508 100%)' }} />
            )}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, rgba(3,5,8,0.6) 0%, transparent 100%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to bottom, transparent 0%, rgba(3,5,8,0.75) 45%, #030508 100%)' }} />

            {/* Floating back pill */}
            <button onClick={onBack} style={{ position: 'absolute', top: 52, left: 14, zIndex: 10, display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '.3px', color: 'rgba(255,255,255,0.85)', padding: '5px 12px 5px 8px', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 20, background: 'rgba(3,5,8,0.5)', cursor: 'pointer' }}>
              <ArrowLeft size={14} color="rgba(255,255,255,0.85)" />
              Profile
            </button>
            {/* More button */}
            <button onClick={() => setShowReportModal(true)} style={{ position: 'absolute', top: 52, right: 14, zIndex: 10, width: 32, height: 32, border: '1px solid rgba(255,255,255,0.18)', borderRadius: '50%', background: 'rgba(3,5,8,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </button>

            {/* Identity overlay */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 14px' }}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '.5px' }}>
                {profile?.handle || 'Anonymous'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '2px 8px', border: `1px solid ${userTier.name === 'Certified' ? 'rgba(52,211,153,0.4)' : 'rgba(96,165,250,0.4)'}`, borderRadius: 2, color: userTier.name === 'Certified' ? '#34d399' : '#60a5fa', background: userTier.name === 'Certified' ? 'rgba(52,211,153,0.08)' : 'rgba(96,165,250,0.08)' }}>
                  {userTier.name}
                </span>
                {followStatus === 'accepted' && (
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', padding: '2px 7px', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 2, color: '#34d399', background: 'rgba(52,211,153,0.06)' }}>Mutual</span>
                )}
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: 'rgba(249,115,22,0.7)', letterSpacing: '.3px' }}>
                  {(profile?.reputation_score || 0).toLocaleString()} RP
                </span>
              </div>
              {profile?.bio && (
                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4, lineHeight: 1.35 }}>{profile.bio}</div>
              )}
            </div>
          </div>
        ) : (
          /* Private — void hero */
          <div style={{ position: 'relative', width: '100%', height: 300, overflow: 'hidden', background: 'linear-gradient(160deg, #0a0a0c, #030508)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, rgba(3,5,8,0.6) 0%, transparent 100%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to bottom, transparent 0%, #030508 100%)' }} />

            <button onClick={onBack} style={{ position: 'absolute', top: 52, left: 14, zIndex: 10, display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '.3px', color: 'rgba(255,255,255,0.85)', padding: '5px 12px 5px 8px', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 20, background: 'rgba(3,5,8,0.5)', cursor: 'pointer' }}>
              <ArrowLeft size={14} color="rgba(255,255,255,0.85)" />
              Profile
            </button>

            {/* Lock centered in hero */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 80 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={20} color="#374151" />
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#2D3748' }}>Private</div>
            </div>

            {/* Barely visible handle */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 14px' }}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#2D3748', lineHeight: 1 }}>
                {profile?.handle || 'private_user'}
              </div>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '2px 8px', border: '1px solid rgba(75,85,99,0.3)', borderRadius: 2, color: '#4B5563', display: 'inline-block', marginTop: 4 }}>Private</span>
            </div>
          </div>
        )}

        {/* Stat strip */}
        <div style={{ display: 'flex', borderTop: '1px solid rgba(249,115,22,0.12)', borderBottom: '1px solid rgba(249,115,22,0.12)', background: '#030508', opacity: isPrivate && followStatus !== 'accepted' ? 0.15 : 1, pointerEvents: isPrivate && followStatus !== 'accepted' ? 'none' : 'auto' }}>
          {[
            { label: 'RP', value: (profile?.reputation_score || 0).toLocaleString(), orange: true },
            { label: 'Vehicles', value: vehicles.length },
            { label: 'Friends', value: followerCount },
            { label: 'Spots', value: spotsCount },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '11px 0', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 500, color: stat.orange ? '#F97316' : (isPrivate && followStatus !== 'accepted' ? '#2D3748' : '#fff'), lineHeight: 1 }}>
                {isPrivate && followStatus !== 'accepted' ? '—' : stat.value}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', color: '#4B5563' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        {!isOwnProfile && currentUser && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: '#030508', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <FollowButton targetUserId={userId} onFollowChange={(f) => { setFollowStatus(f ? 'accepted' : 'none'); setIsFollowing(f); }} />
            <button onClick={() => onNavigate('messages', userId)} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '9px 16px', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 2, color: '#6B7280', background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}>
              Message
            </button>
          </div>
        )}

        {/* Privacy gate */}
        {!canViewContent && (
          <PrivacyGate profileUserId={userId} profileHandle={profile?.handle || 'this user'} isFollowing={isFollowing} onFollowChange={checkFollowStatus} />
        )}

        {canViewContent && (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', background: '#030508', borderBottom: '1px solid rgba(249,115,22,0.14)' }}>
              {(['fleet', 'spots', 'friends', 'posts'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1, textAlign: 'center', padding: '10px 0',
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
                    letterSpacing: '1px', textTransform: 'uppercase',
                    color: activeTab === tab ? '#F97316' : '#4B5563',
                    background: 'none', border: 'none',
                    borderBottom: activeTab === tab ? '2px solid #F97316' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'fleet' && (
              <div>
                {loadingVehicles ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div style={{ width: 20, height: 20, border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#F97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
                ) : vehicles.length === 0 ? (
                  <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 600, color: '#6B7280' }}>No vehicles</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, background: '#010203', padding: 2 }}>
                      {vehicles.map(v => {
                        const photo = v.profile_image_url || v.stock_image_url;
                        return (
                          <div key={v.id} onClick={() => onViewVehicle(v.id)} style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden', background: '#0a0d12', cursor: 'pointer' }}>
                            {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #0a1520, #060c16)' }} />}
                            <div style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: '#F97316', boxShadow: '0 0 8px rgba(249,115,22,0.7)' }} />
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '5px 7px 6px', background: 'linear-gradient(transparent, rgba(3,5,8,0.85))' }}>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#F97316', letterSpacing: '1.5px' }}>{v.make || ''}</div>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>{(v.reputation_score || 0).toLocaleString()} RP</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {vehicles.map(v => {
                      const photo = v.profile_image_url || v.stock_image_url;
                      return (
                        <div key={v.id} onClick={() => onViewVehicle(v.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: '#030508', cursor: 'pointer' }}>
                          <div style={{ width: 60, height: 40, borderRadius: 2, overflow: 'hidden', flexShrink: 0, background: '#0a0d12' }}>
                            {photo && <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.1 }}>{[v.year, v.make, v.model].filter(Boolean).join(' ')}</div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#4B5563' }}><span style={{ color: '#9CA3AF' }}>{(v.reputation_score || 0).toLocaleString()}</span> RP</span>
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#4B5563' }}><span style={{ color: '#9CA3AF' }}>{v.fans_count || 0}</span> Fans</span>
                            </div>
                          </div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', padding: '3px 7px', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 2, color: '#F97316', background: 'rgba(249,115,22,0.06)', whiteSpace: 'nowrap' }}>Owner</div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {activeTab === 'spots' && (
              <div>
                {!postsLoaded ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div style={{ width: 20, height: 20, border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#F97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, background: '#010203', padding: 2 }}>
                    {userPosts.filter(p => p.post_type === 'spot').map(post => (
                      <div key={post.id} style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden', background: '#0a0d12' }}>
                        {post.image_url ? <img src={post.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #0a1520, #060c16)' }} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'friends' && (
              <div>
                <MotoFansSection userId={userId} onNavigate={onNavigate} />
              </div>
            )}

            {activeTab === 'posts' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, background: '#010203', padding: 2 }}>
                {userPosts.map(post => (
                  <div key={post.id} style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden', background: '#0a0d12' }}>
                    {post.image_url ? <img src={post.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #0a1520, #060c16)' }} />}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showReportModal && <ReportModal contentType="profile" contentId={userId} onClose={() => setShowReportModal(false)} />}
      {lightboxOpen && allPhotos.length > 0 && <PhotoLightbox photos={allPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
