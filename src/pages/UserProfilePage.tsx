import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { ArrowLeft, Car, Award, Star, Instagram, Music, Eye, MessageCircle, Calendar, Lock, Flag, Image, ImageIcon, MapPin } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { TierBadge } from '../components/TierBadge';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { Badge } from '../components/Badge';
import { BadgeCoin } from '../components/BadgeCoin';
import { ReactionButton } from '../components/ReactionButton';
import { DashLight, DigitalDisplay } from '../components/gauges';
import { FollowButton } from '../components/FollowButton';
import { BlockUserButton } from '../components/BlockUserButton';
import { ReportModal } from '../components/ReportModal';
import { PrivacyGate } from '../components/PrivacyGate';
import { ProfileInsights } from '../components/ProfileInsights';
import { trackProfileView, checkIfFollowing } from '../lib/profileViews';
import { ReputationScore } from '../components/ReputationScore';
import { ReviewProfileSection } from '../components/ReviewProfileSection';
import { useWeeklyMetrics } from '../hooks/useWeeklyMetrics';
import { PhotoLightbox } from '../components/PhotoLightbox';

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
  const [followingCount, setFollowingCount] = useState(0);
  const [spotsCount, setSpotsCount] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [activeTab, setActiveTab] = useState<'garage' | 'posts' | 'badges' | 'reviews'>('garage');
  const [profileViewCount, setProfileViewCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [showReportModal, setShowReportModal] = useState(false);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [ratingsLoaded, setRatingsLoaded] = useState(false);
  const [allPhotos, setAllPhotos] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const isOwnProfile = currentUser?.id === userId;
  const isPrivate = profile?.is_private === true;
  const canViewContent = !isPrivate || followStatus === 'accepted' || isOwnProfile;
  const weeklyMetrics = useWeeklyMetrics(isOwnProfile ? profile?.id : undefined);

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
  }, [userId, followStatus]);

  useEffect(() => {
    if (!userId || !canViewContent) return;

    if (activeTab === 'garage' && !vehiclesLoaded) {
      loadVehicles();
    } else if (activeTab === 'posts' && !postsLoaded) {
      loadUserPosts();
    } else if (activeTab === 'reviews' && !ratingsLoaded) {
      loadRatings();
    }
  }, [activeTab, userId, canViewContent]);

  const checkFollowStatus = async () => {
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
  };

  const loadProfile = async () => {
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
  };

  const loadVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (data) setVehicles(data);
      setVehiclesLoaded(true);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const loadBadges = async () => {
    const { data } = await supabase
      .from('user_badges')
      .select(`
        id,
        earned_at,
        tier,
        badge:badges(id, name, icon_name, category, description)
      `)
      .eq('user_id', userId);

    if (data) setBadges(data);
  };

  const loadAllPhotos = async () => {
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
  };

  const loadFollowCounts = async () => {
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
  };

  const loadRatings = async () => {
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

      const { data: reviewData } = await supabase
        .from('posts')
        .select('rating_driver, rating_vehicle')
        .in('vehicle_id', vehicleIds)
        .in('post_type', ['spot', 'review']);

      setRatingsLoaded(true);
    } finally {
      setLoadingRatings(false);
    }
  };

  const loadUserPosts = async () => {
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
  };

  const loadProfileViews = async () => {
    // profile_views table not yet created in Supabase — skip query to avoid 400 errors
  };


  const loadSpotAndReviewCounts = async () => {
    const { count: spots } = await supabase
      .from('spot_history')
      .select('*', { count: 'exact', head: true })
      .eq('spotter_id', userId);

    // Count spots received on user's claimed vehicles
    const { data: userVehicles } = await supabase
      .from('vehicles')
      .select('id')
      .eq('owner_id', userId);

    let received = 0;
    if (userVehicles && userVehicles.length > 0) {
      const vehicleIds = userVehicles.map(v => v.id);
      const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .in('vehicle_id', vehicleIds)
        .in('post_type', ['spot', 'review']);
      received = count || 0;
    }

    setSpotsCount(spots || 0);
    setReviewsCount(received);
  };

  if (loading) {
    return (
      <Layout currentPage="profile" onNavigate={onNavigate}>
        <div className="flex items-center justify-center py-12">
          <div className="text-secondary">Loading profile...</div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout currentPage="profile" onNavigate={onNavigate}>
        <div className="text-center py-12">
          <p className="text-secondary">Profile not found</p>
          <button onClick={onBack} className="mt-4 text-accent-primary hover:text-accent-hover">
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div className="space-y-6 animate-page-enter">
        <div className="flex items-center gap-3 stg">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-white/[0.06] hover:bg-surface-2 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-heading font-bold">Profile</h1>
        </div>

        <div className="bg-surface border border-white/[0.06] rounded-xl p-6 stg">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="relative">
                {profile?.avatar_url ? (
                  <div
                    className="w-20 h-20 rounded-full overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #F97316, #fb923c)',
                      padding: '3px'
                    }}
                  >
                    <img
                      src={profile.avatar_url}
                      alt={`@${profile.handle}`}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #F97316, #fb923c)'
                    }}
                  >
                    {profile?.handle?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-heading font-bold">@{profile?.handle || 'Anonymous'}</h2>
                  {profile?.role === 'owner' && <VerifiedBadge size="md" />}
                  {isPrivate && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-surfacehighlight rounded-lg">
                      <Lock className="w-4 h-4 text-secondary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-secondary">Private</span>
                    </div>
                  )}
                </div>

                {profile?.location && (
                  <div className="flex items-center gap-1.5 text-sm text-secondary mt-1">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                )}

                {profile?.bio && (
                  <p className="text-sm text-secondary mt-2 max-w-md">{profile.bio}</p>
                )}

                {/* Reputation Score */}
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <ReputationScore
                    userId={userId}
                    size="md"
                    showLabel={true}
                  />
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-secondary">
                    <Eye className="w-4 h-4" />
                    <span className="font-bold">{profileViewCount.toLocaleString()}</span>
                    <span>views</span>
                  </div>
                </div>

                {canViewContent && badges.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-secondary font-bold uppercase tracking-wider mb-2">Trophy Case</p>
                    <div className="flex items-center gap-1.5">
                      {badges
                        .sort((a, b) => new Date(a.earned_at).getTime() - new Date(b.earned_at).getTime())
                        .slice(0, 5)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="relative group"
                            title={item.badge.name}
                          >
                            <BadgeCoin
                              iconName={item.badge.icon_name}
                              category={item.badge.category}
                              size="sm"
                            />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface border border-surfacehighlight rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                              {item.badge.name}
                            </div>
                          </div>
                        ))}
                      {badges.length > 5 && (
                        <button
                          onClick={() => setActiveTab('badges')}
                          className="text-xs text-accent-primary hover:text-accent-hover font-bold ml-2"
                        >
                          +{badges.length - 5}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!canViewContent && badges.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-secondary">
                      <span className="font-bold">{badges.length}</span> badge{badges.length !== 1 ? 's' : ''} earned
                    </p>
                  </div>
                )}

                {profile?.role === 'owner' && (profile?.instagram_handle || profile?.tiktok_handle) && (
                  <div className="flex items-center gap-3 mt-2">
                    {profile?.instagram_handle && (
                      <a
                        href={`https://instagram.com/${profile.instagram_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-hover transition-colors"
                      >
                        <Instagram className="w-4 h-4" />
                        @{profile.instagram_handle}
                      </a>
                    )}
                    {profile?.tiktok_handle && (
                      <a
                        href={`https://tiktok.com/@${profile.tiktok_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-hover transition-colors"
                      >
                        <Music className="w-4 h-4" />
                        @{profile.tiktok_handle}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
            {!isOwnProfile && currentUser && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <FollowButton
                    targetUserId={userId}
                    onFollowChange={(isFollowing) => {
                      if (isFollowing) {
                        setFollowStatus('accepted');
                        setIsFollowing(true);
                      } else {
                        setFollowStatus('none');
                        setIsFollowing(false);
                      }
                    }}
                  />
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold uppercase tracking-wider text-sm bg-surfacehighlight/50 text-secondary/50 cursor-not-allowed"
                    title="Coming soon"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <BlockUserButton
                    userId={userId}
                    userName={profile?.handle || 'user'}
                    variant="button"
                  />
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all active:scale-95 font-bold uppercase tracking-wider text-sm bg-status-danger/20 hover:bg-status-danger/30 text-status-danger"
                  >
                    <Flag className="w-4 h-4" />
                    Report
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3 mt-6 stg">
            <div className="bg-surface border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-[22px] font-heading font-bold text-accent-primary">
                {spotsCount.toLocaleString()}
              </div>
              <div className="text-xs text-secondary uppercase tracking-wider mt-1">Spots</div>
            </div>
            <div className="bg-surface border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-[22px] font-heading font-bold text-positive">
                {reviewsCount.toLocaleString()}
              </div>
              <div className="text-xs text-secondary uppercase tracking-wider mt-1">Received</div>
            </div>
            <div className="bg-surface border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-[22px] font-heading font-bold text-accent-2">
                {followerCount.toLocaleString()}
              </div>
              <div className="text-xs text-secondary uppercase tracking-wider mt-1">Followers</div>
            </div>
            <div className="bg-surface border border-white/[0.06] rounded-xl p-4 text-center">
              <div className="text-[22px] font-heading font-bold text-orange">
                {followingCount.toLocaleString()}
              </div>
              <div className="text-xs text-secondary uppercase tracking-wider mt-1">Following</div>
            </div>
          </div>
        </div>

        {!canViewContent && (
          <PrivacyGate
            profileUserId={userId}
            profileHandle={profile?.handle || 'this user'}
            isFollowing={isFollowing}
            onFollowChange={checkFollowStatus}
          />
        )}

        {isOwnProfile && <ProfileInsights profileId={userId} />}

        {canViewContent && (
          <div className="card-v3 p-4 mb-4 stg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-mono uppercase tracking-wider" style={{ color: 'var(--t4)' }}>Reputation</span>
              <span className="font-mono text-[24px] font-bold" style={{ color: '#F97316' }}>
                {profile?.reputation_score?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="w-full bg-surfacehighlight rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(((profile?.reputation_score || 0) / 10000) * 100, 100)}%`,
                  background: 'linear-gradient(90deg, #F97316, #fb923c)'
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-quaternary">0</span>
              <span className="text-[14px] font-semibold" style={{ color: '#F97316' }}>
                {(() => {
                  const s = profile?.reputation_score || 0;
                  if (s >= 10000) return 'Legend';
                  if (s >= 7500) return 'Road General';
                  if (s >= 5000) return 'Iconic';
                  if (s >= 3000) return 'Road Captain';
                  if (s >= 1500) return 'Street Racer';
                  if (s >= 500) return 'Cruiser';
                  return 'Permit';
                })()}
              </span>
              <span className="text-[10px] text-quaternary">10,000</span>
            </div>
          </div>
        )}

        {canViewContent && (
          <div className="stg">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setActiveTab('garage')}
                className={`text-xl font-bold uppercase tracking-wider pb-2 border-b-2 transition-colors ${
                  activeTab === 'garage'
                    ? 'border-accent-primary text-primary'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                Garage
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`text-xl font-bold uppercase tracking-wider pb-2 border-b-2 transition-colors ${
                  activeTab === 'posts'
                    ? 'border-accent-primary text-primary'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                Activity
              </button>
              <button
                onClick={() => setActiveTab('badges')}
                className={`text-xl font-bold uppercase tracking-wider pb-2 border-b-2 transition-colors ${
                  activeTab === 'badges'
                    ? 'border-accent-primary text-primary'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                Badges
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`text-xl font-bold uppercase tracking-wider pb-2 border-b-2 transition-colors ${
                  activeTab === 'reviews'
                    ? 'border-accent-primary text-primary'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                Spots
              </button>
            </div>

            {activeTab === 'garage' ? (
              <div className="space-y-4">
                {loadingVehicles ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-secondary">Loading vehicles...</div>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="bg-surface border border-white/[0.06] rounded-[14px] p-8 text-center">
                    <Car className="w-12 h-12 text-secondary/50 mx-auto mb-3" />
                    <p className="text-secondary">No claimed vehicles yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {vehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className="bg-surface border border-white/[0.06] rounded-[14px] overflow-hidden cursor-pointer hover:border-orange-500 transition-colors"
                        onClick={() => onViewVehicle(vehicle.id)}
                      >
                        {vehicle.photos && vehicle.photos.length > 0 ? (
                          <div className="aspect-video bg-surfacehighlight">
                            <img
                              src={vehicle.photos[0]}
                              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-video bg-surfacehighlight flex items-center justify-center">
                            <Car className="w-12 h-12 text-secondary/50" />
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="text-base font-heading font-bold">
                                {vehicle.year} {vehicle.make}
                              </h4>
                              <p className="text-sm text-secondary">{vehicle.model}</p>
                              {vehicle.color && (
                                <p className="text-xs uppercase tracking-wider font-bold text-secondary mt-1">
                                  {vehicle.color}
                                </p>
                              )}
                            </div>
                            {vehicle.verification_tier && ['shadow', 'standard', 'verified'].includes(vehicle.verification_tier) && (
                              <TierBadge tier={vehicle.verification_tier} size="small" />
                            )}
                          </div>
                          {vehicle.is_claimed && vehicle.plate_hash && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-900/20 border border-green-700/30 rounded text-xs text-green-400 w-fit">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="font-bold">VERIFIED</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'posts' ? (
              <div>
                {isOwnProfile && !weeklyMetrics.loading && (
                  <div className="flex gap-2 mb-4">
                    {[
                      { label: 'Spots', value: weeklyMetrics.spotsThisWeek, delta: weeklyMetrics.spotsThisWeek - weeklyMetrics.spotsLastWeek },
                      { label: 'Rep +', value: weeklyMetrics.repEarnedThisWeek },
                      { label: 'Likes', value: weeklyMetrics.likesReceivedThisWeek },
                    ].map(m => (
                      <div key={m.label} className="flex-1 rounded-xl px-3 py-2.5 text-center"
                        style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="font-heading text-[18px] font-bold leading-none" style={{ color: '#f2f4f7' }}>{m.value}</div>
                        <div className="text-[7px] font-semibold uppercase mt-1" style={{ color: '#909aaa', letterSpacing: '1.5px' }}>{m.label}</div>
                        {'delta' in m && m.delta !== undefined && m.delta !== 0 && (
                          <div className="text-[7px] font-medium mt-0.5" style={{ color: m.delta > 0 ? '#5aaa7a' : '#aa5a5a' }}>
                            {m.delta > 0 ? '+' : ''}{m.delta} wow
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {loadingPosts ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-secondary">Loading posts...</div>
                  </div>
                ) : userPosts.length === 0 ? (
                  <div className="bg-surface border border-white/[0.06] rounded-xl">
                    <EmptyState
                      icon={Image}
                      title="No posts yet"
                      description={isOwnProfile ? "Share your first ride!" : "This user hasn't posted anything yet."}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userPosts.map((post) => (
                      <div
                        key={post.id}
                        className="bg-surface border border-white/[0.06] rounded-[14px] overflow-hidden"
                      >
                        {post.image_url && (
                          <div className="relative aspect-square bg-surfacehighlight max-h-64">
                            <img
                              src={post.image_url}
                              alt={post.caption || 'Post'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-4 space-y-3">
                          {post.caption && (
                            <p className="text-sm">{post.caption}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <ReactionButton postId={post.id} />
                              <div className="flex items-center gap-1.5 text-sm text-secondary">
                                <MessageCircle className="w-4 h-4" />
                                <span className="font-bold">{post.comment_count}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-secondary">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {post.location_label && (
                            <div className="text-xs text-secondary">
                              {post.location_label}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'badges' ? (
              <div className="space-y-4">
                {badges.length === 0 ? (
                  <div className="bg-surface border border-white/[0.06] rounded-[14px] p-8 text-center">
                    <Award className="w-12 h-12 text-secondary/50 mx-auto mb-3" />
                    <p className="text-secondary">No badges yet</p>
                  </div>
                ) : (
                  <div className="bg-surface border border-white/[0.06] rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="w-5 h-5 text-accent-primary" />
                      <h3 className="text-xl font-bold uppercase tracking-wider">Badges</h3>
                      <span className="text-xs text-secondary">({badges.length})</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {badges.map((item) => (
                        <div key={item.id} className="flex flex-col items-center gap-2" title={item.badge.description}>
                          <BadgeCoin
                            iconName={item.badge.icon_name}
                            category={item.badge.category}
                            size="lg"
                          />
                          <div className="text-[10px] text-center text-tertiary line-clamp-2">
                            {item.badge.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photos Section */}
                {canViewContent && allPhotos.length > 0 && (
                  <div className="bg-surface border border-white/[0.06] rounded-xl p-6 mt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <ImageIcon className="w-5 h-5 text-accent-primary" />
                      <h3 className="text-xl font-bold uppercase tracking-wider">Photos</h3>
                      <span className="text-xs text-secondary">({allPhotos.length})</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {allPhotos.map((photo, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setLightboxIndex(index);
                            setLightboxOpen(true);
                          }}
                          className="aspect-square rounded-lg overflow-hidden border border-border hover:border-accent-primary transition-colors"
                        >
                          <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {lightboxOpen && allPhotos.length > 0 && (
                  <PhotoLightbox
                    photos={allPhotos}
                    initialIndex={lightboxIndex}
                    onClose={() => setLightboxOpen(false)}
                  />
                )}
              </div>
            ) : (
              <div className="mt-8">
                {loadingRatings ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-secondary">Loading spots...</div>
                  </div>
                ) : (
                  <ReviewProfileSection
                    userId={userId}
                    showRecentReviews={true}
                    maxReviews={20}
                    showEditDelete={false}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showReportModal && (
        <ReportModal
          contentType="profile"
          contentId={userId}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </Layout>
  );
}
