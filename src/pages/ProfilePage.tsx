import { useEffect, useState, useRef, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { LogOut, Car, Upload, Award, Shield, MessageCircle, CheckCircle, Plus, MapPin, Zap, Layers, Target, Eye, Users, Star as StarIcon, Crosshair, Sticker } from 'lucide-react';
import { EditProfileModal } from '../components/EditProfileModal';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { uploadImage } from '../lib/storage';
import { ReactionButton } from '../components/ReactionButton';
import { getUserBadges, type UserBadge } from '../lib/badges';
import { ReviewProfileSection } from '../components/ReviewProfileSection';
import { CreditCard as Edit } from 'lucide-react';
import { BadgeCoin } from '../components/BadgeCoin';

interface ProfilePageProps {
  onNavigate: OnNavigate;
  onViewVehicle: (vehicleId: string) => void;
  onSendMessage?: (recipientId: string) => void;
}

function CountUp({ target, duration = 800 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);

  return <span className="font-mono font-semibold text-primary">{current.toLocaleString()}</span>;
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

const TIERS = [
  { name: 'Rookie',     min: 0 },
  { name: 'Prospect',   min: 100 },
  { name: 'Contender',  min: 300 },
  { name: 'Competitor', min: 600 },
  { name: 'Veteran',    min: 1000 },
  { name: 'Expert',     min: 2000 },
  { name: 'Master',     min: 3500 },
  { name: 'Legend',      min: 5500 },
  { name: 'Icon',       min: 8000 },
];

function getTierInfo(score: number) {
  let current = TIERS[0];
  let nextTier = TIERS[1];
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (score >= TIERS[i].min) {
      current = TIERS[i];
      nextTier = TIERS[i + 1] || null;
      break;
    }
  }
  const isMax = !nextTier;
  const nextMin = nextTier?.min ?? current.min;
  const range = nextMin - current.min;
  const progress = isMax ? 100 : range > 0 ? Math.min(((score - current.min) / range) * 100, 100) : 100;
  const remaining = isMax ? 0 : nextMin - score;
  return { name: current.name, nextName: nextTier?.name || current.name, progress, nextMin, remaining, isMax };
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
  const [tagBreakdown, setTagBreakdown] = useState<{ tag: string; count: number }[]>([]);
  const [profileViewCount, setProfileViewCount] = useState(0);
  const [activeQuests, setActiveQuests] = useState<any[]>([]);
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
  const [spotsGiven, setSpotsGiven] = useState<any[]>([]);
  const [spotsReceived, setSpotsReceived] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [cityRank, setCityRank] = useState<number | null>(null);
  const [weeklySpots, setWeeklySpots] = useState(0);
  const [weeklyReviews, setWeeklyReviews] = useState(0);
  const [weeklyStickers, setWeeklyStickers] = useState(0);

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
  }, [user]);


  const loadProfile = async () => {
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
  };

  const loadVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('owner_id', user!.id)
      .order('created_at', { ascending: false });

    if (data) setVehicles(data);
  };

  const loadUserBadges = async () => {
    try {
      const badges = await getUserBadges(user!.id);
      setUserBadges(badges);
    } catch (error) {
      console.error('Failed to load user badges:', error);
    }
  };

  const loadFollowCounts = async () => {
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
  };


  const loadUserPosts = async () => {
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
  };

  const loadTagBreakdown = async () => {
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
  };

  const loadProfileViews = async () => {
    // profile_views table not yet created in Supabase — skip query to avoid 400 errors
  };

  const loadActiveQuests = async () => {
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
  };

  const loadPinnedBadges = async () => {
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
  };

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

  const loadSpotsReceived = async () => {
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

  const loadFollowingList = async () => {
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

  const loadAllPhotos = async () => {
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
  };

  const loadWeeklyPulse = async () => {
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
    } catch {}
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const photoUrl = await uploadImage(file, 'profile-photos');
      await loadAllPhotos();
      onNavigate('feed');
    } catch (error) {
      console.error('Failed to upload photo:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const loadUserStickers = async () => {
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
        const sticker = item.bumper_stickers;
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
  };

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

      const { data: uploadData, error: uploadError } = await supabase.storage
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
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Failed to upload photo: ${errorMessage}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Derived data
  const repScore = profile?.reputation_score || 0;
  const tier = getTierInfo(repScore);
  const tierColor = getTierColor(repScore);
  const spotCount = userPosts.filter(p => p.post_type === 'spot').length;
  const reviewCount = userPosts.filter(p => p.post_type === 'review').length;

  // Rep breakdown estimates
  const repBreakdown = useMemo(() => {
    const total = repScore || 1;
    const spotEst = spotCount * 10;
    const reviewEst = reviewCount * 15;
    const badgeEst = userBadges.length * 25;
    const communityEst = Math.max(0, total - spotEst - reviewEst - badgeEst);
    return [
      { label: 'Spotting', value: spotEst, color: '#F97316', hint: 'Points from spotting vehicles' },
      { label: 'Reviews', value: reviewEst, color: '#fb923c', hint: 'Points from detailed reviews' },
      { label: 'Community', value: communityEst, color: '#5aaa7a', hint: 'Likes, comments, follows' },
      { label: 'Badges', value: badgeEst, color: '#c8a45a', hint: 'Badge achievement awards' },
    ];
  }, [repScore, spotCount, reviewCount, userBadges.length]);

  if (loading) {
    return (
      <Layout currentPage="profile" onNavigate={onNavigate}>
        <div className="flex items-center justify-center py-16">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--border-3)', borderTopColor: 'var(--accent)' }}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div className="pb-24 page-enter">

        {/* ═══ Hero Card ═══ */}
        <div className="px-4 pt-4 pb-2 v3-stagger v3-stagger-1">
          <div className="card-v3 p-4">
            {/* Top: Avatar + Info + Actions */}
            <div className="flex items-start gap-4">
              {/* Avatar with tier ring */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-16 h-16 rounded-full overflow-hidden"
                  style={{
                    border: `3px solid ${tierColor.border}`,
                    boxShadow: `0 0 16px ${tierColor.glow}`,
                  }}
                >
                  {(profile?.avatar_url || profile?.profile_car_image) ? (
                    <img src={profile?.avatar_url || profile?.profile_car_image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--s2)' }}>
                      <Car className="w-7 h-7" style={{ color: 'var(--t4)' }} strokeWidth={1} />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--s2)', border: '1px solid var(--border-2)' }}
                >
                  {uploadingPhoto ? (
                    <div className="w-3 h-3 border border-current rounded-full animate-spin" style={{ borderTopColor: 'transparent' }} />
                  ) : (
                    <Upload className="w-3 h-3" style={{ color: 'var(--t3)' }} strokeWidth={1.5} />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {/* Handle + Location */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--t1)' }}>
                    {profile?.handle || 'Anonymous'}
                  </h2>
                  {profile?.role === 'owner' && (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--orange)' }} strokeWidth={2} />
                  )}
                </div>
                {profile?.bio && (
                  <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5, fontWeight: 300 }} className="mb-1 line-clamp-2">
                    {profile.bio}
                  </p>
                )}
                {profile?.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" strokeWidth={1.2} style={{ color: 'var(--t4)' }} />
                    <span style={{ fontSize: 11, fontWeight: 300, color: 'var(--t3)' }}>{profile.location}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 flex-shrink-0">
                {profile?.role === 'admin' && (
                  <button
                    onClick={() => onNavigate('admin')}
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center btn-press"
                    style={{ background: 'var(--s2)', border: '1px solid var(--border-2)' }}
                    title="Admin Dashboard"
                  >
                    <Shield className="w-5 h-5" style={{ color: 'var(--orange)' }} strokeWidth={1.5} />
                  </button>
                )}
                <button
                  onClick={() => setShowEditModal(true)}
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center btn-press"
                  style={{ background: 'var(--s2)', border: '1px solid var(--border-2)' }}
                >
                  <Edit className="w-3.5 h-3.5" style={{ color: 'var(--t3)' }} strokeWidth={1.5} />
                </button>
                <button
                  onClick={signOut}
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center btn-press"
                  style={{ background: 'var(--s2)', border: '1px solid var(--border-2)' }}
                >
                  <LogOut className="w-3.5 h-3.5" style={{ color: 'var(--t3)' }} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Rep Score + City Rank */}
            <div className="flex items-center gap-4 mt-4 px-1">
              <div>
                <span
                  className="mono"
                  style={{ fontSize: 28, fontWeight: 700, color: 'var(--orange)', textShadow: '0 0 20px rgba(249,115,22,.2)', lineHeight: 1 }}
                >
                  {repScore.toLocaleString()}
                </span>
                <span className="mono" style={{ fontSize: 10, fontWeight: 500, color: 'var(--t3)', marginLeft: 4 }}>RP</span>
              </div>
              <div style={{ width: 1, height: 28, background: 'var(--border-2)' }} />
              <div>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)' }}>
                  #{cityRank || '—'}
                </span>
                <span style={{ fontSize: 10, fontWeight: 300, color: 'var(--t3)', marginLeft: 4 }}>
                  in {profile?.location || 'your city'}
                </span>
              </div>
            </div>

            {/* Pinned Badges Trophy Shelf */}
            {pinnedBadges.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {pinnedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-[6px]"
                    style={{ background: 'var(--s2)', border: '1px solid var(--border)', fontSize: 10, color: 'var(--t2)' }}
                  >
                    <Award className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--gold-h)' }} strokeWidth={1.5} />
                    {badge.name}
                  </div>
                ))}
              </div>
            )}

            {/* Stats Strip */}
            <div className="grid grid-cols-5 gap-0 mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={async () => { await loadSpotsGiven(); setShowSpotsGivenModal(true); }}
                className="text-center hover:opacity-70 transition-opacity btn-press"
              >
                <div className="stat-pop-1"><CountUp target={spotCount} /></div>
                <div style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: 'var(--t4)', marginTop: 2 }}>Spotted</div>
              </button>
              <button
                onClick={() => setShowBadgesModal(true)}
                className="text-center hover:opacity-70 transition-opacity btn-press"
              >
                <div className="stat-pop-2"><CountUp target={reviewCount} /></div>
                <div style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: 'var(--t4)', marginTop: 2 }}>Reviews</div>
              </button>
              <button
                className="text-center hover:opacity-70 transition-opacity btn-press"
                onClick={() => {}}
              >
                <div className="stat-pop-3"><CountUp target={vehicles.length} /></div>
                <div style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: 'var(--t4)', marginTop: 2 }}>Garage</div>
              </button>
              <button
                onClick={async () => { await loadFollowersList(); setShowFollowersModal(true); }}
                className="text-center hover:opacity-70 transition-opacity btn-press"
              >
                <div className="stat-pop-4"><CountUp target={followerCount} /></div>
                <div style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: 'var(--t4)', marginTop: 2 }}>Followers</div>
              </button>
              <button
                onClick={async () => { await loadFollowingList(); setShowFollowingModal(true); }}
                className="text-center hover:opacity-70 transition-opacity btn-press"
              >
                <div className="stat-pop-5"><CountUp target={followingCount} /></div>
                <div style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: 'var(--t4)', marginTop: 2 }}>Following</div>
              </button>
            </div>
          </div>
        </div>

        {/* ═══ Weekly Pulse ═══ */}
        <div className="px-4 mt-4 v3-stagger v3-stagger-2">
          <div className="flex items-center gap-1.5 mb-3">
            <Zap className="w-3 h-3" strokeWidth={1.4} style={{ color: 'var(--orange)' }} />
            <span style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '2.5px', color: 'var(--t3)' }}>
              Weekly Pulse
            </span>
          </div>
          <div className="card-v3 overflow-hidden">
            {[
              { icon: <Eye className="w-4 h-4" strokeWidth={1.2} />, label: 'Profile Views', value: profileViewCount, change: 0 },
              { icon: <Users className="w-4 h-4" strokeWidth={1.2} />, label: 'New Followers', value: followerCount, change: 0 },
              { icon: <Crosshair className="w-4 h-4" strokeWidth={1.2} />, label: 'Spots Given', value: weeklySpots, change: weeklySpots },
              { icon: <Car className="w-4 h-4" strokeWidth={1.2} />, label: 'Spots Received', value: 0, change: 0 },
              { icon: <Award className="w-4 h-4" strokeWidth={1.2} />, label: 'Stickers Earned', value: weeklyStickers, change: weeklyStickers },
            ].map((row, i) => (
              <div
                key={row.label}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}
              >
                <span style={{ color: 'var(--t4)' }}>{row.icon}</span>
                <span className="flex-1" style={{ fontSize: 13, fontWeight: 300, color: 'var(--t2)' }}>{row.label}</span>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginRight: 8 }}>{row.value}</span>
                <ChangeArrow value={row.change} />
              </div>
            ))}
          </div>
        </div>

        {/* ═══ Rep Breakdown ═══ */}
        <div className="px-4 mt-4 v3-stagger v3-stagger-3">
          <div className="flex items-center gap-1.5 mb-3">
            <Layers className="w-3 h-3" strokeWidth={1.4} style={{ color: 'var(--orange)' }} />
            <span style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '2.5px', color: 'var(--t3)' }}>
              Rep Breakdown
            </span>
          </div>
          <div className="card-v3 p-4 space-y-4">
            {repBreakdown.map((item) => {
              const pct = repScore > 0 ? Math.max(2, (item.value / repScore) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--t2)' }}>{item.label}</span>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: item.color }}>
                      {item.value.toLocaleString()} RP
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.06)' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 3,
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${item.color}, ${item.color}CC)`,
                        boxShadow: `0 0 8px ${item.color}40`,
                        transition: 'width 0.8s cubic-bezier(.22,.68,0,1.2)',
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 10, fontWeight: 300, color: 'var(--t4)', marginTop: 3 }}>{item.hint}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ Next Milestone ═══ */}
        {!tier.isMax && (
          <div className="px-4 mt-4 v3-stagger v3-stagger-4">
            <div className="rare-card-v3 card-v3 p-4" style={{ position: 'relative', overflow: 'hidden' }}>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--orange), var(--gold-h))' }}
                >
                  <Target className="w-5 h-5" strokeWidth={1.5} style={{ color: '#1a1400' }} />
                </div>
                <div>
                  <div style={{ fontSize: 8, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '2px', color: 'var(--t4)' }}>
                    Next Milestone
                  </div>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginTop: 2 }}>
                    {tier.remaining.toLocaleString()} RP to {tier.nextName}
                  </div>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.06)' }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: 3,
                    width: `${tier.progress}%`,
                    background: 'linear-gradient(90deg, var(--orange), #fb923c)',
                    boxShadow: '0 0 8px rgba(249,115,22,0.4)',
                    transition: 'width 1s cubic-bezier(.22,.68,0,1.2)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="mono" style={{ fontSize: 10, color: 'var(--t3)' }}>{repScore.toLocaleString()}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--t3)' }}>{tier.nextMin.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Badges Preview ═══ */}
        <div className="px-4 mt-4 v3-stagger v3-stagger-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Award className="w-3 h-3" strokeWidth={1.4} style={{ color: 'var(--orange)' }} />
              <span style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '2.5px', color: 'var(--t3)' }}>
                Badges
              </span>
              <span style={{ fontSize: 10, color: 'var(--t4)', marginLeft: 4 }}>{userBadges.length} Earned</span>
            </div>
            <button
              onClick={() => onNavigate('badges')}
              className="btn-press"
              style={{ fontSize: 11, color: 'var(--orange)', letterSpacing: '0.5px' }}
            >
              View All Badges
            </button>
          </div>
          {userBadges.length > 0 ? (
            <div className="card-v3 p-4">
              <div className="grid grid-cols-5 gap-3">
                {userBadges.slice(0, 10).map((userBadge) => (
                  <div key={userBadge.badge.id} className="flex flex-col items-center gap-1" title={userBadge.badge.name}>
                    <BadgeCoin
                      tier={(userBadge.tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'plat'}
                      name={userBadge.badge.name}
                      size="md"
                    />
                    <div style={{ fontSize: 9, color: 'var(--t4)', textAlign: 'center', lineHeight: 1.3 }} className="line-clamp-2">
                      {userBadge.badge.name}
                    </div>
                  </div>
                ))}
              </div>
              {userBadges.length > 10 && (
                <p style={{ fontSize: 11, color: 'var(--t4)', textAlign: 'center', marginTop: 12 }}>
                  +{userBadges.length - 10} more
                </p>
              )}
            </div>
          ) : (
            <div className="card-v3 p-6 text-center">
              <Award className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--t4)' }} strokeWidth={1} />
              <p style={{ fontSize: 13, color: 'var(--t2)' }}>No badges yet</p>
              <p style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>Earn badges by participating in the community</p>
            </div>
          )}
        </div>

        {/* ═══ My Garage ═══ */}
        <div className="px-4 mt-4 v3-stagger v3-stagger-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Car className="w-3 h-3" strokeWidth={1.4} style={{ color: 'var(--orange)' }} />
              <span style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '2.5px', color: 'var(--t3)' }}>
                My Garage
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--t4)' }}>{vehicles.length} plate{vehicles.length !== 1 ? 's' : ''}</span>
          </div>
          {vehicles.length === 0 ? (
            <div className="card-v3 p-6 text-center">
              <Car className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--t4)' }} strokeWidth={1} />
              <p style={{ fontSize: 13, color: 'var(--t2)' }}>No claimed plates yet</p>
              <p style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>Scan a plate to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="card-v3 card-v3-lift p-4 cursor-pointer"
                  onClick={() => onViewVehicle(vehicle.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{vehicle.color}</div>
                    </div>
                    {vehicle.verification_tier && (
                      <span className="mono text-[9px] px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--orange-dim)', color: 'var(--orange)' }}>
                        {vehicle.verification_tier}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ Activity ═══ */}
        <div className="px-4 mt-4 v3-stagger v3-stagger-7">
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '2.5px', color: 'var(--t3)' }}>Activity</span>
          </div>
          {loadingPosts ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border-3)', borderTopColor: 'var(--accent)' }} />
            </div>
          ) : userPosts.length === 0 ? (
            <div className="card-v3 p-6 text-center">
              <p style={{ fontSize: 13, color: 'var(--t2)' }}>No activity yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {userPosts.map((post) => (
                <div
                  key={post.id}
                  className="card-v3 overflow-hidden"
                  style={{
                    borderColor: post.moderation_status === 'rejected' ? 'var(--status-rejected-border)' : post.moderation_status === 'pending' ? 'var(--status-pending-border)' : undefined,
                    opacity: post.moderation_status === 'rejected' ? 0.6 : 1,
                  }}
                >
                  {post.image_url && (
                    <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                      <img src={post.image_url} alt={post.caption || 'Post'} className="w-full h-full object-cover" />
                      {post.moderation_status === 'pending' && (
                        <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--status-pending)', color: 'var(--status-pending-text)', border: '1px solid var(--status-pending-border)' }}>
                          Pending Review
                        </div>
                      )}
                      {post.moderation_status === 'rejected' && (
                        <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--status-rejected)', color: 'var(--status-rejected-text)', border: '1px solid var(--status-rejected-border)' }}>
                          Rejected
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-3 space-y-2">
                    {post.caption && (
                      <p style={{ fontSize: 13, color: 'var(--t2)' }}>{post.caption}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ReactionButton postId={post.id} />
                        <div className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--t3)' }}>
                          <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>{post.comment_count}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                        {new Date(post.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ Photos ═══ */}
        {allPhotos.length > 0 && (
          <div className="px-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '2.5px', color: 'var(--t3)' }}>Photos</span>
              <span style={{ fontSize: 11, color: 'var(--t4)' }}>{allPhotos.length} total</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {allPhotos.slice(0, 9).map((photo, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setLightboxIndex(index);
                    setLightboxOpen(true);
                  }}
                  className="aspect-square rounded-lg overflow-hidden card-v3-lift btn-press"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
              {allPhotos.length < 9 && (
                <label className="aspect-square rounded-lg border-2 border-dashed cursor-pointer flex items-center justify-center transition-colors btn-press" style={{ borderColor: 'var(--border-2)' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                  {uploadingPhoto ? (
                    <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-3)', borderTopColor: 'var(--orange)' }} />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Plus className="w-6 h-6" style={{ color: 'var(--t4)' }} strokeWidth={1.5} />
                      <span style={{ fontSize: 9, color: 'var(--t4)' }}>Add Photo</span>
                    </div>
                  )}
                </label>
              )}
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

        {/* ═══ Bumper Stickers ═══ */}
        {userStickers.length > 0 && (
          <div className="px-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '2.5px', color: 'var(--t3)' }}>Bumper Stickers</span>
              <span style={{ fontSize: 11, color: 'var(--t4)' }}>{userStickers.length} received</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {userStickers.map((sticker) => {
                const isPositive = sticker.category === 'Positive';
                const isNegative = sticker.category === 'Negative';
                return (
                  <div
                    key={sticker.id}
                    className="rounded-[10px] p-3 text-center card-v3-lift"
                    style={{
                      background: isPositive ? 'rgba(74,138,74,0.08)' : isNegative ? 'rgba(138,74,74,0.08)' : 'var(--s2)',
                      border: `1px solid ${isPositive ? 'rgba(74,138,74,0.2)' : isNegative ? 'rgba(138,74,74,0.2)' : 'var(--border)'}`,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 500, color: isPositive ? 'var(--positive)' : isNegative ? 'var(--negative)' : 'var(--t2)', marginBottom: 2 }}>{sticker.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--t4)' }}>x{sticker.count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ Footer Links ═══ */}
        <div className="px-4 pt-4 pb-2 flex gap-3 flex-wrap">
          {profile?.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className="flex items-center gap-1"
              style={{ fontSize: 11, color: 'var(--t3)' }}
            >
              <Shield className="w-3 h-3" strokeWidth={1.5} />
              Admin
            </button>
          )}
          <button onClick={() => onNavigate('privacy')} style={{ fontSize: 11, color: 'var(--t4)' }}>
            Privacy
          </button>
          <button onClick={() => onNavigate('terms')} style={{ fontSize: 11, color: 'var(--t4)' }}>
            Terms
          </button>
        </div>
      </div>

      {showEditModal && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSave={loadProfile}
        />
      )}

      {showSpotsGivenModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSpotsGivenModal(false)}>
          <div className="card-v3 w-full max-w-lg max-h-[70vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface border-b border-surfacehighlight px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-heading font-bold text-primary">Spots Given</h3>
              <button onClick={() => setShowSpotsGivenModal(false)} className="text-secondary hover:text-primary btn-press">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-2">
              {spotsGiven.length === 0 ? (
                <p className="text-sm text-secondary text-center py-8">No spots given yet</p>
              ) : (
                spotsGiven.map((spot) => (
                  <button
                    key={spot.id}
                    onClick={() => {
                      setShowSpotsGivenModal(false);
                      onViewVehicle(spot.vehicle.id);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surfacehighlight transition-colors btn-press"
                  >
                    <Car className="w-5 h-5 text-accent-primary flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold text-primary">
                        {spot.vehicle.year} {spot.vehicle.make} {spot.vehicle.model}
                      </div>
                      <div className="text-xs text-tertiary">
                        {spot.vehicle.plate_state} {spot.vehicle.plate_number}
                      </div>
                    </div>
                    <div className="text-xs text-quaternary">
                      {new Date(spot.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showSpotsReceivedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSpotsReceivedModal(false)}>
          <div className="card-v3 w-full max-w-lg max-h-[70vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface border-b border-surfacehighlight px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-heading font-bold text-primary">Spots Received</h3>
              <button onClick={() => setShowSpotsReceivedModal(false)} className="text-secondary hover:text-primary btn-press">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-2">
              {spotsReceived.length === 0 ? (
                <p className="text-sm text-secondary text-center py-8">No spots received yet</p>
              ) : (
                spotsReceived.map((spot) => (
                  <div
                    key={spot.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surfacehighlight"
                  >
                    <Car className="w-5 h-5 text-accent-primary flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-primary">
                        {spot.vehicle.year} {spot.vehicle.make} {spot.vehicle.model}
                      </div>
                      <div className="text-xs text-tertiary">
                        Spotted by @{spot.spotter?.handle || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-xs text-quaternary">
                      {new Date(spot.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showBadgesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBadgesModal(false)}>
          <div className="card-v3 w-full max-w-lg max-h-[70vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface border-b border-surfacehighlight px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-heading font-bold text-primary">My Badges ({userBadges.length})</h3>
              <button onClick={() => setShowBadgesModal(false)} className="text-secondary hover:text-primary btn-press">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-4">
              {userBadges.length === 0 ? (
                <p className="text-sm text-secondary text-center py-8">No badges earned yet</p>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    {userBadges.map((userBadge) => (
                      <div key={userBadge.badge.id} className="flex flex-col items-center gap-2" title={userBadge.badge.description}>
                        <BadgeCoin
                          tier={(userBadge.tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'plat'}
                          name={userBadge.badge.name}
                          size="lg"
                        />
                        <div className="text-[10px] text-center text-tertiary line-clamp-2">
                          {userBadge.badge.name}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setShowBadgesModal(false);
                      onNavigate('badges');
                    }}
                    className="w-full py-2 text-sm font-semibold rounded-lg transition-colors btn-press"
                    style={{ background: 'var(--orange)', color: 'var(--bg)' }}
                  >
                    View All Badges
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showFollowersModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowFollowersModal(false)}>
          <div className="card-v3 w-full max-w-lg max-h-[70vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface border-b border-surfacehighlight px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-heading font-bold text-primary">Followers ({followerCount})</h3>
              <button onClick={() => setShowFollowersModal(false)} className="text-secondary hover:text-primary btn-press">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-2">
              {followers.length === 0 ? (
                <p className="text-sm text-secondary text-center py-8">No followers yet</p>
              ) : (
                followers.map((follower: any) => (
                  <button
                    key={follower.id}
                    onClick={() => {
                      setShowFollowersModal(false);
                      onNavigate('user-profile', follower.id);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surfacehighlight transition-colors btn-press"
                  >
                    <div className="w-10 h-10 rounded-full bg-surfacehighlight flex items-center justify-center font-bold text-sm text-primary">
                      {follower.avatar_url ? (
                        <img src={follower.avatar_url} alt={follower.handle} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        follower.handle?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold text-primary">@{follower.handle}</div>
                      <div className="text-xs text-tertiary">{follower.reputation_score || 0} pts</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showFollowingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowFollowingModal(false)}>
          <div className="card-v3 w-full max-w-lg max-h-[70vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface border-b border-surfacehighlight px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-heading font-bold text-primary">Following ({followingCount})</h3>
              <button onClick={() => setShowFollowingModal(false)} className="text-secondary hover:text-primary btn-press">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-2">
              {following.length === 0 ? (
                <p className="text-sm text-secondary text-center py-8">Not following anyone yet</p>
              ) : (
                following.map((followed: any) => (
                  <button
                    key={followed.id}
                    onClick={() => {
                      setShowFollowingModal(false);
                      onNavigate('user-profile', followed.id);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surfacehighlight transition-colors btn-press"
                  >
                    <div className="w-10 h-10 rounded-full bg-surfacehighlight flex items-center justify-center font-bold text-sm text-primary">
                      {followed.avatar_url ? (
                        <img src={followed.avatar_url} alt={followed.handle} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        followed.handle?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold text-primary">@{followed.handle}</div>
                      <div className="text-xs text-tertiary">{followed.reputation_score || 0} pts</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
