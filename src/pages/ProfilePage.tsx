import { useEffect, useState, useRef, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { VEHICLE_OWNER_COLUMNS } from '../lib/vehicles';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { Award, BadgeCheck, Crosshair, Edit, LogOut, Shield, Share2, Target, Users, Wrench, Zap } from 'lucide-react';
import { shareToSocial } from '../components/ShareCardGenerator';
import { EditProfileModal } from '../components/EditProfileModal';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { uploadImage } from '../lib/storage';
import { getUserBadges, type UserBadge } from '../lib/badges';
import { getTierFromScore } from '../lib/tierConfig';
import { MotoFansSection } from '../components/MotoFansSection';
import { AlbumsModal } from '../components/AlbumsModal';

interface ProfilePageProps {
  onNavigate: OnNavigate;
  onViewVehicle: (vehicleId: string) => void;
  onSendMessage?: (recipientId: string) => void;
}

function _ChangeArrow({ value }: { value: number }) {
  if (value === 0) return <span className="mono" style={{ fontSize: 9, color: '#586878' }}>—</span>;
  const up = value > 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d={up ? 'M5 2L8 6H2L5 2Z' : 'M5 8L2 4H8L5 8Z'} fill={up ? '#5aaa7a' : '#cc5555'} />
      </svg>
      <span className="mono" style={{ fontSize: 10, fontWeight: 600, color: up ? '#5aaa7a' : '#cc5555' }}>
        {up ? '+' : ''}{value}
      </span>
    </span>
  );
}

function getTierColor(score: number) {
  if (score >= 3500) return { border: 'var(--gold-h)', glow: 'rgba(200,164,90,0.25)' };
  if (score >= 1000) return { border: 'var(--orange)', glow: 'rgba(249,115,22,0.2)' };
  return { border: 'var(--bronze-h)', glow: 'rgba(154,122,88,0.2)' };
}

