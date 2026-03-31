import { useEffect, useState, useRef, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { VEHICLE_PLATE_VISIBLE_COLUMNS } from '../lib/vehicles';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { ModerationStatus } from '../components/ModerationStatus';
import { useModerationSubscription } from '../hooks/useModerationSubscription';
import { uploadImage, deleteImage } from '../lib/storage';
import { getVehicleImageUrl } from '../lib/carImageryApi';
import { VerifyOwnershipModal } from '../components/VerifyOwnershipModal';
import { VinClaimModal } from '../components/VinClaimModal';
import { GuestJoinModal } from '../components/GuestJoinModal';
import { type VerificationTier } from '../components/TierBadge';
import { parseVehicleSpecs } from '../lib/vehicleSpecs';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Trash2, AlertCircle, Upload, X, Star, Shield, Info, Share2, User, Wrench, Disc3, Palette, Armchair, Droplet, Download, Car, MapPin, Camera, BookOpen, ChevronRight, Heart } from 'lucide-react';
import { OnNavigate } from '../types/navigation';
import { ShareBuildCard } from '../components/ShareBuildCard';
import { shareToSocial } from '../components/ShareCardGenerator';
import { GuestBottomNav } from '../components/GuestBottomNav';
// RateDriverModal and VehicleStats imports removed - unused
import { GarageSection } from '../components/GarageSection';
import { ModList } from '../components/ModList';
import { StickerSlab } from '../components/StickerSlab';
import { VehicleStickerSelector } from '../components/VehicleStickerSelector';
import { BADGE_TIER_THRESHOLDS, TIER_COLORS } from '../config/badgeConfig';
import { UserAvatar } from '../components/UserAvatar';
import { MotoFanButton } from '../components/MotoFanButton';
import { MotoFansModal } from '../components/MotoFansModal';
import { AlbumsModal } from '../components/AlbumsModal';
import { FollowButton } from '../components/FollowButton';
// BadgeChip and getBadgeType imports removed - unused

interface VehicleDetailPageProps {
  vehicleId: string;
  onNavigate: OnNavigate;
  onBack: () => void;
  onEditBuildSheet: (vehicleId: string) => void;
  guestMode?: boolean;
  scrollTo?: string;
  openReviewModal?: boolean;
}

interface Review {
  id: string;
  comment: string | null;
  rating_vehicle: number | null;
  rating_driver: number | null;
  rating_driving?: number | null;
  looks_rating?: number | null;
  sound_rating?: number | null;
  condition_rating?: number | null;
  sentiment?: string | null;
  spot_type?: string | null;
  location_label: string | null;
  created_at: string;
  author_id: string;
  is_hidden_by_owner: boolean;
  author: {
    handle: string | null;
    avatar_url?: string | null;
  };
  moderation_status?: string;
  rejection_reason?: string | null;
}

interface Vehicle {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  owner_id: string | null;
  is_claimed: boolean;
  claimed_at: string | null;
  verification_tier: VerificationTier;
  owner_proof_url: string | null;
  owners_manual_url: string | null;
  stock_image_url?: string | null;
  profile_image_url?: string | null;
  state?: string | null;
  plate_number?: string | null;
  is_private?: boolean;
  trim?: string | null;
  vin_raw_data?: Record<string, unknown> | null;
  owner?: {
    id: string;
    handle: string | null;
    avatar_url: string | null;
  };
}

interface Modification {
  id: string;
  category: string | null;
  part_name: string;
  is_verified: boolean;
}

interface VehicleImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  uploaded_by: string | null;
  created_at: string;
}

