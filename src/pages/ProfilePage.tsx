import { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { LogOut, Car, Upload, Award, Shield, MessageCircle, CheckCircle, Plus, Share2 } from 'lucide-react';
import { EditProfileModal } from '../components/EditProfileModal';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { uploadImage } from '../lib/storage';
import { ReactionButton } from '../components/ReactionButton';
import { getUserBadges, type UserBadge } from '../lib/badges';
import { ReviewProfileSection } from '../components/ReviewProfileSection';
import { CreditCard as Edit } from 'lucide-react';
import { BadgeCoin } from '../components/BadgeCoin';
import { RepHeroCard } from '../components/RepHeroCard';
import { Zap, Layers, Target, Eye, UserPlus, Crosshair as CrosshairIcon } from 'lucide-react';
import { shareToSocial } from '../components/ShareCardGenerator';
import { getTierFromScore, REPUTATION_TIERS } from '../lib/tierConfig';

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

function getNextMilestone(score: number) {
  for (const tier of REPUTATION_TIERS) {
    if (score < tier.min) {
      return { name: tier.name, target: tier.min, remaining: tier.min - score };
    }
  }
  return null;
}

function ChangeArrow({ value }: { value: number }) {
  if (value === 0) return <span className="mono" style={{ fontSize: 9, color: '#586878' }}>--</span>;
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
  const [weeklyPulse, setWeeklyPulse] = useState({ views: 0, newFollowers: 0, spotsGivenWeek: 0, spotsReceivedWeek: 0, stickersWeek: 0 });
  const [showSpotsReceivedModal, setShowSpotsReceivedModal] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [spotsGiven, setSpotsGiven] = useState<any[]>([]);
  const [spotsReceived, setSpotsReceived] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);

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

  const loadWeeklyPulse = async () => {
    if (!user) return;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [spotsGivenRes, spotsReceivedRes, stickersRes] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', weekAgo),
      (async () => {
        const { data: vIds } = await supabase.from('vehicles').select('id').eq('owner_id', user.id);
        if (!vIds?.length) return { count: 0 };
        const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true }).in('vehicle_id', vIds.map(v => v.id)).gte('created_at', weekAgo);
        return { count: count || 0 };
      })(),
      (async () => {
        const { data: vIds } = await supabase.from('vehicles').select('id').eq('owner_id', user.id);
        if (!vIds?.length) return { count: 0 };
        const { count } = await supabase.from('bumper_sticker_assignments').select('*', { count: 'exact', head: true }).in('vehicle_id', vIds.map(v => v.id)).gte('created_at', weekAgo);
        return { count: count || 0 };
      })(),
    ]);

    setWeeklyPulse({
      views: 0, // profile_views table not yet created
      newFollowers: 0, // would need weekly snapshot comparison
      spotsGivenWeek: spotsGivenRes.count || 0,
      spotsReceivedWeek: spotsReceivedRes.count || 0,
      stickersWeek: stickersRes.count || 0,
    });
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

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      await uploadImage(file, 'profile-photos');
      await loadAllPhotos();
    } catch (error) {
      console.error('Failed to upload photo:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const loadUserStickers = async () => {
    if (!user) return;

    try {
      // Get all vehicles owned by user
      const { data: userVehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('owner_id', user.id);

      if (vehiclesError || !userVehicles || userVehicles.length === 0) {
        setUserStickers([]);
        return;
      }

      const vehicleIds = userVehicles.map(v => v.id);

      // Get all stickers on user's vehicles
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

      // Group by sticker and count
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
        {/* Profile Hero */}
        <div className="px-4 pt-5 pb-4 section-1">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-16 h-16 rounded-full overflow-hidden"
                style={{ border: '2px solid var(--border-2)' }}
              >
                {(profile?.avatar_url || profile?.profile_car_image) ? (
                  <img src={profile?.avatar_url || profile?.profile_car_image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                    <Car className="w-7 h-7" style={{ color: 'var(--text-quaternary)' }} strokeWidth={1} />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}
              >
                {uploadingPhoto ? (
                  <div className="w-3 h-3 border border-current rounded-full animate-spin" style={{ borderTopColor: 'transparent' }} />
                ) : (
                  <Upload className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.5} />
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

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="font-heading text-[18px] font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
                  {profile?.handle || 'Anonymous'}
                </h2>
                {profile?.role === 'owner' && (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} strokeWidth={2} />
                )}
              </div>
              {profile?.bio && (
                <p className="text-[13px] text-[#c0c8d4] mb-2" style={{ lineHeight: 1.5 }}>
                  {profile.bio}
                </p>
              )}
              {profile?.location && (
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{profile.location}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                className="px-4 py-2 rounded-xl text-[9px] font-medium uppercase text-center btn-press"
                style={{ background: '#F97316', color: '#fff', letterSpacing: '1.5px', border: '1px solid #F97316' }}
                onClick={() => onNavigate('rankings')}
              >
                Rankings
              </button>
              {profile?.role === 'admin' && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center btn-press"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border-2)' }}
                  title="Admin Dashboard"
                >
                  <Shield className="w-5 h-5" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
                </button>
              )}
              <button
                onClick={() => setShowEditModal(true)}
                className="w-8 h-8 rounded-[8px] flex items-center justify-center btn-press"
                style={{ background: 'var(--surface)', border: '1px solid var(--border-2)' }}
              >
                <Edit className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => {
                  shareToSocial({
                    type: 'profile',
                    title: profile?.handle || 'My Profile',
                    userHandle: profile?.handle || '',
                    userRep: profile?.reputation_score || 0,
                    deepLinkUrl: `${window.location.origin}/#profile/${user?.id || ''}`,
                  });
                }}
                className="w-8 h-8 rounded-[8px] flex items-center justify-center btn-press"
                style={{ background: 'var(--surface)', border: '1px solid var(--border-2)' }}
              >
                <Share2 className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.5} />
              </button>
              <button
                onClick={signOut}
                className="w-8 h-8 rounded-[8px] flex items-center justify-center btn-press"
                style={{ background: 'var(--surface)', border: '1px solid var(--border-2)' }}
              >
                <LogOut className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Pinned Badges Trophy Shelf */}
          {pinnedBadges.length > 0 && (
            <div className="mt-4">
              <p className="label-micro mb-2">Trophy Shelf</p>
              <div className="flex gap-2 flex-wrap">
                {pinnedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px]"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', fontSize: '12px', color: 'var(--text-secondary)' }}
                  >
                    <Award className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--gold-h)' }} strokeWidth={1.5} />
                    {badge.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hero Card Stats Strip */}
          <div className="card-v3 card-v3-lift mx-4 mb-4 p-4 section-2">
            {/* Rep score inline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span
                className="font-mono text-[28px] font-bold text-[#F97316]"
                style={{
                  textShadow: '0 0 12px rgba(249,115,22,0.2)', lineHeight: 1,
                }}
              >
                <CountUp target={profile?.reputation_score || 0} />
              </span>
              <div style={{ width: 1, height: 20, background: 'var(--border-2)' }} />
              <span className="font-label text-[11px] uppercase tracking-[2.5px] text-[#909aaa]">
                {getTierFromScore(profile?.reputation_score || 0)}
              </span>
            </div>

            <div className="flex justify-around">
              <button
                onClick={async () => { await loadSpotsGiven(); setShowSpotsGivenModal(true); }}
                className="text-center hover:opacity-70 transition-opacity btn-press"
              >
                <div className="stat-pop-1"><CountUp target={userPosts.filter(p => p.post_type === 'spot').length} /></div>
                <div className="font-label text-[9px] uppercase tracking-[2px] text-[#909aaa]" style={{ marginTop: 2 }}>Spotted</div>
              </button>
              <button
                onClick={() => setShowBadgesModal(true)}
                className="text-center hover:opacity-70 transition-opacity btn-press"
              >
                <div className="stat-pop-2"><CountUp target={userBadges.length} /></div>
                <div className="font-label text-[9px] uppercase tracking-[2px] text-[#909aaa]" style={{ marginTop: 2 }}>Badges</div>
              </button>
              <button
                onClick={() => onNavigate('my-garage')}
                className="text-center hover:opacity-70 transition-opacity btn-press"
              >
                <div className="stat-pop-3"><CountUp target={vehicles.length} /></div>
                <div className="font-label text-[9px] uppercase tracking-[2px] text-[#909aaa]" style={{ marginTop: 2 }}>Garage</div>
              </button>
              <button
                onClick={async () => { await loadFollowersList(); setShowFollowersModal(true); }}
                className="text-center hover:opacity-70 transition-opacity btn-press"
              >
                <div className="stat-pop-4"><CountUp target={followerCount} /></div>
                <div className="font-label text-[9px] uppercase tracking-[2px] text-[#909aaa]" style={{ marginTop: 2 }}>Followers</div>
              </button>
              <button
                onClick={async () => { await loadFollowingList(); setShowFollowingModal(true); }}
                className="text-center hover:opacity-70 transition-opacity btn-press"
              >
                <div className="stat-pop-5"><CountUp target={followingCount} /></div>
                <div className="font-label text-[9px] uppercase tracking-[2px] text-[#909aaa]" style={{ marginTop: 2 }}>Following</div>
              </button>
            </div>
          </div>
        </div>

          <div className="px-4 space-y-1 pb-4">

          {/* Rep Hero Card */}
          <div className="section-3 mb-3">
            <RepHeroCard score={profile?.reputation_score || 0} />
          </div>

          {/* Weekly Pulse */}
          <div className="section-3 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={13} color="var(--orange)" strokeWidth={2} />
              <span className="label-micro" style={{ padding: 0 }}>Weekly Pulse</span>
            </div>
            <div className="card-v3 card-v3-lift overflow-hidden">
              {[
                { icon: Eye, label: 'Profile Views', value: weeklyPulse.views },
                { icon: UserPlus, label: 'New Followers', value: weeklyPulse.newFollowers },
                { icon: CrosshairIcon, label: 'Spots Given', value: weeklyPulse.spotsGivenWeek },
                { icon: CrosshairIcon, label: 'Spots Received', value: weeklyPulse.spotsReceivedWeek },
                { icon: Award, label: 'Stickers Earned', value: weeklyPulse.stickersWeek },
              ].map((row, i) => {
                const IconComp = row.icon;
                return (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '10px 16px',
                      borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <IconComp size={14} color="var(--t4)" strokeWidth={1.5} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--t2)', marginLeft: 10 }}>{row.label}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginRight: 10 }}>{row.value}</span>
                    <ChangeArrow value={row.value} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Milestone */}
          {(() => {
            const milestone = getNextMilestone(profile?.reputation_score || 0);
            if (!milestone) return null;
            const score = profile?.reputation_score || 0;
            const prevTierMin = REPUTATION_TIERS.reduce((prev, t) => t.min <= score ? t.min : prev, 0);
            const progress = ((score - prevTierMin) / (milestone.target - prevTierMin)) * 100;
            return (
              <div className="section-4 mb-4">
                <div
                  className="card-v3 card-v3-lift p-4"
                  style={{
                    borderColor: 'rgba(249,115,22,0.2)',
                    background: 'linear-gradient(135deg, rgba(249,115,22,0.04), transparent 60%), repeating-linear-gradient(90deg, rgba(255,255,255,0.012) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.008) 3px), linear-gradient(180deg, var(--s1), #111a24)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(249,115,22,0.08))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Target size={18} color="var(--orange)" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 2.5, color: 'var(--t4)' }}>Next Milestone</div>
                      <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginTop: 2 }}>
                        {milestone.remaining} RP to {milestone.name}
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3, width: `${Math.min(progress, 100)}%`,
                      background: 'linear-gradient(90deg, var(--orange), #fb923ccc)',
                      boxShadow: '0 0 8px rgba(249,115,22,0.4)',
                      transition: 'width 1s cubic-bezier(.22,.68,0,1.2)',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--t4)' }}>{score.toLocaleString()} RP</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--t4)' }}>{milestone.target.toLocaleString()} RP</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* My Garage */}
          <div className="mb-4 section-4">
            <div className="flex items-center justify-between mb-3">
              <p className="label-micro">My Garage</p>
              <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>{vehicles.length} plate{vehicles.length !== 1 ? 's' : ''}</span>
            </div>
            {vehicles.length === 0 ? (
              <div className="rounded-[12px] p-6 text-center card-lift" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Car className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-quaternary)' }} strokeWidth={1} />
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No claimed plates yet</p>
                <p style={{ fontSize: '12px', color: 'var(--text-quaternary)', marginTop: '4px' }}>Scan a plate to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="bg-[#111111] border border-white/[0.06] rounded-xl p-4 card-interactive card-lift"
                    onClick={() => onViewVehicle(vehicle.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{vehicle.color}</div>
                      </div>
                      {vehicle.verification_tier && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full"
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

          {/* Activity */}
          <div className="mb-4 section-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-label text-[11px] uppercase tracking-[2.5px] text-[#909aaa]">Activity</span>
              <span className="text-[12px] font-medium" style={{ color: '#F97316' }}>Today: +0 pts</span>
            </div>
            {loadingPosts ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border-3)', borderTopColor: 'var(--accent)' }} />
              </div>
            ) : userPosts.length === 0 ? (
              <div className="rounded-[12px] p-6 text-center card-lift" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No activity yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {userPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden card-lift"
                    style={{
                      borderColor: post.moderation_status === 'rejected' ? 'var(--status-rejected-border)' : post.moderation_status === 'pending' ? 'var(--status-pending-border)' : undefined,
                      opacity: post.moderation_status === 'rejected' ? 0.6 : 1,
                    }}
                  >
                    {post.image_url && (
                      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                        <img src={post.image_url} alt={post.caption || 'Post'} className="w-full h-full object-cover" />
                        {post.moderation_status === 'pending' && (
                          <div className="absolute top-2 right-2 status-pending text-xs">
                            Pending Review
                          </div>
                        )}
                        {post.moderation_status === 'rejected' && (
                          <div className="absolute top-2 right-2 status-rejected text-xs">
                            Rejected
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-3 space-y-2">
                      {post.caption && (
                        <p className="text-sm text-secondary">{post.caption}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ReactionButton postId={post.id} />
                          <div className="flex items-center gap-1" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                            <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                            <span>{post.comment_count}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-quaternary)' }}>
                          {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Spots Profile */}
          <div className="mb-4 section-6">
            <p className="label-micro mb-3">Spots Profile</p>
            <ReviewProfileSection
              userId={user.id}
              showRecentReviews={true}
              maxReviews={10}
              showEditDelete={true}
              emptyStateMessage="You haven't spotted"
              onEdit={(reviewId) => {
                // Edit review handler - TODO: implement edit UI
              }}
              onDelete={async (reviewId) => {
                if (confirm('Are you sure you want to delete this review?')) {
                  const { error } = await supabase.from('posts').delete().eq('id', reviewId);
                  if (!error) window.location.reload();
                }
              }}
            />
          </div>

          {/* Rep Breakdown */}
          <div className="mb-4 section-5">
            <div className="flex items-center gap-2 mb-3">
              <Layers size={13} color="var(--t3)" strokeWidth={1.5} />
              <span className="label-micro" style={{ padding: 0 }}>Rep Breakdown</span>
            </div>
            <div className="card-v3 card-v3-lift p-4">
              {(() => {
                const score = profile?.reputation_score || 0;
                const spotRP = Math.round(score * 0.45);
                const reviewRP = Math.round(score * 0.25);
                const communityRP = Math.round(score * 0.2);
                const badgeRP = Math.round(score * 0.1);
                const total = score || 1;
                const categories = [
                  { label: 'Spotting', value: spotRP, pct: (spotRP / total) * 100, color: '#F97316', hint: 'Quick + Full Spots' },
                  { label: 'Spots', value: reviewRP, pct: (reviewRP / total) * 100, color: '#fb923c', hint: 'Detailed ratings' },
                  { label: 'Community', value: communityRP, pct: (communityRP / total) * 100, color: '#5aaa7a', hint: 'Likes, comments, follows' },
                  { label: 'Badges', value: badgeRP, pct: (badgeRP / total) * 100, color: '#c8a45a', hint: 'Badge awards' },
                ];
                return categories.map((cat, i) => (
                  <div key={cat.label} style={{ marginBottom: i < categories.length - 1 ? 14 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 400 }}>{cat.label}</span>
                      <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--t1)' }}>
                        {cat.value.toLocaleString()} RP
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        width: `${Math.min(cat.pct, 100)}%`,
                        background: `linear-gradient(90deg, ${cat.color}, ${cat.color}cc)`,
                        boxShadow: `0 0 8px ${cat.color}40`,
                        transition: 'width 1s cubic-bezier(.22,.68,0,1.2)',
                      }} />
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2, display: 'block' }}>{cat.hint}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Achievements */}
          {userBadges.length > 0 && (
            <div className="mb-4 section-8">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="label-micro">Achievements</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-quaternary)', marginTop: '2px' }}>
                    {userBadges.length} Earned
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('badges')}
                  className="btn-press"
                  style={{ fontSize: '12px', color: 'var(--accent)', letterSpacing: '0.5px' }}
                >
                  View All Badges →
                </button>
              </div>
              <div className="rounded-[12px] p-4 card-lift" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="grid grid-cols-5 gap-3">
                  {userBadges.slice(0, 10).map((userBadge) => (
                    <div key={userBadge.badge.id} className="flex flex-col items-center gap-1" title={userBadge.badge.name}>
                      <BadgeCoin
                        tier={(userBadge.tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'plat'}
                        name={userBadge.badge.name}
                        size="md"
                      />
                      <div style={{ fontSize: '9px', color: 'var(--text-quaternary)', textAlign: 'center', lineHeight: 1.3 }} className="line-clamp-2">
                        {userBadge.badge.name}
                      </div>
                    </div>
                  ))}
                </div>
                {userBadges.length > 10 && (
                  <p style={{ fontSize: '12px', color: 'var(--text-quaternary)', textAlign: 'center', marginTop: '12px' }}>
                    +{userBadges.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}

          {userBadges.length === 0 && (
            <div className="mb-4 rounded-[12px] p-6 text-center card-lift section-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Award className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-quaternary)' }} strokeWidth={1} />
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No badges yet</p>
              <p style={{ fontSize: '12px', color: 'var(--text-quaternary)', marginTop: '4px' }}>Earn badges by participating in the community</p>
            </div>
          )}

          {/* Photos */}
          <div className="mb-4 section-7">
            <div className="flex items-center justify-between mb-3">
              <p className="label-micro">Photos</p>
              <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>{allPhotos.length} total</span>
            </div>
            {allPhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {allPhotos.slice(0, 9).map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setLightboxIndex(index);
                      setLightboxOpen(true);
                    }}
                    className="aspect-square rounded-lg overflow-hidden border border-border hover:border-accent-primary transition-colors card-lift btn-press"
                  >
                    <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
                {allPhotos.length < 9 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-accent-primary cursor-pointer flex items-center justify-center transition-colors btn-press">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                    {uploadingPhoto ? (
                      <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Plus className="w-6 h-6 text-quaternary" strokeWidth={1.5} />
                        <span className="text-[9px] text-quaternary">Add Photo</span>
                      </div>
                    )}
                  </label>
                )}
              </div>
            ) : (
              <div className="rounded-[12px] p-6 text-center card-lift" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Car className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-quaternary)' }} strokeWidth={1} />
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No photos yet</p>
                <p style={{ fontSize: '12px', color: 'var(--text-quaternary)', marginTop: '4px' }}>Add photos of your rides to show off your garage</p>
                <label className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg cursor-pointer transition-colors btn-press" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                  {uploadingPhoto ? (
                    <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-quaternary" strokeWidth={1.5} />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Add Photo</span>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>

          {lightboxOpen && allPhotos.length > 0 && (
            <PhotoLightbox
              photos={allPhotos}
              initialIndex={lightboxIndex}
              onClose={() => setLightboxOpen(false)}
            />
          )}

          {/* Bumper Stickers */}
          {userStickers.length > 0 && (
            <div className="mb-4 section-8">
              <div className="flex items-center justify-between mb-3">
                <p className="label-micro">Bumper Stickers</p>
                <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>{userStickers.length} received</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {userStickers.map((sticker) => {
                  const isPositive = sticker.category === 'Positive';
                  const isNegative = sticker.category === 'Negative';
                  return (
                    <div
                      key={sticker.id}
                      className="rounded-[10px] p-3 text-center card-lift"
                      style={{
                        background: isPositive ? 'rgba(74,138,74,0.08)' : isNegative ? 'rgba(138,74,74,0.08)' : 'var(--surface)',
                        border: `1px solid ${isPositive ? 'rgba(74,138,74,0.2)' : isNegative ? 'rgba(138,74,74,0.2)' : 'var(--border)'}`,
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 500, color: isPositive ? 'var(--positive)' : isNegative ? 'var(--negative)' : 'var(--text-secondary)', marginBottom: '2px' }}>{sticker.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-quaternary)' }}>x{sticker.count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer links */}
          <div className="pt-4 pb-2 flex gap-3 flex-wrap justify-center" style={{ borderTop: '1px solid var(--border)' }}>
            {profile?.role === 'admin' && (
              <button onClick={() => onNavigate('admin')} className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--t3)' }}>
                <Shield className="w-3 h-3" strokeWidth={1.5} />Admin
              </button>
            )}
            <button onClick={() => onNavigate('privacy')} style={{ fontSize: 12, color: 'var(--t4)' }}>Privacy</button>
            <button onClick={() => onNavigate('terms')} style={{ fontSize: 12, color: 'var(--t4)' }}>Terms</button>
          </div>

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
              <h3 className="font-heading text-[18px] font-bold text-primary">Spots Given</h3>
              <button onClick={() => setShowSpotsGivenModal(false)} className="text-secondary hover:text-primary btn-press">✕</button>
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
                        {spot.vehicle.plate_state} • {spot.vehicle.plate_number}
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
              <h3 className="font-heading text-[18px] font-bold text-primary">Spots Received</h3>
              <button onClick={() => setShowSpotsReceivedModal(false)} className="text-secondary hover:text-primary btn-press">✕</button>
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
              <h3 className="font-heading text-[18px] font-bold text-primary">My Badges ({userBadges.length})</h3>
              <button onClick={() => setShowBadgesModal(false)} className="text-secondary hover:text-primary btn-press">✕</button>
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
                    className="w-full py-2 bg-accent-primary hover:bg-accent-primary/90 text-sm font-semibold rounded-lg transition-colors btn-press"
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
              <h3 className="font-heading text-[18px] font-bold text-primary">Followers ({followerCount})</h3>
              <button onClick={() => setShowFollowersModal(false)} className="text-secondary hover:text-primary btn-press">✕</button>
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
              <h3 className="font-heading text-[18px] font-bold text-primary">Following ({followingCount})</h3>
              <button onClick={() => setShowFollowingModal(false)} className="text-secondary hover:text-primary btn-press">✕</button>
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
