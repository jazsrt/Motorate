import { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { ModerationStatus } from '../components/ModerationStatus';
import { useModerationSubscription } from '../hooks/useModerationSubscription';
import { uploadImage, deleteImage } from '../lib/storage';
import { getVehicleImageUrl } from '../lib/carImageryApi';
import { VerifyOwnershipModal } from '../components/VerifyOwnershipModal';
import { VinClaimModal } from '../components/VinClaimModal';
import { GuestJoinModal } from '../components/GuestJoinModal';
import { TierBadge, type VerificationTier } from '../components/TierBadge';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Edit, Trash2, AlertCircle, Upload, X, Star, Shield, Key, Info, Share2, ChevronLeft, User, Wrench, Disc3, Palette, Armchair, Droplet, FileText, Download, Car, MapPin, MoreHorizontal, Camera, BookOpen, ChevronRight, ChevronDown, Heart, CheckCircle } from 'lucide-react';
import { OnNavigate } from '../types/navigation';
import { ShareBuildCard } from '../components/ShareBuildCard';
import { shareToSocial } from '../components/ShareCardGenerator';
import { GuestBottomNav } from '../components/GuestBottomNav';
import { RateDriverModal } from '../components/RateDriverModal';
import { VehicleStats } from '../components/VehicleStats';
import { GarageSection } from '../components/GarageSection';
import { ModList } from '../components/ModList';
import { StickerSlab } from '../components/StickerSlab';
import { VehicleStickerSelector } from '../components/VehicleStickerSelector';
import { BADGE_TIER_THRESHOLDS } from '../config/badgeConfig';
import { UserAvatar } from '../components/UserAvatar';
import { VehicleFollowButton } from '../components/VehicleFollowButton';
import { FollowButton } from '../components/FollowButton';
import { BadgeChip } from '../components/badges/BadgeChip';

const TIER_COLORS = {
  Platinum: { bg: 'rgba(240,160,48,0.18)', border: 'rgba(240,160,48,0.55)', text: '#f5cc55' },
  Gold:     { bg: 'rgba(240,160,48,0.12)', border: 'rgba(240,160,48,0.4)',  text: '#f0a030' },
  Silver:   { bg: 'rgba(154,176,192,0.1)',  border: 'rgba(154,176,192,0.3)', text: '#9ab0c0' },
  Bronze:   { bg: 'rgba(192,120,64,0.1)',   border: 'rgba(192,120,64,0.3)',  text: '#c07840' },
};

function getBadgeType(badge: { category?: string | null; rarity?: string | null; tier?: string | null; }): 'prestige' | 'milestone' | 'identity' {
  const cat = (badge.category ?? '').toLowerCase();
  const rar = (badge.rarity ?? '').toLowerCase();
  if (cat.includes('rank') || cat.includes('leader') || cat.includes('top') || rar === 'legendary' || rar === 'epic') return 'prestige';
  if (cat.includes('identity') || cat.includes('build') || cat.includes('mod') || cat === 'builder') return 'identity';
  return 'milestone';
}

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
  vin: string | null;
  owner_proof_url: string | null;
  owners_manual_url: string | null;
  stock_image_url?: string | null;
  profile_image_url?: string | null;
  state?: string | null;
  plate_number?: string | null;
  vin_year?: number | null;
  vin_make?: string | null;
  vin_model?: string | null;
  vin_trim?: string | null;
  vin_body_class?: string | null;
  vin_drive_type?: string | null;
  vin_fuel_type?: string | null;
  vin_engine_cylinders?: string | null;
  vin_engine_displacement?: string | null;
  vin_horsepower?: string | null;
  vin_transmission?: string | null;
  vin_doors?: string | null;
  vin_plant_country?: string | null;
  vin_decoded_at?: string | null;
  is_private?: boolean;
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