function MotoFansPendingPanel({ vehicleId, onFollowerUpdated }: { vehicleId: string; onFollowerUpdated: () => void }) {
  const [follows, setFollows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadFollows = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vehicle_follows')
      .select('id, status, created_at, follower:profiles!vehicle_follows_follower_id_fkey(id, handle, avatar_url)')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });
    setFollows(data || []);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => { loadFollows(); }, [vehicleId, loadFollows]);

  const pending = follows.filter(f => f.status === 'pending');
  const accepted = follows.filter(f => f.status === 'accepted');

  const handleApprove = async (followId: string, followerId: string) => {
    await supabase.from('vehicle_follows').update({ status: 'accepted' }).eq('id', followId);
    try { const { notifyVehicleFollowApproved } = await import('../lib/notifications'); await notifyVehicleFollowApproved(followerId, vehicleId); } catch { /* intentionally empty */ }
    loadFollows(); onFollowerUpdated();
  };

  const handleRemove = async (followId: string) => {
    await supabase.from('vehicle_follows').delete().eq('id', followId);
    loadFollows(); onFollowerUpdated();
  };

  if (follows.length === 0 && !loading) return null;

  return (
    <div style={{ margin: '0 16px 16px' }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', background: 'var(--carbon-2)', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'var(--font-cond)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'var(--muted)', cursor: 'pointer' }}>
        <span>MotoFans · {accepted.length}</span>
        {pending.length > 0 && <span style={{ background: 'var(--accent)', color: 'var(--black)', borderRadius: '10px', padding: '1px 7px', fontSize: '9px', fontWeight: 700 }}>{pending.length} pending</span>}
      </button>
      {expanded && (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {pending.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.2)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--carbon-3)', overflow: 'hidden', flexShrink: 0 }}>{f.follower?.avatar_url && <img src={f.follower.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
              <div style={{ flex: 1, fontFamily: 'var(--font-cond)', fontSize: '12px', fontWeight: 700, color: 'var(--light)' }}>@{f.follower?.handle || 'Unknown'}<div style={{ fontSize: '9px', color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginTop: '1px' }}>Pending</div></div>
              <button onClick={() => handleApprove(f.id, f.follower?.id)} style={{ padding: '5px 12px', borderRadius: '6px', background: 'var(--accent)', color: 'var(--black)', fontFamily: 'var(--font-cond)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, border: 'none', cursor: 'pointer' }}>Approve</button>
              <button onClick={() => handleRemove(f.id)} style={{ padding: '5px 12px', borderRadius: '6px', background: 'transparent', color: 'var(--dim)', fontFamily: 'var(--font-cond)', fontSize: '10px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>Decline</button>
            </div>
          ))}
          {accepted.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', background: 'var(--carbon-2)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--carbon-3)', overflow: 'hidden', flexShrink: 0 }}>{f.follower?.avatar_url && <img src={f.follower.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
              <div style={{ flex: 1, fontFamily: 'var(--font-cond)', fontSize: '12px', fontWeight: 700, color: 'var(--light)' }}>@{f.follower?.handle || 'Unknown'}</div>
              <button onClick={() => handleRemove(f.id)} style={{ padding: '5px 12px', borderRadius: '6px', background: 'transparent', color: 'var(--dim)', fontFamily: 'var(--font-cond)', fontSize: '10px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function VehicleDetailPage({ vehicleId, onNavigate, onBack, onEditBuildSheet: _onEditBuildSheet, guestMode = false, scrollTo, openReviewModal: _openReviewModal }: VehicleDetailPageProps) {
  const C = {
    black: '#030508', carbon0: '#070a0f', carbon1: '#0a0d14', carbon2: '#0e1320',
    steel: '#2c3a50', muted: '#445566', dim: '#7a8e9e', light: '#a8bcc8', white: '#eef4f8',
    accent: '#F97316', accentDim: 'rgba(249,115,22,0.12)', green: '#20c060', gold: '#f0a030',
  } as const;

  const { user } = useAuth();
  const { goBack, getReturnLabel } = useNavigation();
  const _returnLabel = getReturnLabel();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [modifications, setModifications] = useState<Modification[]>([]);
  const [modsByCategory, setModsByCategory] = useState<Record<string, any[]>>({});
  const [vehicleImages, setVehicleImages] = useState<VehicleImage[]>([]);
  const [spotCount, setSpotCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [showMotoFansModal, setShowMotoFansModal] = useState(false);
  const [showAlbumsModal, setShowAlbumsModal] = useState(false);
  const [showAddModForm, setShowAddModForm] = useState(false);
  const [newModName, setNewModName] = useState('');
  const [newModCategory, setNewModCategory] = useState('Exterior');
  const [newModBrand, setNewModBrand] = useState('');
  const [newModCost, setNewModCost] = useState('');
  const [_viewCount, _setViewCount] = useState(0);
  const [cityRank, _setCityRank] = useState<number | null>(null);
  const [_showSpotReviewModal, _setShowSpotReviewModal] = useState(false);

  useModerationSubscription(() => !guestMode && loadVehicleData());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showGuestJoinModal, setShowGuestJoinModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [guestJoinAction, setGuestJoinAction] = useState('');
  const [error, setError] = useState('');
  const [_showRateDriver, _setShowRateDriver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const [_uploadingManual, setUploadingManual] = useState(false);
  const [_expandedCategory, _setExpandedCategory] = useState<string | null>(null);

  const [_activeTab, _setActiveTab] = useState<'photos' | 'stickers' | 'modifications' | 'reviews'>('stickers');
  const [heroImgError, setHeroImgError] = useState(false);
  const [carImageryUrl, setCarImageryUrl] = useState<string | null>(null);
  const [vehicleBadges, setVehicleBadges] = useState<any[]>([]);
  const [vBadges, setVBadges] = useState<any[]>([]);
  const isOwner = user && vehicle?.owner_id === user.id;
  const isUnclaimed = vehicle && !vehicle.is_claimed;
  const canClaim = user && isUnclaimed && !vehicle?.owner_id;

  useEffect(() => {
    if (vehicle && !vehicleImages[0]?.image_url && !vehicle.stock_image_url && !vehicle.profile_image_url) {
      getVehicleImageUrl(vehicle.make || '', vehicle.model || '', vehicle.year || undefined, vehicle.color || undefined).then(url => {
        if (url) {
          setCarImageryUrl(url);
          supabase.from('vehicles').update({ stock_image_url: url }).eq('id', vehicle.id).then(() => {});
        }
      });
    }
  }, [vehicle, vehicleImages]);

  useEffect(() => {
    if (scrollTo && !loading && vehicle) {
      const scrollTimer = setTimeout(() => {
        const element = document.getElementById(scrollTo);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          console.warn(`Element with id "${scrollTo}" not found for scrolling`);
        }
      }, 500);

      return () => clearTimeout(scrollTimer);
    }
  }, [scrollTo, loading, vehicle]);

  const loadVehicleData = useCallback(async () => {
    const { data: vehicleData } = await supabase
      .from('vehicles')
      // PLATE: visible — vehicle detail page (plate needed for spot flow handoff)
      .select(VEHICLE_PLATE_VISIBLE_COLUMNS + ', owners_manual_url, claimed_at, vin_raw_data, profiles!owner_id(id, handle, avatar_url)')
      .eq('id', vehicleId)
      .maybeSingle();

    // Count spots from spot_history table
    const { count } = await supabase
      .from('spot_history')
      .select('*', { count: 'exact', head: true })
      .eq('vehicle_id', vehicleId);

    if (count !== null) setSpotCount(count);

    const { count: vFollowerCount } = await supabase
      .from('vehicle_follows')
      .select('*', { count: 'exact', head: true })
      .eq('vehicle_id', vehicleId)
      .eq('status', 'accepted');
    if (vFollowerCount !== null) setFollowerCount(vFollowerCount);

    // Fetch reviews from reviews table
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(`
        id,
        comment,
        rating_vehicle,
        rating_driver,
        rating_driving,
        looks_rating,
        sound_rating,
        condition_rating,
        sentiment,
        spot_type,
        created_at,
        author_id,
        is_hidden_by_owner,
        author:profiles!reviews_author_id_fkey(handle, avatar_url)
      `)
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });

    // Fetch spot history
    const { data: _spotHistoryData } = await supabase
      .from('spot_history')
      .select(`
        id,
        photo_url,
        location,
        spot_type,
        created_at,
        spotter_id,
        spotter:profiles!spot_history_spotter_id_fkey(handle, avatar_url)
      `)
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: modsData } = await supabase
      .from('vehicle_modifications')
      .select('*')
      .eq('vehicle_id', vehicleId);

    let imagesData = null;
    try {
      const result = await supabase
        .from('vehicle_images')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });
      imagesData = result.data;
    } catch {
      // vehicle_images table may not exist yet
    }

    if (vehicleData) {
      const vData = vehicleData as unknown as any;
      const ownerData = vData.profiles;
      setVehicle({
        ...vData,
        owner: ownerData ? {
          id: ownerData.id,
          handle: ownerData.handle,
          avatar_url: ownerData.avatar_url
        } : undefined
      });
    }
    if (reviewsData) {
      const mappedReviews = reviewsData.map(review => ({
        id: review.id,
        comment: review.comment,
        rating_vehicle: review.rating_vehicle,
        rating_driver: review.rating_driver,
        rating_driving: review.rating_driving,
        looks_rating: review.looks_rating,
        sound_rating: review.sound_rating,
        condition_rating: review.condition_rating,
        sentiment: review.sentiment,
        spot_type: review.spot_type,
        location_label: null,
        created_at: review.created_at,
        author_id: review.author_id,
        is_hidden_by_owner: review.is_hidden_by_owner || false,
        moderation_status: 'approved',
        author: review.author || { handle: 'Anonymous' }
      }));
      setReviews(mappedReviews as unknown as Review[]);
    }
    if (modsData) {
      setModifications(modsData);

      const categories: Record<string, any[]> = {
        'Powertrain': [],
        'Suspension & Brakes': [],
        'Wheels & Tires': [],
        'Exterior': [],
        'Interior': [],
        'Fluids & Consumables': []
      };

      modsData.forEach((mod: any) => {
        const category = mod.category || 'Exterior';
        if (categories[category]) {
          categories[category].push(mod);
        }
      });

      setModsByCategory(categories);
    }
    if (imagesData) setVehicleImages(imagesData);

    // Fetch vehicle badges
    const { data: vBadgeData } = await supabase
      .from('vehicle_badges')
      .select('badge_id, tier, sticker_count, earned_at')
      .eq('vehicle_id', vehicleId)
      .order('sticker_count', { ascending: false });
    if (vBadgeData) setVBadges(vBadgeData);

    {
      const { data: badgeData } = await supabase
        .from('vehicle_badges')
        .select('badge_id, tier, sticker_count, earned_at')
        .eq('vehicle_id', vehicleId)
        .order('sticker_count', { ascending: false });

      if (badgeData) {
        setVehicleBadges(
          badgeData.map((vb: any) => ({
            id: vb.badge_id,
            name: vb.badge_id,
            tier: vb.tier,
            sticker_count: vb.sticker_count,
            earned_at: vb.earned_at,
          }))
        );
      }
    }

    setLoading(false);
  }, [vehicleId]);

  useEffect(() => {
    loadVehicleData();
  }, [vehicleId, loadVehicleData]);

  useEffect(() => {
    if (!vehicleId) return;

    const channel = supabase
      .channel(`vehicle_${vehicleId}_updates`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `vehicle_id=eq.${vehicleId}`
        },
        (payload) => {
          const post = payload.new as any;
          const mappedReview = {
            id: post.id,
            comment: post.caption,
            rating_vehicle: post.rating_vehicle,
            rating_driver: post.rating_driver,
            rating_driving: post.rating_driving,
            location_label: post.location_label,
            created_at: post.created_at,
            author_id: post.author_id,
            is_hidden_by_owner: false,
            moderation_status: post.moderation_status,
            author: { handle: 'Anonymous' }
          };
          setReviews(prev => [mappedReview as Review, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle_images',
          filter: `vehicle_id=eq.${vehicleId}`
        },
        () => {
          loadVehicleData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vehicleId, loadVehicleData]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      loadVehicleData();
    }
  };

  const handleToggleHidden = async (review: Review) => {
    const { error: updateError } = await supabase
      .from('reviews')
      .update({ is_hidden_by_owner: !review.is_hidden_by_owner })
      .eq('id', review.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      loadVehicleData();
    }
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vehicle || !isOwner) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File must be less than 10MB');
      return;
    }

    setUploadingManual(true);
    try {
      const fileExt = 'pdf';
      const fileName = `${vehicle.id}/manual-${Date.now()}.${fileExt}`;
      const filePath = `vehicles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ owners_manual_url: urlData.publicUrl })
        .eq('id', vehicle.id);

      if (updateError) throw updateError;

      setVehicle({ ...vehicle, owners_manual_url: urlData.publicUrl });
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload manual');
    } finally {
      setUploadingManual(false);
    }
  };

  const handleRemoveManual = async () => {
    if (!vehicle || !isOwner) return;
    if (!confirm('Remove owner\'s manual?')) return;

    try {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ owners_manual_url: null })
        .eq('id', vehicle.id);

      if (updateError) throw updateError;

      setVehicle({ ...vehicle, owners_manual_url: null });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove manual');
    }
  };

  const canModerateReview = (review: Review) => {
    if (!isOwner || !vehicle?.claimed_at) return false;
    const reviewDate = new Date(review.created_at);
    const claimDate = new Date(vehicle.claimed_at);
    return reviewDate < claimDate;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setError('');

    try {
      const imageUrl = await uploadImage(file, 'vehicles');

      const isPrimary = vehicleImages.length === 0;

      const { error: insertError } = await supabase
        .from('vehicle_images')
        .insert({
          vehicle_id: vehicleId,
          image_url: imageUrl,
          is_primary: isPrimary,
          uploaded_by: user.id
        });

      if (insertError) throw insertError;

      await loadVehicleData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await supabase
        .from('vehicle_images')
        .update({ is_primary: false })
        .eq('vehicle_id', vehicleId);

      const { error: updateError } = await supabase
        .from('vehicle_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      if (updateError) throw updateError;

      await loadVehicleData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to set primary image');
    }
  };

  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm('Delete this image?')) return;

    try {
      await deleteImage(imageUrl);

      const { error: deleteError } = await supabase
        .from('vehicle_images')
        .delete()
        .eq('id', imageId);

      if (deleteError) throw deleteError;

      await loadVehicleData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    }
  };

  const avgDriverScore = reviews.length > 0
    ? Math.round(reviews.reduce((acc, r) => acc + (r.rating_driver ?? 0), 0) / reviews.length)
    : 0;

  const avgCoolScore = reviews.length > 0
    ? Math.round(reviews.reduce((acc, r) => acc + (r.rating_vehicle ?? 0), 0) / reviews.length)
    : 0;

  // Compute averages for all 6 rating categories
  const ratingCategories = (() => {
    if (reviews.length === 0) return [];
    const cats: { label: string; avg: number; count: number }[] = [];
    const calc = (fn: (r: Review) => number | null | undefined, label: string) => {
      const vals = reviews.map(fn).filter((v): v is number => v != null && v > 0);
      if (vals.length > 0) cats.push({ label, avg: vals.reduce((s, v) => s + v, 0) / vals.length, count: vals.length });
    };
    calc(r => r.rating_driver, 'Driver');
    calc(r => r.rating_driving, 'Driving');
    calc(r => r.rating_vehicle, 'Vehicle');
    calc(r => r.looks_rating, 'Looks');
    calc(r => r.sound_rating, 'Sound');
    calc(r => r.condition_rating, 'Condition');
    return cats;
  })();

  const loveCount = reviews.filter(r => r.sentiment === 'love').length;
  const hateCount = reviews.filter(r => r.sentiment === 'hate').length;

  // Derive hero image
  const _vehicleImageUrl = vehicle?.profile_image_url || vehicle?.stock_image_url || carImageryUrl;

  // Derive encounter count from reviews
  const encounterCount = reviews.length;

  // Derive RP score (sum of all avg ratings)
  const rpScore = ratingCategories.length > 0
    ? Math.round(ratingCategories.reduce((s, c) => s + c.avg, 0) * 10)
    : 0;

  // Specs grid — no VIN data, use basic fields only
  const vinSpecs = vehicle ? [
    { label: 'Color', value: vehicle.color },
  ].filter(s => s.value) : [];

  // Powertrain string — no VIN data
  const _powertrain = '';

  // Verification badge color
  const verBadgeColor = vehicle?.verification_tier === 'vin_verified' ? C.green : vehicle?.is_claimed ? C.green : C.dim;

  if (loading) {
    return (
      <Layout currentPage="vehicle-detail" onNavigate={onNavigate}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
          <div
            style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${C.carbon2}`, borderTopColor: C.accent, animation: 'spin 1s linear infinite' }}
          />
        </div>
      </Layout>
    );
  }

  if (!vehicle) {
    return (
      <Layout currentPage="vehicle-detail" onNavigate={onNavigate}>
        <div style={{ textAlign: 'center', padding: '64px 16px' }}>
          <p style={{ fontSize: 15, color: C.dim }}>Vehicle not found</p>
          <button
            onClick={onBack}
            style={{ marginTop: 16, fontSize: 13, color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="vehicle-detail" onNavigate={onNavigate}>
      {vehicle && (
        <Helmet>
          <title>{`${vehicle.year} ${vehicle.make} ${vehicle.model} - MotoRate`}</title>
          <meta property="og:title" content={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} />
          <meta property="og:description" content={`View ratings and spots for this ${vehicle.year} ${vehicle.make} ${vehicle.model} on MotoRate`} />
          {vehicle.profile_image_url && (
            <meta property="og:image" content={vehicle.profile_image_url} />
          )}
          {guestMode && (
            <>
              <meta name="robots" content="noindex, nofollow" />
              <meta name="googlebot" content="noindex, nofollow" />
            </>
          )}
        </Helmet>
      )}

      <div style={{ paddingBottom: 96 }}>
        {error && (
          <div style={{ margin: '0 16px 16px', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(138,74,74,0.12)', border: '1px solid rgba(138,74,74,0.3)' }}>
            <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} strokeWidth={1.5} />
            <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>
          </div>
        )}

        {/* ── 1. HERO ── */}
        <div style={{ position: 'relative', width: '100%', height: 200, overflow: 'hidden' }}>
          {(() => {
            const heroUrl = vehicle.profile_image_url || vehicle.stock_image_url || carImageryUrl;
            return heroUrl && !heroImgError ? (
              <img
                src={heroUrl}
                alt="Vehicle"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={() => setHeroImgError(true)}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#111720' }} />
            );
          })()}

          {/* Overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.95) 0%, rgba(3,5,8,0.4) 50%, transparent 100%)' }} />

          {/* Back button */}
          <button
            onClick={goBack}
            style={{ position: 'absolute', top: 14, left: 14, width: 32, height: 32, borderRadius: 8, background: 'rgba(3,5,8,0.7)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}
          >
            <ArrowLeft size={14} color="#eef4f8" strokeWidth={2} />
          </button>

          {/* Share button */}
          <button
            onClick={() => {
              const vName = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle';
              shareToSocial({
                type: 'vehicle',
                title: vName,
                userHandle: vehicle.owner?.handle || 'unknown',
                userRep: 0,
                deepLinkUrl: `${window.location.origin}/#/vehicle/${vehicle.id}`,
              }, user?.id);
            }}
            style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 8, background: 'rgba(3,5,8,0.7)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}
            title="Share this vehicle"
          >
            <Share2 size={14} color="#eef4f8" strokeWidth={2} />
          </button>

          {/* Content bottom-left */}
          <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16, zIndex: 2 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: '#F97316', marginBottom: 2 }}>
              {vehicle.make || 'Unknown'}
            </div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
              {vehicle.model || 'Vehicle'}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#7a8e9e', marginTop: 2 }}>
              {[vehicle.year, vehicle.trim, vehicle.color].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
        <input ref={manualInputRef} type="file" accept="application/pdf" onChange={handleManualUpload} style={{ display: 'none' }} />

        {/* ── 1b. SPECS STRIP (claimed vehicles with vin_raw_data) ── */}
        {vehicle.is_claimed && (() => {
          const specs = parseVehicleSpecs(vehicle.vin_raw_data);
          if (!specs) return null;
          const items: { value: string; label: string }[] = [];
          if (specs.horsepower) items.push({ value: `${specs.horsepower}`, label: 'HP' });
          if (specs.engine) items.push({ value: specs.engine, label: 'Engine' });
          if (specs.displacement) items.push({ value: specs.displacement, label: 'Config' });
          if (specs.drivetrain) items.push({ value: specs.drivetrain, label: 'Drive' });
          if (specs.transmission) items.push({ value: specs.transmission, label: 'Trans' });
          if (items.length < 2) return null;
          return (
            <div style={{
              display: 'flex', overflowX: 'auto', scrollbarWidth: 'none' as const,
              background: '#0d1117', borderTop: '1px solid rgba(249,115,22,0.10)',
              borderBottom: '1px solid rgba(249,115,22,0.10)',
            }}>
              {items.map((item, i) => (
                <div key={item.label} style={{
                  flexShrink: 0, padding: '10px 16px', textAlign: 'center' as const,
                  borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600,
                    color: '#eef4f8', display: 'block', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {item.value}
                  </span>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700,
                    letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#5a6e7e',
                    display: 'block', marginTop: 2,
                  }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── 2. STAT STRIP ── */}
        <div style={{ display: 'flex', background: '#0a0d14', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {[
            { label: 'RP', value: rpScore, onClick: undefined as (() => void) | undefined },
            { label: 'Spots', value: spotCount, onClick: undefined },
            { label: 'Rating', value: ratingCategories.length > 0 ? (ratingCategories.reduce((s, c) => s + c.avg, 0) / ratingCategories.length).toFixed(1) : '\u2014', onClick: undefined },
            { label: 'MotoFans', value: followerCount, onClick: () => setShowMotoFansModal(true) },
          ].map((stat, i, arr) => (
            <div key={stat.label} onClick={stat.onClick} style={{
              flex: 1, padding: '10px 0', textAlign: 'center' as const,
              borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              cursor: stat.onClick ? 'pointer' : 'default',
            }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600, color: '#eef4f8', display: 'block', fontVariantNumeric: 'tabular-nums' }}>{stat.value}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: stat.onClick ? '#F97316' : '#5a6e7e', display: 'block', marginTop: 2 }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ── VEHICLE BADGE RACK ── */}
        {vBadges.length > 0 && (
          <div style={{ padding: '12px 18px 14px', background: '#0a0d14', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#7a8e9e', marginBottom: 10,
            }}>
              Earned Badges
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
              {[...vBadges]
                .sort((a, b) => {
                  const order: Record<string, number> = { Platinum: 4, Gold: 3, Silver: 2, Bronze: 1 };
                  return (order[b.tier ?? ''] || 0) - (order[a.tier ?? ''] || 0);
                })
                .map(badge => {
                  const colors = TIER_COLORS[(badge.tier ?? 'Bronze') as keyof typeof TIER_COLORS] || TIER_COLORS.Bronze;
                  return (
                    <div key={badge.badge_id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: colors.bg, border: `1px solid ${colors.border}`,
                      borderRadius: 5, padding: '4px 9px',
                    }}>
                      <span style={{
                        fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 700,
                        letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: colors.text,
                      }}>
                        {badge.badge_id}
                      </span>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 7,
                        color: colors.text, opacity: 0.7, fontVariantNumeric: 'tabular-nums',
                      }}>
                        x{badge.sticker_count}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── 3. OWNER STRIP ── */}
        {vehicle.is_claimed && vehicle.owner && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div
              onClick={() => vehicle.owner && onNavigate('user-profile', vehicle.owner.id)}
              style={{
                width: 32, height: 32, borderRadius: '50%', background: '#1e2a38', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              }}
            >
              {vehicle.owner.avatar_url ? (
                <img src={vehicle.owner.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: '#7a8e9e' }}>
                  {(vehicle.owner.handle || '?')[0].toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => vehicle.owner && onNavigate('user-profile', vehicle.owner.id)}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
                @{vehicle.owner.handle || 'anonymous'}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
                Owner · {vehicle.verification_tier === 'vin_verified' ? 'Verified' : 'Claimed'}
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <MotoFanButton
                vehicleId={vehicleId}
                ownerId={vehicle?.owner_id || null}
                onCountChange={(c) => setFollowerCount(c)}
              />
            </div>
          </div>
        )}

        {/* ── 5. BUMPER STICKERS — flat layout per mockup, no tabs ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>Bumper Stickers</span>
          </div>
          <div style={{ padding: '0 16px 12px' }}>
            <StickerSlab vehicleId={vehicleId} />
            {!isOwner && user && !guestMode && (
              <div style={{ marginTop: 10 }}>
                <VehicleStickerSelector vehicleId={vehicleId} onStickerGiven={loadVehicleData} />
              </div>
            )}
          </div>
        </div>

        {/* ── 6. REVIEWS — flat layout per mockup ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 8px' }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
              Reviews{reviews.length > 0 ? ` · ${reviews.length}` : ''}
            </span>
            {reviews.length > 1 && (
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', cursor: 'pointer' }}>
                See All
              </span>
            )}
          </div>
          <div style={{ padding: '0 16px 12px' }}>
            {reviews.length === 0 ? (
              <div style={{ textAlign: 'center' as const, padding: '24px 0', color: '#5a6e7e', fontFamily: "'Barlow', sans-serif", fontSize: 12 }}>
                No reviews yet. Spot this plate to leave the first one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {reviews.slice(0, 3).map((review) => {
                  const avgRating = [review.rating_vehicle, review.rating_driver, review.rating_driving].filter(r => r != null).reduce((s, r) => s + r!, 0) / [review.rating_vehicle, review.rating_driver, review.rating_driving].filter(r => r != null).length || 0;
                  return (
                    <div key={review.id} style={{ background: '#0d1117', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1e2a38', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {review.author.avatar_url ? (
                            <img src={review.author.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          ) : (
                            <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 700, color: '#7a8e9e' }}>{(review.author.handle || '?')[0].toUpperCase()}</span>
                          )}
                        </div>
                        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 700, color: '#eef4f8' }}>@{review.author.handle || 'Anonymous'}</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <svg key={star} width="14" height="14" viewBox="0 0 24 24" fill={star <= Math.round(avgRating) ? '#f0a030' : 'none'} stroke={star <= Math.round(avgRating) ? '#f0a030' : '#3a4e60'} strokeWidth="1.5">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                          ))}
                        </div>
                      </div>
                      {review.comment && <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', lineHeight: 1.4, margin: 0 }}>{review.comment}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── PHOTOS (owner only, compact) ── */}
        {vehicle.is_claimed && vehicleImages.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 8px' }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>Photos · {vehicleImages.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, padding: 0 }}>
              {vehicleImages.map((img) => (
                <div key={img.id} style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: '#0a0d14' }}>
                  <img src={img.image_url} alt="Vehicle" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#0a0d14' }} />
                  {img.is_primary && (
                    <div style={{ position: 'absolute', top: 6, left: 6, background: '#F97316', color: '#030508', fontSize: 7, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' as const, padding: '2px 6px', borderRadius: 3 }}>Primary</div>
                  )}
                  {isOwner && (
                    <div style={{ position: 'absolute', bottom: 4, right: 4, display: 'flex', gap: 3 }}>
                      {!img.is_primary && (
                        <button onClick={() => handleSetPrimary(img.id)} style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Star size={11} color="#F97316" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteImage(img.id, img.image_url)} style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={11} color="#fca5a5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {isOwner && (
              <div style={{ margin: '12px 16px' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 6, cursor: 'pointer',
                    background: 'transparent', border: '1px solid rgba(249,115,22,0.25)',
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Upload size={12} />
                  {uploading ? 'Uploading...' : '+ Add Photo'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── MODIFICATIONS ── */}
        {vehicle.is_claimed && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
                Modifications{modifications.length > 0 ? ` · ${modifications.length}` : ''}
              </span>
              {isOwner && (
                <span onClick={() => setShowAddModForm(!showAddModForm)} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', cursor: 'pointer' }}>
                  {showAddModForm ? 'Cancel' : '+ Add Mod'}
                </span>
              )}
            </div>

            {/* Add mod form (owner only) */}
            {showAddModForm && isOwner && (
              <div style={{ padding: '0 16px 12px' }}>
                <div style={{ background: '#0d1117', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', padding: 12, display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  <input value={newModName} onChange={e => setNewModName(e.target.value)} placeholder="Part name" style={{ width: '100%', background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '8px 10px', fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#eef4f8', outline: 'none' }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select value={newModCategory} onChange={e => setNewModCategory(e.target.value)} style={{ flex: 1, background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '8px 10px', fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#eef4f8', outline: 'none' }}>
                      {['Exterior', 'Interior', 'Engine', 'Suspension', 'Wheels', 'Exhaust', 'Electronics', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input value={newModBrand} onChange={e => setNewModBrand(e.target.value)} placeholder="Brand" style={{ flex: 1, background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '8px 10px', fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#eef4f8', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={newModCost} onChange={e => setNewModCost(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Cost (optional)" style={{ flex: 1, background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '8px 10px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#eef4f8', outline: 'none' }} />
                    <button
                      disabled={!newModName.trim()}
                      onClick={async () => {
                        if (!newModName.trim()) return;
                        await supabase.from('vehicle_modifications').insert({
                          vehicle_id: vehicleId,
                          part_name: newModName.trim(),
                          category: newModCategory,
                          brand: newModBrand.trim() || null,
                          cost_usd: newModCost ? parseFloat(newModCost) : null,
                        });
                        setNewModName(''); setNewModBrand(''); setNewModCost('');
                        setShowAddModForm(false);
                        loadVehicleData();
                      }}
                      style={{ padding: '8px 16px', background: '#F97316', border: 'none', borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer', opacity: !newModName.trim() ? 0.4 : 1 }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mod list */}
            {modifications.length === 0 && !showAddModForm ? (
              <div style={{ padding: '0 16px 12px' }}>
                <div style={{ textAlign: 'center' as const, padding: '16px', color: '#3a4e60', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                  {isOwner ? 'No modifications logged yet' : 'Stock'}
                </div>
              </div>
            ) : (
              Object.entries(modsByCategory).filter(([, mods]) => mods.length > 0).map(([category, mods]) => (
                <div key={category} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ background: '#0e1320', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#eef4f8' }}>{category}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#5a6e7e' }}>{mods.length}</span>
                  </div>
                  {mods.map((mod: any) => (
                    <div key={mod.id} style={{ padding: '10px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, color: '#eef4f8' }}>{mod.part_name}</div>
                        {mod.brand && <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#5a6e7e', marginTop: 2 }}>{mod.brand}</div>}
                      </div>
                      {mod.cost != null && mod.cost > 0 && (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: '#20c060', fontVariantNumeric: 'tabular-nums' }}>${mod.cost}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── ALBUMS (owner only) ── */}
        {vehicle.is_claimed && isOwner && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>Albums</span>
              <span onClick={() => setShowAlbumsModal(true)} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', cursor: 'pointer' }}>
                Manage Albums
              </span>
            </div>
          </div>
        )}

        {/* ── 10. OWNER ACTIONS ── */}
        {/* Claim CTA */}
        {isUnclaimed && (
          <div style={{ padding: '0 18px 16px' }}>
            <div style={{ background: 'rgba(32,192,96,0.06)', border: `1px solid rgba(32,192,96,0.22)`, borderRadius: 10, padding: 16, textAlign: 'center' as const }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: C.dim, marginBottom: 12 }}>
                Is this your car?
              </div>
              <button
                onClick={() => {
                  if (canClaim) setShowClaimModal(true);
                  else { setGuestJoinAction('claim a plate'); setShowGuestJoinModal(true); }
                }}
                style={{
                  width: '100%', padding: 13, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: C.green, color: '#001a0a',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.18em', textTransform: 'uppercase' as const,
                }}
              >
                Claim This Plate
              </button>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: C.steel, marginTop: 8 }}>
                Claiming lets you manage your vehicle profile and respond to reviews
              </p>
            </div>
          </div>
        )}

        {/* Verify Ownership */}
        {isOwner && vehicle && vehicle.verification_tier === 'standard' && (
          <div style={{ padding: '0 18px 16px' }}>
            <div style={{ background: C.accentDim, border: '1px solid rgba(249,115,22,0.22)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Shield size={18} style={{ color: C.accent, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 4 }}>Become a Verified Owner</p>
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: C.accent, opacity: 0.8 }}>
                    Upload your registration document to verify ownership and unlock enhanced credibility
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVerifyModal(true)}
                style={{
                  width: '100%', marginTop: 12, padding: 12, borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(249,115,22,0.10)', border: `1px solid rgba(249,115,22,0.3)`,
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: C.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Shield size={16} />
                Verify Ownership
              </button>
            </div>
          </div>
        )}

        {/* ── 12. OWNER GARAGE ── */}
        {isOwner && (
          <div style={{ padding: '0 18px 24px' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: C.dim, marginBottom: 12 }}>
              Owner Garage
            </div>

            {/* Owner's Manual row */}
            <div
              onClick={() => {
                if (vehicle.owners_manual_url) {
                  window.open(vehicle.owners_manual_url, '_blank');
                } else {
                  manualInputRef.current?.click();
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 14,
                background: 'rgba(240,160,48,0.06)', border: '1px solid rgba(240,160,48,0.18)',
                borderRadius: 10, cursor: 'pointer', marginBottom: 12,
              }}
            >
              <BookOpen size={18} strokeWidth={1.5} color={C.gold} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: C.gold }}>Owner's Manual</div>
                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: C.steel }}>
                  {vehicle.owners_manual_url ? 'Tap to view PDF' : 'Upload PDF (max 10MB)'}
                </div>
              </div>
              {vehicle.owners_manual_url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={14} color={C.gold} />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveManual(); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    <X size={14} color="#fca5a5" />
                  </button>
                </div>
              ) : (
                <ChevronRight size={14} color={C.steel} />
              )}
            </div>

            {/* Modifications timeline */}
            {vehicle.is_claimed && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: C.steel, marginBottom: 8 }}>
                  Modifications
                </div>
                {modifications.length > 0 ? modifications.map((mod, i) => (
                  <div key={mod.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: i === 0 ? C.accent : C.muted }} />
                    <div>
                      <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: C.white }}>{mod.part_name}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: C.steel }}>{mod.category || 'Modification'}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: C.accent }} />
                    <div>
                      <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: C.white }}>Vehicle Added</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: C.steel, fontVariantNumeric: 'tabular-nums' }}>
                        {vehicle?.claimed_at ? new Date(vehicle.claimed_at).toLocaleDateString() : 'Unknown'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Privacy toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', background: C.carbon1, borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.04)', marginBottom: 12,
            }}>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.white }}>Private Vehicle</div>
                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: C.dim, marginTop: 2 }}>MotoFans need your approval</div>
              </div>
              <button
                onClick={async () => {
                  const { error } = await supabase.from('vehicles').update({ is_private: !vehicle.is_private }).eq('id', vehicleId);
                  if (!error) loadVehicleData();
                }}
                style={{
                  width: 44, height: 24, borderRadius: 12, cursor: 'pointer', border: 'none',
                  background: vehicle.is_private ? C.accent : 'rgba(255,255,255,0.1)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3,
                  left: vehicle.is_private ? 22 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: C.white, transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {/* MotoFans pending panel */}
            <MotoFansPendingPanel vehicleId={vehicleId} onFollowerUpdated={loadVehicleData} />

            {/* Modifications */}
            <div style={{ background: C.carbon1, borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Wrench size={14} strokeWidth={1.5} color={C.dim} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: C.dim }}>Modifications</span>
              </div>

              {/* Modification status progress */}
              <div style={{ marginBottom: 16, padding: 14, background: `linear-gradient(to right, rgba(249,115,22,0.15), rgba(251,146,60,0.15))`, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16, color: C.accent }}>
                      {(() => {
                        const totalMods = modifications.length;
                        const thresholds = BADGE_TIER_THRESHOLDS.Modification ?? { Bronze: 1, Silver: 5, Gold: 20, Platinum: 50 };
                        if (totalMods >= thresholds.Platinum) return 'Platinum Mods';
                        if (totalMods >= thresholds.Gold) return 'Gold Mods';
                        if (totalMods >= thresholds.Silver) return 'Silver Mods';
                        if (totalMods >= thresholds.Bronze) return 'Bronze Mods';
                        return 'No Modifications';
                      })()}
                    </span>
                    <p style={{ fontSize: 10, color: C.steel, fontFamily: "'Barlow', sans-serif" }}>
                      {(() => {
                        const totalMods = modifications.length;
                        const thresholds = BADGE_TIER_THRESHOLDS.Modification ?? { Bronze: 1, Silver: 5, Gold: 20, Platinum: 50 };
                        if (totalMods >= thresholds.Platinum) return 'Max level reached!';
                        if (totalMods >= thresholds.Gold) return `${totalMods}/${thresholds.Platinum} mods to Platinum`;
                        if (totalMods >= thresholds.Silver) return `${totalMods}/${thresholds.Gold} mods to Gold`;
                        if (totalMods >= thresholds.Bronze) return `${totalMods}/${thresholds.Silver} mods to Silver`;
                        return `${totalMods}/${thresholds.Bronze} mods to Bronze`;
                      })()}
                    </p>
                  </div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 26, fontWeight: 700, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>
                    {modifications.length}
                  </div>
                </div>
                {(() => {
                  const totalMods = modifications.length;
                  const thresholds = BADGE_TIER_THRESHOLDS.Modification ?? { Bronze: 1, Silver: 5, Gold: 20, Platinum: 50 };
                  let nextTier = thresholds.Bronze;
                  if (totalMods >= thresholds.Gold) nextTier = thresholds.Platinum;
                  else if (totalMods >= thresholds.Silver) nextTier = thresholds.Gold;
                  else if (totalMods >= thresholds.Bronze) nextTier = thresholds.Silver;
                  if (totalMods < thresholds.Platinum) {
                    const progress = (totalMods / nextTier) * 100;
                    return (
                      <div style={{ width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: 999, height: 12, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: `linear-gradient(to right, ${C.accent}, #fb923c)`, width: `${Math.min(progress, 100)}%`, transition: 'width 0.5s', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6 }}>
                          <span style={{ fontSize: 8, color: '#fff', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{Math.round(progress)}%</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Garage sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <GarageSection title="Powertrain" icon={<Wrench size={24} />} modCount={modsByCategory['Powertrain']?.length || 0} defaultOpen>
                  <ModList mods={modsByCategory['Powertrain'] || []} category="Powertrain" vehicleId={vehicleId} onUpdate={loadVehicleData} />
                </GarageSection>
                <GarageSection title="Suspension & Brakes" icon={<Disc3 size={24} />} modCount={modsByCategory['Suspension & Brakes']?.length || 0}>
                  <ModList mods={modsByCategory['Suspension & Brakes'] || []} category="Suspension & Brakes" vehicleId={vehicleId} onUpdate={loadVehicleData} />
                </GarageSection>
                <GarageSection title="Wheels & Tires" icon={<Disc3 size={24} />} modCount={modsByCategory['Wheels & Tires']?.length || 0}>
                  <ModList mods={modsByCategory['Wheels & Tires'] || []} category="Wheels & Tires" vehicleId={vehicleId} onUpdate={loadVehicleData} />
                </GarageSection>
                <GarageSection title="Exterior" icon={<Palette size={24} />} modCount={modsByCategory['Exterior']?.length || 0}>
                  <ModList mods={modsByCategory['Exterior'] || []} category="Exterior" vehicleId={vehicleId} onUpdate={loadVehicleData} />
                </GarageSection>
                <GarageSection title="Interior" icon={<Armchair size={24} />} modCount={modsByCategory['Interior']?.length || 0}>
                  <ModList mods={modsByCategory['Interior'] || []} category="Interior" vehicleId={vehicleId} onUpdate={loadVehicleData} />
                </GarageSection>
                <GarageSection title="Fluids & Consumables" icon={<Droplet size={24} />} modCount={modsByCategory['Fluids & Consumables']?.length || 0}>
                  <ModList mods={modsByCategory['Fluids & Consumables'] || []} category="Fluids & Consumables" vehicleId={vehicleId} onUpdate={loadVehicleData} />
                </GarageSection>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {showVerifyModal && vehicle && (
        <VerifyOwnershipModal
          vehicleId={vehicleId}
          onClose={() => setShowVerifyModal(false)}
          onSuccess={() => {
            setShowVerifyModal(false);
            loadVehicleData();
          }}
        />
      )}

      {showClaimModal && vehicle && user && (
        <VinClaimModal
          vehicleId={vehicleId}
          vehicleInfo={{
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color,
            plateState: vehicle.state || '',
            plateNumber: vehicle.plate_number || '',
          }}
          onClose={() => setShowClaimModal(false)}
          onSuccess={() => {
            setShowClaimModal(false);
            loadVehicleData();
          }}
        />
      )}

      {showGuestJoinModal && (
        <GuestJoinModal
          action={guestJoinAction}
          onClose={() => setShowGuestJoinModal(false)}
        />
      )}

      {showAlbumsModal && (
        <AlbumsModal vehicleId={vehicleId} onClose={() => setShowAlbumsModal(false)} />
      )}

      {showMotoFansModal && vehicle && (
        <MotoFansModal
          vehicleId={vehicleId}
          vehicleName={[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle'}
          fanCount={followerCount}
          onClose={() => setShowMotoFansModal(false)}
          onNavigate={onNavigate}
        />
      )}

      {showShareModal && vehicle && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div style={{ position: 'relative', maxWidth: 420, width: '100%' }}>
            <button
              onClick={() => setShowShareModal(false)}
              style={{ position: 'absolute', top: -48, right: 0, padding: 8, color: '#fff', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <ShareBuildCard
              vehicle={{
                id: vehicle.id,
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                stock_image_url: vehicle.stock_image_url ?? null
              }}
              user={{
                handle: user?.email?.split('@')[0] || 'anonymous',
                avatar_url: null,
                reputation_score: 0,
                tier: 'Driver'
              }}
              stats={{
                badge_count: 0,
                rating_driver: avgDriverScore || 0,
                rating_vehicle: avgCoolScore || 0
              }}
            />
            <div style={{ marginTop: 16, textAlign: 'center' as const }}>
              <p style={{ fontSize: 13, color: C.steel, marginBottom: 16 }}>
                Take a screenshot to share on social media
              </p>
              <button
                onClick={() => setShowShareModal(false)}
                style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.06)', borderRadius: 8, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontSize: 13, border: 'none', color: C.white, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {guestMode && <GuestBottomNav onNavigate={onNavigate} />}
    </Layout>
  );
}