export function ProfilePage({ onNavigate, onViewVehicle }: ProfilePageProps) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [_uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAlbumsModal, setShowAlbumsModal] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [_loadingPosts, setLoadingPosts] = useState(false);
  const [, setTagBreakdown] = useState<{ tag: string; count: number }[]>([]);
  const [activeQuests, setActiveQuests] = useState<any[]>([]);
  const [userStickers, setUserStickers] = useState<any[]>([]);
  const [pinnedBadges, setPinnedBadges] = useState<any[]>([]);
  const _fileInputRef = useRef<HTMLInputElement>(null);
  const [_showSpotsGivenModal, _setShowSpotsGivenModal] = useState(false);
  const [allPhotos, setAllPhotos] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, _setLightboxIndex] = useState(0);
  const [_showSpotsReceivedModal, _setShowSpotsReceivedModal] = useState(false);
  const [_showBadgesModal, _setShowBadgesModal] = useState(false);
  const [_showFollowersModal, _setShowFollowersModal] = useState(false);
  const [_showFollowingModal, _setShowFollowingModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'fleet' | 'spots' | 'friends' | 'posts'>('fleet');
  const [_spotsLoaded, _setSpotsLoaded] = useState(false);
  const [_spotsGiven, setSpotsGiven] = useState<any[]>([]);
  const [_spotsReceived, setSpotsReceived] = useState<any[]>([]);
  const [_followers, setFollowers] = useState<any[]>([]);
  const [_following, setFollowing] = useState<any[]>([]);
  const [cityRank, setCityRank] = useState<number | null>(null);
  const [weeklySpots, setWeeklySpots] = useState(0);
  const [weeklyReviews, setWeeklyReviews] = useState(0);
  const [weeklyStickers, setWeeklyStickers] = useState(0);
  const [fleetBadges, setFleetBadges] = useState<any[]>([]);

  const loadProfile = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .maybeSingle();

    setProfile(data);
    setLoading(false);

    // Compute city rank
    if (data?.location) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('location', data.location)
        .gt('reputation_score', data.reputation_score || 0);
      setCityRank((count || 0) + 1);
    }
  }, [user]);

  const loadVehicles = useCallback(async () => {
    const { data } = await supabase
      .from('vehicles')
      // PLATE: owner context
      .select(VEHICLE_OWNER_COLUMNS)
      .eq('owner_id', user!.id)
      .order('created_at', { ascending: false });

    if (data) {
      setVehicles(data);
      // Load fleet badges from vehicle_badges
      if (data.length > 0) {
        const vehicleIds = (data as any[]).map((v: any) => v.id);
        const { data: vBadges } = await supabase
          .from('vehicle_badges')
          .select('vehicle_id, badge_id, tier, sticker_count')
          .in('vehicle_id', vehicleIds)
          .order('sticker_count', { ascending: false });
        if (vBadges) setFleetBadges(vBadges);
      }
    }
  }, [user]);

  const loadUserBadges = useCallback(async () => {
    try {
      const badges = await getUserBadges(user!.id);
      setUserBadges(badges);
    } catch (error) {
      console.error('Failed to load user badges:', error);
    }
  }, [user]);

  const loadFollowCounts = useCallback(async () => {
    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user!.id)
      .eq('status', 'accepted');

    const { count: following } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user!.id)
      .eq('status', 'accepted');

    setFollowerCount(followers || 0);
    setFollowingCount(following || 0);
  }, [user]);


  const loadUserPosts = useCallback(async () => {
    if (!user) return;

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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data && !error) {
      const postIds = data.map(p => p.id);

      // Batch fetch all reactions + comments in 2 queries instead of 2N
      const [reactionsRes, commentsRes] = await Promise.all([
        supabase.from('reactions').select('post_id').in('post_id', postIds),
        supabase.from('post_comments').select('post_id').in('post_id', postIds),
      ]);

      const likeCounts: Record<string, number> = {};
      const commentCounts: Record<string, number> = {};
      (reactionsRes.data || []).forEach((r: any) => { likeCounts[r.post_id] = (likeCounts[r.post_id] || 0) + 1; });
      (commentsRes.data || []).forEach((c: any) => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1; });

      setUserPosts(data.map(post => ({
        ...post,
        like_count: likeCounts[post.id] || 0,
        comment_count: commentCounts[post.id] || 0,
      })));
    }
    setLoadingPosts(false);
  }, [user]);

  const loadTagBreakdown = useCallback(async () => {
    if (!user) return;

    const { data: userVehicles } = await supabase
      .from('vehicles')
      .select('id')
      .eq('owner_id', user.id);

    if (!userVehicles || userVehicles.length === 0) return;

    const vehicleIds = userVehicles.map(v => v.id);

    const { data: postsData } = await supabase
      .from('posts')
      .select('id')
      .in('vehicle_id', vehicleIds);

    if (!postsData || postsData.length === 0) return;

    const postIds = postsData.map(p => p.id);

    const { data: tagsData } = await supabase
      .from('review_tags')
      .select('tag_label')
      .in('post_id', postIds);

    if (tagsData && tagsData.length > 0) {
      const tagCounts: { [key: string]: number } = {};
      tagsData.forEach(tag => {
        tagCounts[tag.tag_label] = (tagCounts[tag.tag_label] || 0) + 1;
      });

      const breakdown = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

      setTagBreakdown(breakdown);
    }
  }, [user]);

  const loadProfileViews = async () => {
    // profile_views table not yet created in Supabase — skip query to avoid 400 errors
  };

  const loadActiveQuests = useCallback(async () => {
    if (!user) return;

    const { data: questsData } = await supabase
      .from('quests')
      .select(`
        *,
        user_quest_progress!left(
          current_count,
          completed_at,
          reward_claimed
        )
      `)
      .eq('is_active', true)
      .eq('user_quest_progress.user_id', user.id)
      .order('sort_order', { ascending: true });

    if (questsData) {
      const questsWithProgress = questsData.map(quest => ({
        ...quest,
        progress: quest.user_quest_progress?.[0] || { current_count: 0, completed_at: null, reward_claimed: false }
      }));

      const incompleteQuests = questsWithProgress.filter(q => !q.progress.completed_at);
      setActiveQuests(incompleteQuests);
    }
  }, [user]);

  const loadPinnedBadges = useCallback(async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('pinned_badges')
      .eq('id', user.id)
      .single();

    if (profileData?.pinned_badges && Array.isArray(profileData.pinned_badges) && profileData.pinned_badges.length > 0) {
      const { data: badgesData } = await supabase
        .from('badges')
        .select('id, name, icon_name, category')
        .in('id', profileData.pinned_badges);

      if (badgesData) {
        const sortedBadges = profileData.pinned_badges
          .map(id => badgesData.find(b => b.id === id))
          .filter(Boolean);
        setPinnedBadges(sortedBadges);
      }
    }
  }, [user]);

  const _loadSpotsGiven = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('spot_history')
      .select(`
        id,
        created_at,
        vehicle:vehicles(id, make, model, year, plate_state, plate_number)
      `)
      .eq('spotter_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setSpotsGiven(data.filter(s => s.vehicle));
  };

  const _loadSpotsReceived = async () => {
    if (!user) return;
    const { data: userVehicles } = await supabase
      .from('vehicles')
      .select('id')
      .eq('owner_id', user.id);

    if (!userVehicles || userVehicles.length === 0) return;

    const vehicleIds = userVehicles.map(v => v.id);
    const { data } = await supabase
      .from('spot_history')
      .select(`
        id,
        created_at,
        vehicle:vehicles(id, make, model, year, plate_state, plate_number),
        spotter:profiles!spot_history_spotter_id_fkey(handle, avatar_url)
      `)
      .in('vehicle_id', vehicleIds)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setSpotsReceived(data.filter(s => s.vehicle));
  };

  const _loadFollowersList = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('follows')
      .select(`
        follower:profiles!follows_follower_id_fkey(id, handle, avatar_url, reputation_score)
      `)
      .eq('following_id', user.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });
    if (data) setFollowers(data.map(f => f.follower));
  };

  const _loadFollowingList = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('follows')
      .select(`
        following:profiles!follows_following_id_fkey(id, handle, avatar_url, reputation_score)
      `)
      .eq('follower_id', user.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });
    if (data) setFollowing(data.map(f => f.following));
  };

  const loadAllPhotos = useCallback(async () => {
    if (!user) return;

    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('photos')
      .eq('owner_id', user.id);

    const photos: string[] = [];
    vehicleData?.forEach((v: any) => {
      if (v.photos && Array.isArray(v.photos)) {
        v.photos.forEach((p: any) => {
          if (p.url) photos.push(p.url);
        });
      }
    });

    setAllPhotos(photos);
  }, [user]);

  const loadWeeklyPulse = useCallback(async () => {
    if (!user) return;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [spotsRes, reviewsRes] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('post_type', 'spot').gte('created_at', weekAgo),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('post_type', 'review').gte('created_at', weekAgo),
    ]);

    setWeeklySpots(spotsRes.count || 0);
    setWeeklyReviews(reviewsRes.count || 0);

    // Stickers earned this week
    try {
      const { data: userVehicles } = await supabase.from('vehicles').select('id').eq('owner_id', user.id);
      if (userVehicles && userVehicles.length > 0) {
        const { count } = await supabase
          .from('vehicle_stickers')
          .select('*', { count: 'exact', head: true })
          .in('vehicle_id', userVehicles.map(v => v.id))
          .gte('created_at', weekAgo);
        setWeeklyStickers(count || 0);
      }
    } catch { /* intentionally empty */ }
  }, [user]);

  const _handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const _photoUrl = await uploadImage(file, 'profiles');
      await loadAllPhotos();
      onNavigate('feed');
    } catch (error) {
      console.error('Failed to upload photo:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const loadUserStickers = useCallback(async () => {
    if (!user) return;

    try {
      const { data: userVehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('owner_id', user.id);

      if (vehiclesError || !userVehicles || userVehicles.length === 0) {
        setUserStickers([]);
        return;
      }

      const vehicleIds = userVehicles.map(v => v.id);

      const { data: stickersData, error: stickersError } = await supabase
        .from('vehicle_stickers')
        .select(`
          id,
          sticker_id,
          sticker_definitions!vehicle_stickers_sticker_id_fkey(
            id,
            name,
            description,
            icon_name,
            category,
            color
          )
        `)
        .in('vehicle_id', vehicleIds);

      if (stickersError) {
        console.error('Error loading stickers:', stickersError);
        setUserStickers([]);
        return;
      }

      const stickerMap = new Map();
      stickersData?.forEach((item: any) => {
        const sticker = item.sticker_definitions as any;
        if (!sticker) return;

        if (!stickerMap.has(sticker.id)) {
          stickerMap.set(sticker.id, {
            ...sticker,
            count: 0
          });
        }
        stickerMap.get(sticker.id).count++;
      });

      setUserStickers(Array.from(stickerMap.values()));
    } catch (error) {
      console.error('Error loading user stickers:', error);
      setUserStickers([]);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadVehicles();
      loadUserBadges();
      loadFollowCounts();
      loadUserPosts();
      loadTagBreakdown();
      loadProfileViews();
      loadActiveQuests();
      loadUserStickers();
      loadPinnedBadges();
      loadAllPhotos();
      loadWeeklyPulse();
    }
  }, [user, loadProfile, loadVehicles, loadUserBadges, loadFollowCounts, loadUserPosts, loadTagBreakdown, loadActiveQuests, loadUserStickers, loadPinnedBadges, loadAllPhotos, loadWeeklyPulse]);

  const _handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert(`Invalid file type. Please upload: ${allowedTypes.join(', ')}`);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { data: _uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error(`Profile update failed: ${updateError.message}`);
      }

      setProfile({ ...profile, avatar_url: publicUrl });
      alert('Profile photo updated successfully!');
    } catch (error: unknown) {
      console.error('Error uploading photo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to upload photo: ${errorMessage}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Derived data
  const repScore = profile?.reputation_score || 0;
  const tierInfo = getTierFromScore(repScore);
  const tierColor = getTierColor(repScore);
  const spotCount = userPosts.filter(p => p.post_type === 'spot').length;
  const nextTierTarget = repScore >= 3500 ? null : repScore >= 1000 ? 3500 : 1000;
  const nextTierProgress = nextTierTarget ? Math.min(100, Math.round((repScore / nextTierTarget) * 100)) : 100;
  const latestPinnedBadge = pinnedBadges[0] || userBadges[0] || null;
  const profileMomentum = [
    { label: 'Weekly Spots', value: weeklySpots, icon: Crosshair, color: '#F97316' },
    { label: 'Garage Stickers', value: userStickers.length, icon: Zap, color: '#f0a030' },
    { label: 'Fleet Badges', value: fleetBadges.length, icon: Shield, color: '#20c060' },
    { label: 'Following', value: followingCount, icon: Users, color: '#60a5fa' },
  ];

  const nextActions = [
    activeQuests[0] ? {
      label: 'Active Quest',
      title: activeQuests[0].title || activeQuests[0].name || 'Quest available',
      detail: 'Complete it before it disappears',
      icon: Target,
      color: '#f0a030',
      action: () => onNavigate('challenges'),
    } : null,
    {
      label: 'Fastest RP',
      title: weeklySpots > 0 ? 'Keep the week alive' : 'Log a spot',
      detail: weeklySpots > 0 ? `${weeklySpots} spot${weeklySpots === 1 ? '' : 's'} this week` : 'Spot a car to start momentum',
      icon: Crosshair,
      color: '#F97316',
      action: () => onNavigate('scan'),
    },
    vehicles.length > 0 ? {
      label: 'Garage Move',
      title: fleetBadges.length > 0 ? 'Upgrade the fleet story' : 'Add build proof',
      detail: weeklyStickers > 0 ? `${weeklyStickers} sticker${weeklyStickers === 1 ? '' : 's'} earned this week` : 'Photos, mods, and stickers raise credibility',
      icon: Wrench,
      color: '#20c060',
      action: () => onViewVehicle(vehicles[0].id),
    } : {
      label: 'Garage Move',
      title: 'Claim your first vehicle',
      detail: 'Your profile gets stronger once a car is attached',
      icon: BadgeCheck,
      color: '#20c060',
      action: () => onNavigate('claim-vehicle'),
    },
  ].filter(Boolean) as Array<{
    label: string;
    title: string;
    detail: string;
    icon: typeof Crosshair;
    color: string;
    action: () => void;
  }>;


  // Featured vehicle = first owned vehicle
  const featuredVehicle = vehicles[0] || null;
  const featuredPhoto = featuredVehicle?.profile_image_url || featuredVehicle?.stock_image_url || null;

  if (loading) {
    return (
      <Layout currentPage="profile" onNavigate={onNavigate}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
          <div style={{ width: 24, height: 24, border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#F97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div className="page-enter" style={{ background: '#030508', minHeight: '100vh', paddingBottom: 100 }}>

        {/* ── 1. HERO — Full bleed vehicle image, identity overlaid ── */}
        <div style={{ position: 'relative', width: '100%', height: 300, overflow: 'hidden', flexShrink: 0 }}>
          {/* Vehicle image fills entire hero */}
          {featuredPhoto ? (
            <img
              src={featuredPhoto}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(160deg, #0c1826 0%, #0a1220 30%, #060c16 60%, #030508 100%)',
            }} />
          )}

          {/* Top fade — status bar legibility */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 80,
            background: 'linear-gradient(to bottom, rgba(3,5,8,0.6) 0%, transparent 100%)',
          }} />

          {/* Bottom fade — identity legibility */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
            background: 'linear-gradient(to bottom, transparent 0%, rgba(3,5,8,0.75) 45%, #030508 100%)',
          }} />

          {/* Edit pill — floating top right */}
          <button
            onClick={() => setShowEditModal(true)}
            style={{
              position: 'absolute', top: 52, right: 16, zIndex: 10,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
              letterSpacing: '.8px', textTransform: 'uppercase',
              padding: '5px 13px',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20,
              color: 'rgba(255,255,255,0.85)', background: 'rgba(3,5,8,0.5)',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            <Edit size={11} />
            Edit Profile
          </button>

          {/* Identity — overlaid at bottom of hero */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 14px' }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '.5px' }}>
              {profile?.handle || 'Anonymous'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
                letterSpacing: '1px', textTransform: 'uppercase', padding: '2px 8px',
                border: `1px solid ${tierColor.border}`, borderRadius: 2,
                color: tierColor.border, background: tierColor.glow,
              }}>
                {tierInfo.name}
              </span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: 'rgba(249,115,22,0.7)', letterSpacing: '.3px' }}>
                {repScore.toLocaleString()} RP
              </span>
            </div>
            {profile?.bio && (
              <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4, lineHeight: 1.35 }}>
                {profile.bio}
              </div>
            )}
            {/* Sign out and share — minimal, bottom right */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => shareToSocial({ type: 'profile', title: `@${profile?.handle || 'user'}`, userHandle: profile?.handle || 'user', userRep: repScore, deepLinkUrl: `${window.location.origin}/#/user-profile/${user!.id}` }, user!.id)}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', padding: '4px 10px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2, color: 'rgba(255,255,255,0.4)', background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Share2 size={11} />
                Share
              </button>
              {profile?.role === 'admin' && (
                <button onClick={() => onNavigate('admin')} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', padding: '4px 10px', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 2, color: '#F97316', background: 'rgba(249,115,22,0.06)', cursor: 'pointer' }}>
                  Admin
                </button>
              )}
              <button
                onClick={signOut}
                style={{ marginLeft: 'auto', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', padding: '4px 10px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, color: 'rgba(255,255,255,0.25)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <LogOut size={11} />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat strip ── */}
        <div style={{ display: 'flex', borderTop: '1px solid rgba(249,115,22,0.12)', borderBottom: '1px solid rgba(249,115,22,0.12)', background: '#030508' }}>
          {[
            { label: 'RP', value: repScore.toLocaleString(), orange: true },
            { label: 'Vehicles', value: vehicles.length },
            { label: 'Friends', value: followerCount },
            { label: 'Spots', value: spotCount },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '11px 0', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div className="mr-stat-num" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 500, color: stat.orange ? '#F97316' : '#fff', lineHeight: 1, animationDelay: `${i * 0.07}s` }}>{stat.value}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', color: '#4B5563' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <section style={{ margin: '14px 12px 16px', border: '1px solid rgba(249,115,22,0.16)', borderRadius: 10, background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(10,13,20,0.96) 42%, rgba(96,165,250,0.06))', overflow: 'hidden' }}>
          <div style={{ padding: '14px 14px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: '#F97316', marginBottom: 3 }}>
                Driver Momentum
              </div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.05 }}>
                {nextTierTarget ? `${(nextTierTarget - repScore).toLocaleString()} RP to next tier` : 'Top tier status active'}
              </div>
              {latestPinnedBadge && (
                <div style={{ marginTop: 4, fontFamily: "'Barlow', sans-serif", fontSize: 12, color: 'rgba(238,244,248,0.58)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={13} color="#f0a030" />
                  Latest badge: {latestPinnedBadge.name || latestPinnedBadge.badge_id || 'Unlocked'}
                </div>
              )}
            </div>
            <div style={{ width: 56, height: 56, borderRadius: 8, border: '1px solid rgba(249,115,22,0.22)', background: 'rgba(3,5,8,0.65)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Target size={16} color="#F97316" />
              <span style={{ marginTop: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: '#eef4f8' }}>#{cityRank || '-'}</span>
            </div>
          </div>
          <div style={{ padding: '0 14px 12px' }}>
            <div style={{ height: 5, borderRadius: 5, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${nextTierProgress}%`, background: 'linear-gradient(90deg, #F97316, #f0a030)' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {profileMomentum.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={item.label} style={{ padding: '10px 6px', textAlign: 'center', borderRight: i < profileMomentum.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <Icon size={14} color={item.color} />
                  <div style={{ marginTop: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: '#eef4f8' }}>{item.value}</div>
                  <div style={{ marginTop: 1, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '.6px', textTransform: 'uppercase', color: '#5a6e7e', whiteSpace: 'nowrap' }}>{item.label}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ margin: '0 12px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {nextActions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={`${item.label}-${item.title}`}
                onClick={item.action}
                style={{
                  minWidth: 0,
                  minHeight: 126,
                  padding: '12px 10px',
                  textAlign: 'left',
                  background: '#0a0d14',
                  border: `1px solid ${item.color}33`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 10,
                  boxShadow: `0 0 0 1px rgba(255,255,255,0.02), inset 0 1px 0 rgba(255,255,255,0.03)`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: item.color }}>
                    {item.label}
                  </span>
                  <Icon size={15} color={item.color} strokeWidth={1.7} />
                </div>
                <div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 17, fontWeight: 700, color: '#eef4f8', lineHeight: 1.02 }}>
                    {item.title}
                  </div>
                  <div style={{ marginTop: 5, fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7a8e9e', lineHeight: 1.3 }}>
                    {item.detail}
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {(weeklyReviews > 0 || weeklyStickers > 0) && (
          <div style={{ margin: '0 12px 16px', padding: '10px 12px', borderRadius: 8, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)', fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#9aaebc', lineHeight: 1.35 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#F97316', marginRight: 6 }}>Weekly Pulse</span>
            {weeklyReviews} review{weeklyReviews === 1 ? '' : 's'} and {weeklyStickers} garage sticker{weeklyStickers === 1 ? '' : 's'} are already feeding your reputation loop.
          </div>
        )}

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
                borderBottom: '2px solid transparent',
                cursor: 'pointer',
                position: 'relative' as const,
                transition: 'color 0.2s',
              }}
            >
              {tab}
              {activeTab === tab && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                  background: '#F97316', transformOrigin: 'left',
                  animation: 'motorate-tab-slide 0.25s cubic-bezier(0.16,1,0.3,1) both',
                }} />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        {activeTab === 'fleet' && (
          <div>
            {vehicles.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>No vehicles yet</div>
                <button onClick={() => onNavigate('scan')} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '8px 20px', background: '#F97316', border: 'none', borderRadius: 2, color: '#030508', cursor: 'pointer' }}>Spot a Car</button>
              </div>
            ) : (
              <>
                {/* Photo grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, background: '#010203', padding: 2 }}>
                  {vehicles.map(v => {
                    const photo = v.profile_image_url || v.stock_image_url;
                    return (
                      <div key={v.id} onClick={() => onViewVehicle(v.id)} style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden', background: '#0a0d12', cursor: 'pointer' }}>
                        {photo ? (
                          <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #0a1520, #060c16)' }} />
                        )}
                        {/* owner dot */}
                        <div style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: '#F97316', boxShadow: '0 0 8px rgba(249,115,22,0.7)' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '5px 7px 6px', background: 'linear-gradient(transparent, rgba(3,5,8,0.85))' }}>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#F97316', letterSpacing: '1.5px' }}>
                            {v.plate_number ? `${v.plate_number} · ${v.plate_state || ''}` : `${v.make || ''}`}
                          </div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                            {(v.reputation_score || 0).toLocaleString()} RP
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Detail rows */}
                {vehicles.map(v => {
                  const photo = v.profile_image_url || v.stock_image_url;
                  return (
                    <div key={v.id} onClick={() => onViewVehicle(v.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: '#030508', cursor: 'pointer' }}>
                      <div style={{ width: 60, height: 40, borderRadius: 2, overflow: 'hidden', flexShrink: 0, background: '#0a0d12' }}>
                        {photo && <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.1 }}>
                          {[v.year, v.make, v.model].filter(Boolean).join(' ')}
                        </div>
                        {v.plate_number && (
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#F97316', letterSpacing: '2px', marginTop: 1 }}>
                            {v.plate_number} · {v.plate_state}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#4B5563' }}><span style={{ color: '#9CA3AF' }}>{(v.reputation_score || 0).toLocaleString()}</span> RP</span>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#4B5563' }}><span style={{ color: '#9CA3AF' }}>{v.fans_count || 0}</span> Fans</span>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#4B5563' }}><span style={{ color: '#9CA3AF' }}>{v.spots_count || 0}</span> Spots</span>
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
            {userPosts.filter(p => p.post_type === 'spot').length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>No spots yet</div>
                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#374151' }}>Get out there and spot some cars.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, background: '#010203', padding: 2 }}>
                {userPosts.filter(p => p.post_type === 'spot').map(post => (
                  <div key={post.id} style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden', background: '#0a0d12' }}>
                    {post.image_url ? (
                      <img src={post.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #0a1520, #060c16)' }} />
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '5px 7px 6px', background: 'linear-gradient(transparent, rgba(3,5,8,0.85))' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div>
            <div style={{ padding: '12px 16px 6px' }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#4B5563' }}>
                {followerCount} Friends
              </span>
            </div>
            {/* MotoFans section lives here */}
            {user && <MotoFansSection userId={user.id} onNavigate={onNavigate} />}
          </div>
        )}

        {activeTab === 'posts' && (
          <div>
            {userPosts.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 600, color: '#6B7280' }}>No posts yet</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, background: '#010203', padding: 2 }}>
                {userPosts.map(post => (
                  <div key={post.id} style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden', background: '#0a0d12' }}>
                    {post.image_url ? (
                      <img src={post.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #0a1520, #060c16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#2D3748', letterSpacing: '.5px' }}>No Photo</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer links */}
        <div style={{ display: 'flex', gap: 12, padding: '16px 16px 8px' }}>
          <button onClick={() => onNavigate('privacy')} style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#374151', background: 'none', border: 'none', cursor: 'pointer' }}>Privacy</button>
          <button onClick={() => onNavigate('terms')} style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#374151', background: 'none', border: 'none', cursor: 'pointer' }}>Terms</button>
        </div>
      </div>

      {/* Modals — preserved from existing */}
      {showAlbumsModal && (
        <AlbumsModal onClose={() => setShowAlbumsModal(false)} />
      )}

      {showEditModal && profile && (
        <EditProfileModal profile={profile} onClose={() => setShowEditModal(false)} onSave={loadProfile} />
      )}

      {lightboxOpen && allPhotos.length > 0 && (
        <PhotoLightbox photos={allPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
