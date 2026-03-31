import { useEffect, useState, useRef, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { VEHICLE_OWNER_COLUMNS } from '../lib/vehicles';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { LogOut, Car, Upload, Award, Shield, MessageCircle, CheckCircle, Plus, MapPin, Zap, Target, Users, Crosshair, Share2 } from 'lucide-react';
import { shareToSocial } from '../components/ShareCardGenerator';
import { EditProfileModal } from '../components/EditProfileModal';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { uploadImage } from '../lib/storage';
import { ReactionButton } from '../components/ReactionButton';
import { getUserBadges, type UserBadge } from '../lib/badges';
import { CreditCard as Edit } from 'lucide-react';
import { BadgeCoin } from '../components/BadgeCoin';
import { getTierFromScore } from '../lib/tierConfig';
import { getBadgeImagePath } from '../lib/badgeUtils';
import { TIER_COLORS } from '../config/badgeConfig';

interface ProfilePageProps {
  onNavigate: OnNavigate;
  onViewVehicle: (vehicleId: string) => void;
  onSendMessage?: (recipientId: string) => void;
}

function ChangeArrow({ value }: { value: number }) {
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [_tagBreakdown, setTagBreakdown] = useState<{ tag: string; count: number }[]>([]);
  const [_profileViewCount, _setProfileViewCount] = useState(0);
  const [_activeQuests, setActiveQuests] = useState<any[]>([]);
  const [userStickers, setUserStickers] = useState<any[]>([]);
  const [pinnedBadges, setPinnedBadges] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSpotsGivenModal, setShowSpotsGivenModal] = useState(false);
  const [allPhotos, setAllPhotos] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showSpotsReceivedModal, setShowSpotsReceivedModal] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'fleet' | 'spots' | 'badges' | 'activity'>('fleet');
  const [spotsLoaded, setSpotsLoaded] = useState(false);
  const [spotsGiven, setSpotsGiven] = useState<any[]>([]);
  const [spotsReceived, setSpotsReceived] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [cityRank, setCityRank] = useState<number | null>(null);
  const [weeklySpots, setWeeklySpots] = useState(0);
  const [_weeklyReviews, setWeeklyReviews] = useState(0);
  const [_weeklyStickers, setWeeklyStickers] = useState(0);
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

  const loadSpotsGiven = async () => {
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

  const loadFollowersList = async () => {
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

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          bumper_stickers!vehicle_stickers_sticker_id_fkey(
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
        const sticker = item.bumper_stickers as any;
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      <div style={{ background: '#030508', minHeight: '100vh', paddingBottom: 100 }}>

        {/* ── 1. HERO — Identity Block ── */}
        <div style={{ background: '#0a0d14', position: 'relative' }}>
          {/* Cover strip — use featured vehicle image or dark fallback */}
          <div style={{ height: 80, background: '#0d1117', overflow: 'hidden', position: 'relative' }}>
            {featuredPhoto && (
              <img src={featuredPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
            )}
          </div>

          {/* Avatar overlapping cover */}
          <div style={{ marginTop: -28, position: 'relative', zIndex: 2, padding: '0 16px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#1e2a38',
                border: '3px solid #0a0d14', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#eef4f8' }}>
                    {(profile?.handle || '?')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Upload size={10} color="#7a8e9e" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </div>
          </div>

          {/* Name + Handle + Tier */}
          <div style={{ padding: '8px 16px 0' }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
              {profile?.handle || 'Anonymous'}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5a6e7e', marginTop: 2, letterSpacing: '0.05em' }}>
              @{profile?.handle || 'user'} · {tierInfo.name} Tier
            </div>
            {profile?.bio && (
              <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7a8e9e', marginTop: 4, lineHeight: 1.4 }}>
                {profile.bio}
              </div>
            )}
          </div>

          {/* Featured badges in hero */}
          {userBadges.length > 0 && (
            <div style={{ display: 'flex', gap: 6, padding: '8px 16px 0', flexWrap: 'wrap' }}>
              {userBadges.slice(0, 3).map((ub) => (
                <div key={ub.badge.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 4,
                  background: 'rgba(240,160,48,0.10)', border: '1px solid rgba(240,160,48,0.25)',
                }}>
                  <BadgeCoin
                    tier={((ub as any).tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'plat'}
                    name={ub.badge.name}
                    icon_path={getBadgeImagePath(ub.badge)}
                    size="sm"
                  />
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#f0a030' }}>
                    {ub.badge.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions row */}
          <div style={{ display: 'flex', gap: 8, padding: '10px 16px 0' }}>
            <button onClick={() => setShowEditModal(true)} style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.25)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', cursor: 'pointer' }}>
              Edit Profile
            </button>
            <button onClick={() => { if (user) shareToSocial({ type: 'profile', title: `@${profile?.handle || 'user'}`, userHandle: profile?.handle || 'user', userRep: repScore, deepLinkUrl: `${window.location.origin}/#/user-profile/${user.id}` }, user.id); }} style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7a8e9e', cursor: 'pointer' }}>
              Share
            </button>
            {profile?.role === 'admin' && (
              <button onClick={() => onNavigate('admin')} style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.25)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', cursor: 'pointer' }}>
                Admin
              </button>
            )}
            <button onClick={signOut} style={{ marginLeft: 'auto', padding: '6px 10px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, color: '#3a4e60', cursor: 'pointer' }}>
              <LogOut size={12} />
            </button>
          </div>

          {/* Stat strip — inline in hero per mockup */}
          <div style={{ display: 'flex', gap: 20, padding: '12px 16px 14px' }}>
            {[
              { label: 'Spots', value: spotCount },
              { label: 'Badges', value: userBadges.length },
              { label: 'Friends', value: followerCount },
            ].map(stat => (
              <div key={stat.label}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#eef4f8' }}>{stat.value}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5a6e7e', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginLeft: 5 }}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. FEATURED VEHICLE — cinematic card ── */}
        {featuredVehicle ? (
          <div
            onClick={() => onViewVehicle(featuredVehicle.id)}
            style={{ position: 'relative', width: '100%', height: 180, overflow: 'hidden', background: '#0d1117', cursor: 'pointer', borderTop: '1px solid rgba(249,115,22,0.08)' }}
          >
            {featuredPhoto ? (
              <img src={featuredPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7, display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e2a38" strokeWidth="1"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17H3v-6l2-5h9l4 5h3v6h-2"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.9) 0%, transparent 60%)' }} />
            <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316', marginBottom: 1 }}>
                {featuredVehicle.make || 'Vehicle'}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
                  {featuredVehicle.model || '—'}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#F97316', fontVariantNumeric: 'tabular-nums' }}>
                  {(featuredVehicle.reputation_score ?? 0).toLocaleString()} RP
                </div>
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: '#5a6e7e', letterSpacing: '0.08em', marginTop: 2 }}>
                {[featuredVehicle.year, featuredVehicle.trim, featuredVehicle.color].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px 16px', textAlign: 'center' as const, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#eef4f8', marginBottom: 4 }}>No Vehicle Yet</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', marginBottom: 12 }}>Claim your first vehicle to anchor your profile.</div>
            <button onClick={() => onNavigate('scan')} style={{ padding: '8px 20px', background: '#F97316', border: 'none', borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer' }}>
              Spot a Car
            </button>
          </div>
        )}

        {/* ── 3. FLEET — horizontal scroll ── */}
        {vehicles.length > 1 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
                Fleet · {vehicles.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '0 14px 14px', overflowX: 'auto', scrollbarWidth: 'none' as const }}>
              {vehicles.slice(1).map(v => {
                const vPhoto = v.profile_image_url || v.stock_image_url;
                return (
                  <div key={v.id} onClick={() => onViewVehicle(v.id)} style={{ flexShrink: 0, width: 140, borderRadius: 10, overflow: 'hidden', background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                    {vPhoto ? (
                      <img src={vPhoto} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: 90, background: '#111720', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3a4e60" strokeWidth="1"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17H3v-6l2-5h9l4 5h3v6h-2"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </div>
                    )}
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316', marginBottom: 1 }}>{v.make}</div>
                      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>{v.model}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 4. BADGES — visual showcase ── */}
        {userBadges.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
                Badges · {userBadges.length}
              </span>
              <span onClick={() => onNavigate('badges')} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', cursor: 'pointer' }}>
                View All
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '0 14px 14px' }}>
              {userBadges.slice(0, 8).map((ub) => (
                <div key={ub.badge.id} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4 }}>
                  <BadgeCoin
                    tier={((ub as any).tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'plat'}
                    name={ub.badge.name}
                    icon_path={getBadgeImagePath(ub.badge)}
                    size="md"
                  />
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#5a6e7e', textAlign: 'center' as const, lineHeight: 1.2, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {ub.badge.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 5. ACTIVITY — compact recent posts ── */}
        {userPosts.length > 0 && (
          <div>
            <div style={{ padding: '12px 16px 8px' }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
                Recent Activity
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
              {userPosts.slice(0, 5).map(post => (
                <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  {post.image_url && (
                    <div style={{ width: 40, height: 30, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: '#111720' }}>
                      <img src={post.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7a8e9e', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {post.caption || (post.post_type === 'spot' ? 'Spotted a vehicle' : 'Posted')}
                    </div>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a4e60', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{ display: 'flex', gap: 12, padding: '16px 16px 8px' }}>
          <button onClick={() => onNavigate('privacy')} style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#3a4e60', background: 'none', border: 'none', cursor: 'pointer' }}>Privacy</button>
          <button onClick={() => onNavigate('terms')} style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#3a4e60', background: 'none', border: 'none', cursor: 'pointer' }}>Terms</button>
        </div>
      </div>

      {/* Modals — preserved from existing */}
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