function VehicleFollowersPanel({ vehicleId, onFollowerUpdated }: { vehicleId: string; onFollowerUpdated: () => void }) {
  const [follows, setFollows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { loadFollows(); }, [vehicleId]);

  const loadFollows = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vehicle_follows')
      .select('id, status, created_at, follower:profiles!vehicle_follows_follower_id_fkey(id, handle, avatar_url)')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });
    setFollows(data || []);
    setLoading(false);
  };

  const pending = follows.filter(f => f.status === 'pending');
  const accepted = follows.filter(f => f.status === 'accepted');

  const handleApprove = async (followId: string, followerId: string) => {
    await supabase.from('vehicle_follows').update({ status: 'accepted' }).eq('id', followId);
    try { const { notifyVehicleFollowApproved } = await import('../lib/notifications'); await notifyVehicleFollowApproved(followerId, vehicleId); } catch {}
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
        <span>Followers · {accepted.length}</span>
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

export function VehicleDetailPage({ vehicleId, onNavigate, onBack, onEditBuildSheet, guestMode = false, scrollTo, openReviewModal }: VehicleDetailPageProps) {
  const C = {
    black: '#030508', carbon0: '#070a0f', carbon1: '#0a0d14', carbon2: '#0e1320',
    steel: '#2c3a50', muted: '#445566', dim: '#7a8e9e', light: '#a8bcc8', white: '#eef4f8',
    accent: '#F97316', accentDim: 'rgba(249,115,22,0.12)', green: '#20c060', gold: '#f0a030',
  } as const;

  const { user } = useAuth();
  const { goBack, getReturnLabel } = useNavigation();
  const returnLabel = getReturnLabel();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [modifications, setModifications] = useState<Modification[]>([]);
  const [modsByCategory, setModsByCategory] = useState<Record<string, any[]>>({});
  const [vehicleImages, setVehicleImages] = useState<VehicleImage[]>([]);
  const [spotCount, setSpotCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [cityRank, setCityRank] = useState<number | null>(null);
  const [showSpotReviewModal, setShowSpotReviewModal] = useState(false);

  useModerationSubscription(() => !guestMode && loadVehicleData());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showGuestJoinModal, setShowGuestJoinModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [guestJoinAction, setGuestJoinAction] = useState('');
  const [error, setError] = useState('');
  const [showRateDriver, setShowRateDriver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const [uploadingManual, setUploadingManual] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const [heroImgError, setHeroImgError] = useState(false);
  const [carImageryUrl, setCarImageryUrl] = useState<string | null>(null);
  const [vehicleBadges, setVehicleBadges] = useState<any[]>([]);
  const [vBadges, setVBadges] = useState<any[]>([]);
  const isOwner = user && vehicle?.owner_id === user.id;
  const isUnclaimed = vehicle && !vehicle.is_claimed;
  const canClaim = user && isUnclaimed && !vehicle?.owner_id;

  useEffect(() => {
    loadVehicleData();
  }, [vehicleId]);

  useEffect(() => {
    if (vehicle && !vehicleImages[0]?.image_url && !vehicle.stock_image_url && !vehicle.profile_image_url) {
      getVehicleImageUrl(vehicle.make || '', vehicle.model || '', vehicle.year || undefined).then(url => {
        if (url) setCarImageryUrl(url);
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

  const loadVehicleData = async () => {
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('*, profiles!owner_id(id, handle, avatar_url)')
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
    const { data: spotHistoryData } = await supabase
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
    } catch (error) {
      // vehicle_images table may not exist yet
    }

    if (vehicleData) {
      const ownerData = vehicleData.profiles;
      setVehicle({
        ...vehicleData,
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
      setReviews(mappedReviews as any);
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
  };

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
  }, [vehicleId]);

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

      const { data: uploadData, error: uploadError } = await supabase.storage
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
    } catch (err: any) {
      setError(err.message || 'Failed to upload manual');
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
    } catch (err: any) {
      setError(err.message || 'Failed to remove manual');
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
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
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
    } catch (err: any) {
      setError(err.message || 'Failed to set primary image');
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
    } catch (err: any) {
      setError(err.message || 'Failed to delete image');
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
  const vehicleImageUrl = vehicle?.profile_image_url || vehicle?.stock_image_url || carImageryUrl;

  // Derive encounter count from reviews
  const encounterCount = reviews.length;

  // Derive RP score (sum of all avg ratings)
  const rpScore = ratingCategories.length > 0
    ? Math.round(ratingCategories.reduce((s, c) => s + c.avg, 0) * 10)
    : 0;

  // VIN specs for specs grid
  const vinSpecs = vehicle ? [
    { label: 'Engine', value: vehicle.vin_engine_displacement ? `${vehicle.vin_engine_displacement}${vehicle.vin_engine_cylinders ? ` ${vehicle.vin_engine_cylinders}-cyl` : ''}` : null },
    { label: 'Power', value: vehicle.vin_horsepower ? `${vehicle.vin_horsepower} hp` : null },
    { label: '0-60', value: null },
    { label: 'Color', value: vehicle.color },
    { label: 'Trans.', value: vehicle.vin_transmission },
    { label: 'Drive', value: vehicle.vin_drive_type },
  ].filter(s => s.value) : [];

  // Powertrain string
  const powertrain = [vehicle?.vin_fuel_type, vehicle?.vin_drive_type].filter(Boolean).join(' / ');

  // Verification badge color
  const verBadgeColor = vehicle?.verification_tier === 'vin_verified' ? C.green : vehicle?.is_claimed ? C.green : C.dim;

  if (loading) {
    return (
      <Layout currentPage="profile" onNavigate={onNavigate}>
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
      <Layout currentPage="profile" onNavigate={onNavigate}>
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
    <Layout currentPage="profile" onNavigate={onNavigate}>
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

        {/* ── 1. HERO (310px) ── */}
        <div style={{ position: 'relative', width: '100%', height: 310, overflow: 'hidden', background: C.black }}>
          {(() => {
            const heroUrl = vehicle.profile_image_url || vehicle.stock_image_url || carImageryUrl;
            return heroUrl && !heroImgError ? (
              <img
                src={heroUrl}
                alt="Vehicle"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setHeroImgError(true)}
              />
            ) : (
              /* Dark HUD fallback */
              <div style={{
                position: 'absolute', inset: 0,
                background: `radial-gradient(ellipse at 50% 60%, ${C.carbon2} 0%, ${C.black} 70%)`,
              }}>
                <div style={{
                  position: 'absolute', inset: 0, opacity: 0.06,
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }} />
                <Car size={80} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', color: C.steel, opacity: 0.3 }} />
              </div>
            );
          })()}

          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(to bottom, rgba(3,5,8,0.48) 0%, transparent 28%, transparent 42%, rgba(3,5,8,1) 100%), linear-gradient(to right, rgba(3,5,8,0.2) 0%, transparent 55%)',
          }} />

          {/* Back button */}
          <button
            onClick={goBack}
            style={{ position: 'absolute', top: 14, left: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(7,10,15,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}
          >
            <ArrowLeft size={16} color={C.white} strokeWidth={1.5} />
          </button>

          {/* Verification badge */}
          <div style={{ position: 'absolute', top: 14, left: 60, display: 'flex', alignItems: 'center', gap: 5, zIndex: 2 }}>
            <Shield size={13} color={verBadgeColor} strokeWidth={2} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
              letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: verBadgeColor,
            }}>
              {vehicle.verification_tier === 'vin_verified' ? 'Verified' : vehicle.is_claimed ? 'Claimed' : 'Unclaimed'}
            </span>
          </div>

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
            style={{ position: 'absolute', top: 14, right: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(7,10,15,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}
            title="Share this vehicle"
          >
            <Share2 size={16} color={C.white} strokeWidth={1.5} />
          </button>

          {/* Hero bottom content */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 18px 16px', zIndex: 2 }}>
            {/* Make eyebrow */}
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase' as const, color: C.accent, marginBottom: 2 }}>
              {vehicle.make || 'Unknown'}
            </div>
            {/* Model */}
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 32, fontWeight: 700, color: C.white, textTransform: 'uppercase' as const, lineHeight: 0.92, marginBottom: 4 }}>
              {vehicle.model || 'Vehicle'}
            </div>
            {/* Year + powertrain */}
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, color: C.light, marginBottom: 10 }}>
              {[vehicle.year, vehicle.vin_trim, powertrain].filter(Boolean).join(' / ')}
            </div>

            {/* RP score + City Rank row */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 34, fontWeight: 700, color: C.white, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{rpScore}</span>
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: C.accent }}>RP</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: C.dim, marginRight: 4 }}>City</span>
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 30, fontWeight: 700, color: C.accent, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {cityRank != null ? `#${cityRank}` : '\u2014'}
                </span>
              </div>
            </div>

            {/* CTAs: VehicleFollowButton + Log Enc. */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <VehicleFollowButton
                  vehicleId={vehicleId}
                  vehicleOwnerId={vehicle?.owner_id}
                  isPrivateVehicle={vehicle?.is_private || false}
                  onFollowChange={() => loadVehicleData()}
                />
              </div>
              <button
                onClick={() => {
                  if (guestMode) { setGuestJoinAction('log a spot'); setShowGuestJoinModal(true); }
                  else onNavigate('scan', { vehicleId });
                }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 0', borderRadius: 8,
                  background: 'transparent', border: `1px solid ${C.accent}`,
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.accent, cursor: 'pointer',
                }}
              >
                <MapPin size={13} strokeWidth={2} />
                Log Enc.
              </button>
            </div>
          </div>

          {/* Owner edit photos button */}
          {isOwner && (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ position: 'absolute', top: 14, right: 60, background: 'rgba(7,10,15,0.7)', backdropFilter: 'blur(8px)', padding: '6px 10px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', zIndex: 2 }}
            >
              <Camera size={12} strokeWidth={1.5} color={C.dim} />
              <span style={{ fontSize: 10, color: C.dim, fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Edit</span>
            </button>
          )}
        </div>

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
        <input ref={manualInputRef} type="file" accept="application/pdf" onChange={handleManualUpload} style={{ display: 'none' }} />

        {/* ── 2. STAT STRIP ── */}
        <div style={{ display: 'flex', background: C.carbon1, borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
          {/* Trackers */}
          <div style={{ flex: 1, padding: '12px 0', textAlign: 'center' as const, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>{followerCount}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'rgba(249,115,22,0.6)' }}>Trackers</div>
          </div>
          {/* Spots */}
          <div style={{ flex: 1, padding: '12px 0', textAlign: 'center' as const, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: C.white, fontVariantNumeric: 'tabular-nums' }}>{spotCount}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: C.muted }}>Spots</div>
          </div>
          {/* Encounters */}
          <div style={{ flex: 1, padding: '12px 0', textAlign: 'center' as const, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: C.white, fontVariantNumeric: 'tabular-nums' }}>{encounterCount}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: C.muted }}>Encounters</div>
          </div>
          {/* City Rank */}
          <div style={{ flex: 1, padding: '12px 0', textAlign: 'center' as const }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: C.white, fontVariantNumeric: 'tabular-nums' }}>{cityRank != null ? `#${cityRank}` : '\u2014'}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: C.muted }}>City Rank</div>
          </div>
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
                  return (order[b.tier] || 0) - (order[a.tier] || 0);
                })
                .map(badge => {
                  const colors = TIER_COLORS[badge.tier as keyof typeof TIER_COLORS] || TIER_COLORS.Bronze;
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
          <div
            onClick={() => vehicle.owner && onNavigate('user-profile', vehicle.owner.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
              background: C.carbon0, borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer',
            }}
          >
            <UserAvatar
              avatarUrl={vehicle.owner.avatar_url}
              handle={vehicle.owner.handle || 'unknown'}
              size="md"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 700, color: C.white }}>
                @{vehicle.owner.handle || 'anonymous'}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600, color: C.dim, letterSpacing: '0.08em' }}>
                Owner {vehicle.verification_tier === 'vin_verified' ? '· Verified' : '· Claimed'}
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <FollowButton targetUserId={vehicle.owner.id} size="sm" />
            </div>
          </div>
        )}

        {/* ── 4. FOLLOW NOTE ── */}
        {vehicle.is_claimed && vehicle.owner && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 18px',
            background: C.accentDim, borderBottom: '1px solid rgba(249,115,22,0.15)',
          }}>
            <Info size={14} style={{ color: C.accent, flexShrink: 0, marginTop: 2 }} strokeWidth={1.5} />
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: C.accent, lineHeight: 1.4 }}>
              Track this vehicle for spot & RP alerts. Follow the owner to see their whole fleet.
            </p>
          </div>
        )}

        {/* ── 5. BADGE RACK ── */}
        {vehicleBadges.length > 0 && (
          <div style={{ background: C.carbon0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 8px' }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: C.dim }}>Badges Earned</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, color: C.steel, fontVariantNumeric: 'tabular-nums' }}>{vehicleBadges.length}</span>
            </div>
            <div style={{ padding: '0 18px 14px', display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
              {[...vehicleBadges].sort((a, b) => {
                const order: Record<string, number> = { Platinum: 4, Gold: 3, Silver: 2, Bronze: 1 };
                return (order[b.tier] || 0) - (order[a.tier] || 0);
              }).map(badge => {
                const colors = TIER_COLORS[badge.tier as keyof typeof TIER_COLORS] || TIER_COLORS.Bronze;
                return (
                  <div key={badge.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: colors.bg, border: `1px solid ${colors.border}`,
                    borderRadius: 5, padding: '4px 9px',
                  }}>
                    <span style={{
                      fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 700,
                      letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: colors.text,
                    }}>
                      {badge.name}
                    </span>
                    {badge.sticker_count && (
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 7,
                        color: colors.text, opacity: 0.7, fontVariantNumeric: 'tabular-nums',
                      }}>
                        x{badge.sticker_count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 6. PHOTO GALLERY ── */}
        {vehicleImages.length > 0 && (
          <div style={{ padding: '16px 0 16px 18px' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: C.dim, marginBottom: 10 }}>
              Photos
            </div>
            <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingRight: 18 }}>
              {vehicleImages.map((img, i) => (
                <div key={img.id} style={{ position: 'relative', flexShrink: 0, width: i === 0 ? 160 : 90, height: 110 }}>
                  <img
                    src={img.image_url}
                    alt="Vehicle"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {img.is_primary && (
                    <div style={{ position: 'absolute', top: 6, left: 6, background: C.accent, color: C.black, fontSize: 8, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' as const, padding: '2px 6px', borderRadius: 3 }}>
                      Primary
                    </div>
                  )}
                  {isOwner && (
                    <div style={{ position: 'absolute', bottom: 4, right: 4, display: 'flex', gap: 3 }}>
                      {!img.is_primary && (
                        <button onClick={() => handleSetPrimary(img.id)} style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Star size={11} color={C.accent} />
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
          </div>
        )}

        {/* Upload button for owner when no images */}
        {isOwner && vehicleImages.length === 0 && (
          <div style={{ padding: '16px 18px' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%', padding: '14px', borderRadius: 8,
                background: C.carbon1, border: `1px dashed ${C.steel}`,
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.dim,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Upload size={14} />
              {uploading ? 'Uploading...' : 'Add First Photo'}
            </button>
          </div>
        )}

        {/* ── 7. SPECS GRID ── */}
        {vinSpecs.length > 0 && (
          <div style={{ padding: '0 18px 16px' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: C.dim, marginBottom: 10 }}>
              Specs
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {vinSpecs.map(spec => (
                <div key={spec.label} style={{ background: C.carbon1, padding: '10px 12px' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: C.steel, marginBottom: 4 }}>
                    {spec.label}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: C.white, fontVariantNumeric: 'tabular-nums' }}>
                    {spec.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 8. BUMPER STICKERS ── */}
        <div style={{ padding: '0 18px 16px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: C.dim, marginBottom: 10 }}>
            Bumper Stickers
          </div>
          <StickerSlab vehicleId={vehicleId} />
          {!isOwner && user && !guestMode && (
            <div style={{ marginTop: 10 }}>
              <VehicleStickerSelector vehicleId={vehicleId} onStickerGiven={loadVehicleData} />
            </div>
          )}
        </div>

        {/* ── 9. RATING BREAKDOWN ── */}
        {ratingCategories.length > 0 && (
          <div style={{ padding: '0 18px 16px' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: C.dim, marginBottom: 10 }}>
              Ratings
            </div>
            <div style={{ background: C.carbon1, borderRadius: 10, padding: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Sentiment counts */}
              {(loveCount > 0 || hateCount > 0) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fb7185' }}>
                    <Heart size={14} fill="currentColor" />
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{loveCount}</span>
                    <span style={{ fontSize: 11, color: 'rgba(251,113,133,0.7)' }}>Love It</span>
                  </div>
                  <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171' }}>
                    <X size={14} />
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{hateCount}</span>
                    <span style={{ fontSize: 11, color: 'rgba(248,113,113,0.7)' }}>Hate It</span>
                  </div>
                </div>
              )}

              {/* Category grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 16, rowGap: 8 }}>
                {ratingCategories.map(cat => (
                  <div key={cat.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, color: C.steel, textTransform: 'uppercase' as const, letterSpacing: '0.12em' }}>{cat.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ color: C.accent, fontSize: 12 }}>{'\u2605'}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: C.white, fontVariantNumeric: 'tabular-nums' }}>{cat.avg.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
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

        {/* ── 11. ENCOUNTER LOG ── */}
        <div id="reviews" style={{ padding: '0 18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: C.dim }}>
              Encounter Log
            </span>
            {reviews.length > 0 && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                background: C.accentDim, color: C.accent, borderRadius: 10, padding: '2px 8px',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {reviews.length}
              </span>
            )}
          </div>

          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: '32px 0', background: C.carbon1, borderRadius: 10 }}>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: C.steel }}>
                No encounters yet. Spot this plate to leave the first review.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reviews.map((review) => {
                const isPreClaim = canModerateReview(review);
                const canDelete = review.author_id === user?.id || (isOwner && isPreClaim);
                const canHide = isOwner && !isPreClaim;

                return (
                  <div
                    key={review.id}
                    style={{ background: C.carbon1, border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 14 }}
                  >
                    {/* Moderation status for own reviews */}
                    {review.author_id === user?.id && review.moderation_status !== 'approved' && (
                      <div style={{ marginBottom: 10 }}>
                        <ModerationStatus
                          status={review.moderation_status}
                          rejectionReason={review.rejection_reason}
                          isOwnContent={true}
                        />
                      </div>
                    )}

                    {/* Review header: avatar + handle + date */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.carbon2, overflow: 'hidden', flexShrink: 0 }}>
                        {review.author.avatar_url && (
                          <img src={review.author.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        )}
                        {!review.author.avatar_url && (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={14} color={C.steel} />
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 700, color: C.accent }}>
                          @{review.author.handle || 'Anonymous'}
                        </span>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: C.steel, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Hide/Delete controls */}
                      {(canDelete || canHide) && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {canHide && (
                            <button
                              onClick={() => handleToggleHidden(review)}
                              style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: C.dim, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}
                            >
                              {review.is_hidden_by_owner ? 'Unhide' : 'Hide'}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteReview(review.id)}
                              style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Comment */}
                    {review.comment && (
                      <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: C.light, lineHeight: 1.5, marginBottom: 8 }}>{review.comment}</p>
                    )}

                    {/* Rating chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {review.rating_vehicle != null && (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(240,160,48,0.1)', color: C.gold, fontVariantNumeric: 'tabular-nums' }}>
                          {'\u2605'} Vehicle {review.rating_vehicle}/5
                        </span>
                      )}
                      {review.rating_driver != null && (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(240,160,48,0.1)', color: C.gold, fontVariantNumeric: 'tabular-nums' }}>
                          {'\u2605'} Driver {review.rating_driver}/5
                        </span>
                      )}
                      {review.rating_driving != null && (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(240,160,48,0.1)', color: C.gold, fontVariantNumeric: 'tabular-nums' }}>
                          {'\u2605'} Driving {review.rating_driving}/5
                        </span>
                      )}
                      {review.looks_rating != null && (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(240,160,48,0.1)', color: C.gold, fontVariantNumeric: 'tabular-nums' }}>
                          {'\u2605'} Looks {review.looks_rating}/5
                        </span>
                      )}
                      {review.sound_rating != null && (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(240,160,48,0.1)', color: C.gold, fontVariantNumeric: 'tabular-nums' }}>
                          {'\u2605'} Sound {review.sound_rating}/5
                        </span>
                      )}
                      {review.condition_rating != null && (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(240,160,48,0.1)', color: C.gold, fontVariantNumeric: 'tabular-nums' }}>
                          {'\u2605'} Condition {review.condition_rating}/5
                        </span>
                      )}
                    </div>

                    {/* Sentiment + spot type */}
                    {review.sentiment && (
                      <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, padding: '2px 8px', borderRadius: 10,
                          background: review.sentiment === 'love' ? 'rgba(251,113,133,0.12)' : review.sentiment === 'hate' ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.05)',
                          color: review.sentiment === 'love' ? '#fb7185' : review.sentiment === 'hate' ? '#f87171' : C.dim,
                        }}>
                          {review.sentiment === 'love' ? 'Love It' : review.sentiment === 'hate' ? 'Hate It' : review.sentiment}
                        </span>
                        {review.spot_type && (
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: C.dim }}>
                            {review.spot_type === 'full' ? 'Full Spot' : 'Quick Spot'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Pre-claim indicator */}
                    {canModerateReview(review) && (
                      <div style={{ marginTop: 8, fontSize: 10, color: C.accent, display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.06em' }}>
                        <AlertCircle size={11} /> Pre-claim review
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

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

            {/* Build timeline */}
            {vehicle.is_claimed && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: C.steel, marginBottom: 8 }}>
                  Build Timeline
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
                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: C.dim, marginTop: 2 }}>Followers need your approval</div>
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

            {/* Followers panel */}
            <VehicleFollowersPanel vehicleId={vehicleId} onFollowerUpdated={loadVehicleData} />

            {/* The Garage (Mods) */}
            <div style={{ background: C.carbon1, borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Wrench size={14} strokeWidth={1.5} color={C.dim} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: C.dim }}>The Garage</span>
              </div>

              {/* Build status progress */}
              <div style={{ marginBottom: 16, padding: 14, background: `linear-gradient(to right, rgba(249,115,22,0.15), rgba(251,146,60,0.15))`, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16, color: C.accent }}>
                      {(() => {
                        const totalMods = modifications.length;
                        const thresholds = BADGE_TIER_THRESHOLDS.Modification;
                        if (totalMods >= thresholds.Platinum) return 'Platinum Build';
                        if (totalMods >= thresholds.Gold) return 'Gold Build';
                        if (totalMods >= thresholds.Silver) return 'Silver Build';
                        if (totalMods >= thresholds.Bronze) return 'Bronze Build';
                        return 'No Mods Yet';
                      })()}
                    </span>
                    <p style={{ fontSize: 10, color: C.steel, fontFamily: "'Barlow', sans-serif" }}>
                      {(() => {
                        const totalMods = modifications.length;
                        const thresholds = BADGE_TIER_THRESHOLDS.Modification;
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
                  const thresholds = BADGE_TIER_THRESHOLDS.Modification;
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
                stock_image_url: vehicle.stock_image_url
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
