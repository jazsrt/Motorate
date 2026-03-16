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
import { ArrowLeft, Edit, Trash2, AlertCircle, Upload, X, Star, Shield, Key, Info, Share2, ChevronLeft, User, Wrench, Disc3, Palette, Armchair, Droplet, FileText, Download, Car, MapPin, MoreHorizontal, Camera, BookOpen, ChevronRight, ChevronDown, Heart } from 'lucide-react';
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

export function VehicleDetailPage({ vehicleId, onNavigate, onBack, onEditBuildSheet, guestMode = false, scrollTo, openReviewModal }: VehicleDetailPageProps) {
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

    // Delete from reviews table (cascade will handle posts)
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

  if (!vehicle) {
    return (
      <Layout currentPage="profile" onNavigate={onNavigate}>
        <div className="text-center py-16 px-4">
          <p style={{ fontSize: '15px', color: 'var(--text-tertiary)' }}>Vehicle not found</p>
          <button
            onClick={onBack}
            className="mt-4"
            style={{ fontSize: '13px', color: 'var(--accent)' }}
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
      <div className="pb-24 page-enter">
        {error && (
          <div className="mx-4 mb-4 rounded-[12px] p-3 flex items-start gap-3" style={{ background: 'rgba(138,74,74,0.12)', border: '1px solid rgba(138,74,74,0.3)' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--negative)' }} strokeWidth={1.5} />
            <p style={{ fontSize: '13px', color: 'var(--negative)' }}>{error}</p>
          </div>
        )}

        {/* Hero Image */}
        <div className="relative w-full stg v3-stagger v3-stagger-1" style={{ minHeight: 200 }}>
          {(() => {
            const heroUrl = vehicleImages[0]?.image_url || vehicle.stock_image_url || vehicle.profile_image_url || carImageryUrl;
            return heroUrl && !heroImgError ? (
              <div className="relative w-full h-52 overflow-hidden">
                <img
                  src={heroUrl}
                  alt="Vehicle"
                  className="w-full h-full object-cover"
                  onError={() => setHeroImgError(true)}
                />
                {/* Top gradient */}
                <div className="absolute top-0 left-0 right-0" style={{ height: '45%', background: 'linear-gradient(to bottom, rgba(3,5,8,0.82) 0%, transparent 100%)' }} />
                {/* Bottom gradient */}
                <div className="absolute bottom-0 left-0 right-0" style={{ height: '65%', background: 'linear-gradient(to top, rgba(3,5,8,0.97) 0%, rgba(3,5,8,0.6) 40%, transparent 100%)' }} />
              </div>
            ) : (
              <div className="w-full h-52 bg-gradient-to-br from-[var(--bg)] to-[var(--s2)] flex items-center justify-center">
                <Car className="w-20 h-20 text-quaternary" />
              </div>
            );
          })()}

          {/* Back button */}
          <button
            onClick={goBack}
            className="absolute top-3 left-3 flex items-center justify-center transition-all active:scale-90"
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(7,10,15,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <ArrowLeft className="w-4 h-4 text-white" strokeWidth={1.5} />
          </button>

          {/* Verified / Claimed badge */}
          <div className="absolute top-3 left-14">
            <span
              style={
                vehicle.verification_tier === 'vin_verified'
                  ? { fontFamily: 'var(--font-cond)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'var(--green)', background: 'rgba(32,192,96,0.12)', border: '1px solid rgba(32,192,96,0.25)', borderRadius: '3px', padding: '3px 8px' }
                  : vehicle.is_claimed
                    ? { fontFamily: 'var(--font-cond)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'var(--green)', background: 'rgba(32,192,96,0.12)', border: '1px solid rgba(32,192,96,0.25)', borderRadius: '3px', padding: '3px 8px' }
                    : { fontFamily: 'var(--font-cond)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'var(--muted)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '3px', padding: '3px 8px' }
              }
            >
              {vehicle.verification_tier === 'vin_verified'
                ? 'VERIFIED'
                : vehicle.is_claimed
                  ? 'CLAIMED'
                  : 'UNCLAIMED'}
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
            className="absolute top-3 right-3 flex items-center justify-center transition-all active:scale-90"
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(7,10,15,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
            title="Share this vehicle"
          >
            <Share2 className="w-4 h-4 text-white" strokeWidth={1.5} />
          </button>

          {/* Vehicle identity at bottom of hero */}
          <div className="absolute bottom-3 left-3 right-3">
            <div style={{ fontFamily: 'var(--font-cond)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: 'var(--accent)', marginBottom: 2 }}>
              {vehicle.make || 'Unknown'}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--white)', lineHeight: 1, marginBottom: 4 }}>
              {vehicle.model || 'Vehicle'}
            </div>
            <div style={{ fontFamily: 'var(--font-cond)', fontSize: '11px', fontWeight: 600, color: 'var(--light)' }}>
              {[vehicle.year, vehicle.vin_trim || vehicle.color].filter(Boolean).join(' · ')}
            </div>
          </div>

          {isOwner && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Camera className="w-3 h-3 text-[var(--t3)]" strokeWidth={1.5} />
              <span className="text-[10px] text-[var(--t3)] font-medium">Edit Photos</span>
            </button>
          )}
        </div>

        {/* Stats Strip */}
        <div style={{ display: 'flex', background: 'var(--carbon-1)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Followers */}
          <div style={{ flex: 1, padding: '12px 0', textAlign: 'center' as const, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--white)' }}>{followerCount}</div>
            <div style={{ fontFamily: 'var(--font-cond)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'var(--muted)' }}>Followers</div>
          </div>
          {/* Spots — primary accent */}
          <div style={{ flex: 1, padding: '12px 0', textAlign: 'center' as const, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--accent)' }}>{spotCount}</div>
            <div style={{ fontFamily: 'var(--font-cond)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'var(--muted)' }}>Spots</div>
          </div>
          {/* Views */}
          <div style={{ flex: 1, padding: '12px 0', textAlign: 'center' as const, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--white)' }}>{viewCount}</div>
            <div style={{ fontFamily: 'var(--font-cond)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'var(--muted)' }}>Views</div>
          </div>
          {/* Rank */}
          <div style={{ flex: 1, padding: '12px 0', textAlign: 'center' as const }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--white)' }}>{'\u2014'}</div>
            <div style={{ fontFamily: 'var(--font-cond)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'var(--muted)' }}>Rank</div>
          </div>
        </div>

        {/* Primary Actions */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 16px' }}>
          <button
            onClick={() => {
              if (guestMode) { setGuestJoinAction('log a spot'); setShowGuestJoinModal(true); }
              else onNavigate('scan', { vehicleId });
            }}
            style={{ flex: 1.5, background: 'var(--accent)', borderRadius: '8px', padding: '12px', fontFamily: 'var(--font-cond)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--black)', border: 'none', cursor: 'pointer' }}
          >
            Log Spot
          </button>
          <button
            style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '12px', fontFamily: 'var(--font-cond)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--light)', cursor: 'pointer' }}
          >
            Follow
          </button>
        </div>

        {/* Rating Breakdown + Sentiment */}
        {ratingCategories.length > 0 && (
          <div className="px-4 mb-4 stg">
            <div className="card-v3 card-v3-lift p-4 space-y-3">
              {/* Sentiment Counts */}
              {(loveCount > 0 || hateCount > 0) && (
                <div className="flex items-center justify-center gap-6 pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <Heart className="w-4 h-4 fill-current" />
                    <span className="text-sm font-bold">{loveCount}</span>
                    <span className="text-xs text-rose-400/70">Love It</span>
                  </div>
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex items-center gap-1.5 text-red-400">
                    <span className="text-sm">&#10005;</span>
                    <span className="text-sm font-bold">{hateCount}</span>
                    <span className="text-xs text-red-400/70">Hate It</span>
                  </div>
                </div>
              )}

              {/* Category Breakdown */}
              <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                {ratingCategories.map(cat => (
                  <div key={cat.label} className="flex items-center justify-between">
                    <span className="text-[10px] text-secondary uppercase tracking-wider">{cat.label}</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-[#F97316] text-[#F97316]" />
                      <span className="text-xs font-bold text-primary">{cat.avg.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="px-4 stg">
          {/* Plate number + Unclaimed notice */}
          {vehicle.plate_number && (
            <div className="mb-3">
              <span className="text-white text-sm font-mono font-bold">
                {vehicle.state ? `${vehicle.state} \u2014 ` : ''}{vehicle.plate_number}
              </span>
            </div>
          )}

          {isUnclaimed && (
            <div className="bg-amber-900/15 border border-amber-700/40 rounded-xl p-3 mb-4 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-accent-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-accent-primary">
                This plate hasn't been claimed yet — View community spots below or claim this plate if it's yours.
              </p>
            </div>
          )}

          {/* Owner Card — claimed vehicles only */}
          {vehicle.is_claimed && vehicle.owner && (
            <div className="card-v3 card-v3-lift p-4 mb-4" style={{ boxShadow: '0 0 12px rgba(249,115,22,0.08)' }}>
              <p className="text-[10px] text-tertiary uppercase tracking-[1.2px] font-bold mb-3">Vehicle Owner</p>
              <div className="flex items-center gap-3">
                <UserAvatar
                  avatarUrl={vehicle.owner.avatar_url}
                  handle={vehicle.owner.handle || 'unknown'}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm">@{vehicle.owner.handle || 'anonymous'}</p>
                </div>
                <button
                  onClick={() => vehicle.owner && onNavigate('user-profile', vehicle.owner.id)}
                  className="text-xs px-3 py-1.5 bg-[var(--border2)] hover:bg-[var(--border2)] rounded-lg text-[var(--t3)] font-medium transition-all"
                >
                  View Profile
                </button>
              </div>
            </div>
          )}

          {/* Factory Specs — VIN-verified vehicles only */}
          {vehicle.vin && vehicle.verification_tier === 'vin_verified' && (() => {
            const specs = [
              { label: 'Body', value: vehicle.vin_body_class },
              { label: 'Drivetrain', value: vehicle.vin_drive_type },
              { label: 'Fuel', value: vehicle.vin_fuel_type },
              { label: 'Engine', value: [vehicle.vin_engine_displacement, vehicle.vin_engine_cylinders ? `${vehicle.vin_engine_cylinders}-cyl` : ''].filter(Boolean).join(' ') || null },
              { label: 'HP', value: vehicle.vin_horsepower ? `${vehicle.vin_horsepower} hp` : null },
              { label: 'Trans', value: vehicle.vin_transmission },
              { label: 'Doors', value: vehicle.vin_doors },
              { label: 'Origin', value: vehicle.vin_plant_country },
            ].filter(s => s.value);

            if (specs.length === 0) return null;

            return (
              <div className="v3-stagger v3-stagger-3" style={{
                margin: '0 16px 16px', borderRadius: 14, overflow: 'hidden', position: 'relative',
                background: 'repeating-linear-gradient(90deg, rgba(255,255,255,.012) 0px, transparent 1px, transparent 2px, rgba(255,255,255,.008) 3px), linear-gradient(180deg, #141c28, #111a24)',
                border: '1px solid rgba(249,115,22,.1)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 2px 12px rgba(0,0,0,.35)',
              }}>
                {/* Orange glow accents */}
                <div style={{ position: 'absolute', inset: -1, borderRadius: 14, background: 'linear-gradient(135deg, rgba(249,115,22,.06), transparent 40%, transparent 60%, rgba(249,115,22,.04))', pointerEvents: 'none', zIndex: 0 }} />
                <div style={{ position: 'absolute', top: -1, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg, transparent, #F97316, transparent)', opacity: 0.3 }} />

                <div style={{ padding: '16px 16px 10px', position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'linear-gradient(135deg, #F97316, #f59e0b)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 12 15 16 10"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 400, color: '#f2f4f7' }}>Factory Specifications</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 500, color: '#F97316', letterSpacing: 1.5, textTransform: 'uppercase' as const }}>VIN Decoded</div>
                    </div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 7, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' as const,
                      padding: '3px 8px', borderRadius: 10,
                      background: 'rgba(249,115,22,.12)', color: '#F97316',
                      border: '1px solid rgba(249,115,22,.2)',
                    }}>Verified</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                    {specs.map(row => (
                      <div key={row.label}>
                        <div style={{ fontSize: 8, color: '#586878', textTransform: 'uppercase' as const, letterSpacing: 1.5, marginBottom: 3, fontFamily: "'JetBrains Mono', monospace" }}>{row.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#f2f4f7', fontFamily: "'JetBrains Mono', monospace" }}>{row.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Earn Hints */}
          {!isOwner && user && !guestMode && (
            <div className="flex gap-2 px-4 mb-3">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer active:opacity-80" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.06), var(--s1))', border: '1px solid rgba(249,115,22,0.12)' }}>
                <Heart className="w-3 h-3 flex-shrink-0" strokeWidth={1.2} style={{ color: '#F97316' }} />
                <span className="text-[9px]" style={{ color: 'var(--t3)' }}>Give Bumper Sticker</span>
              </div>
            </div>
          )}

          {/* Primary CTA moved to actions strip above */}

          {/* Claim Section — unclaimed vehicles */}
          {isUnclaimed && (
            <div className="mb-4 border border-white/[0.06] rounded-xl p-4">
              <p className="text-center text-sm text-secondary mb-3">Is this your car?</p>
              {canClaim ? (
                <button
                  onClick={() => setShowClaimModal(true)}
                  className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-heading font-bold uppercase tracking-tight text-sm transition-all active:scale-95 shadow-lg"
                >
                  CLAIM THIS PLATE
                </button>
              ) : (
                <button
                  onClick={() => { setGuestJoinAction('claim a plate'); setShowGuestJoinModal(true); }}
                  className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-heading font-bold uppercase tracking-tight text-sm transition-all active:scale-95 shadow-lg"
                >
                  CLAIM THIS PLATE
                </button>
              )}
              <p className="text-xs text-secondary text-center mt-2">Claiming lets you manage your vehicle profile and respond to reviews</p>
            </div>
          )}

          {isOwner && vehicle && vehicle.verification_tier === 'standard' && (
            <div className="mb-4">
              <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4 mb-3">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-accent-primary mb-1">Become a Verified Owner</p>
                    <p className="text-sm text-accent-primary">
                      Upload your registration document to verify ownership and unlock enhanced credibility
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowVerifyModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-900/20 hover:bg-green-900/30 border border-green-800 rounded-xl font-bold uppercase tracking-wider text-green-400 transition-all active:scale-95"
              >
                <Shield className="w-5 h-5" />
                Verify Ownership
              </button>
            </div>
          )}

          {isOwner && (
            <>
              <div className="card-v3 mt-6 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-accent-primary" />
                    <h3 className="text-lg font-bold uppercase tracking-wider text-primary">Owner's Manual</h3>
                  </div>
                  {!vehicle?.owners_manual_url && (
                    <button
                      onClick={() => manualInputRef.current?.click()}
                      disabled={uploadingManual}
                      className="flex items-center gap-2 px-3 py-1.5 bg-accent-primary hover:bg-accent-hover rounded-lg text-sm font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Upload size={16} />
                      {uploadingManual ? 'Uploading...' : 'Upload PDF'}
                    </button>
                  )}
                  <input
                    ref={manualInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleManualUpload}
                    className="hidden"
                  />
                </div>
                {vehicle?.owners_manual_url ? (
                  <div className="flex items-center justify-between mt-3 p-3 bg-surfacehighlight rounded-lg">
                    <a
                      href={vehicle.owners_manual_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-accent-primary hover:text-accent-hover font-medium"
                    >
                      <Download className="w-4 h-4" />
                      View Owner's Manual
                    </a>
                    <button
                      onClick={handleRemoveManual}
                      className="text-status-danger hover:text-red-600 p-1"
                      title="Remove manual"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--t3)] mt-2">
                    Upload your owner's manual for easy reference (PDF only, max 10MB)
                  </p>
                )}
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold uppercase tracking-wider">Photo Gallery</h3>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-accent-primary hover:bg-accent-hover rounded-lg text-sm font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Upload size={16} />
                    {uploading ? 'Uploading...' : 'Add Photo'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {vehicleImages.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {vehicleImages.map((img) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.image_url}
                          alt="Vehicle"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        {img.is_primary && (
                          <div className="absolute top-2 left-2 bg-accent-primary text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                            <Star size={12} />
                            Primary
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          {!img.is_primary && (
                            <button
                              onClick={() => handleSetPrimary(img.id)}
                              className="bg-accent-primary hover:bg-accent-hover text-white p-2 rounded-lg transition"
                              title="Set as primary"
                            >
                              <Star size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteImage(img.id, img.image_url)}
                            className="bg-status-danger hover:bg-red-600 text-white p-2 rounded-lg transition"
                            title="Delete"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-surface-2 rounded-lg text-[var(--t3)]">
                    No photos yet. Add some photos to showcase your vehicle!
                  </div>
                )}
              </div>
            </>
          )}


            {isOwner && (
              <>
                <div className="mt-6 flex items-center justify-between bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.25)] rounded-xl p-4 cursor-pointer transition-all active:scale-[0.98]">
                  <div className="flex items-center gap-3 flex-1">
                    <BookOpen className="w-5 h-5 text-orange" strokeWidth={1.5} />
                    <div>
                      <div className="text-[#fbbf24] font-bold text-sm">Owner's Manual</div>
                      <div className="text-xs text-gray-400">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-white" strokeWidth={1.5} />
                      <h3 className="text-lg font-bold uppercase tracking-wider text-white">Modifications</h3>
                    </div>
                    <button className="text-accent-2 text-[11px] font-medium uppercase tracking-wider">
                      Add mod
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['Performance', 'Aesthetic', 'Suspension', 'Audio'].map((category) => (
                      <button
                        key={category}
                        onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                        className="bg-surface border border-white/[0.06] rounded-[10px] p-2.5 flex items-center justify-between transition-all active:scale-95"
                      >
                        <span className="text-sm text-white font-medium">{category}</span>
                        <ChevronDown className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
        </div>

        {isOwner && (
          <div className="mx-4 rounded-[14px] p-5 mb-4 bg-surface border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
              <h2 className="text-[9px] font-bold text-tertiary uppercase tracking-[1.5px]">The Garage</h2>
            </div>

            <div className="mb-6 p-4 bg-gradient-to-r from-[#F97316]/20 to-[#fb923c]/20 rounded-lg border border-white/[0.06]">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="font-bold text-lg text-accent-primary">
                    {(() => {
                      const totalMods = modifications.length;
                      const thresholds = BADGE_TIER_THRESHOLDS.Modification;
                      if (totalMods >= thresholds.Platinum) return 'Platinum Build Status';
                      if (totalMods >= thresholds.Gold) return 'Gold Build Status';
                      if (totalMods >= thresholds.Silver) return 'Silver Build Status';
                      if (totalMods >= thresholds.Bronze) return 'Bronze Build Status';
                      return 'No Mods Yet';
                    })()}
                  </span>
                  <p className="text-sm text-secondary">
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
                <div className="text-3xl font-bold text-accent-primary">
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
                    <div className="w-full bg-surfacehighlight rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#F97316] to-[#fb923c] transition-all duration-500 flex items-center justify-end px-2"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      >
                        <span className="text-xs text-white font-bold">
                          {Math.round(progress)}%
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="space-y-3">
              <GarageSection
                title="Powertrain"
                icon={<Wrench size={24} />}
                modCount={modsByCategory['Powertrain']?.length || 0}
                defaultOpen
              >
                <ModList
                  mods={modsByCategory['Powertrain'] || []}
                  category="Powertrain"
                  vehicleId={vehicleId}
                  onUpdate={loadVehicleData}
                />
              </GarageSection>

              <GarageSection
                title="Suspension & Brakes"
                icon={<Disc3 size={24} />}
                modCount={modsByCategory['Suspension & Brakes']?.length || 0}
              >
                <ModList
                  mods={modsByCategory['Suspension & Brakes'] || []}
                  category="Suspension & Brakes"
                  vehicleId={vehicleId}
                  onUpdate={loadVehicleData}
                />
              </GarageSection>

              <GarageSection
                title="Wheels & Tires"
                icon={<Disc3 size={24} />}
                modCount={modsByCategory['Wheels & Tires']?.length || 0}
              >
                <ModList
                  mods={modsByCategory['Wheels & Tires'] || []}
                  category="Wheels & Tires"
                  vehicleId={vehicleId}
                  onUpdate={loadVehicleData}
                />
              </GarageSection>

              <GarageSection
                title="Exterior"
                icon={<Palette size={24} />}
                modCount={modsByCategory['Exterior']?.length || 0}
              >
                <ModList
                  mods={modsByCategory['Exterior'] || []}
                  category="Exterior"
                  vehicleId={vehicleId}
                  onUpdate={loadVehicleData}
                />
              </GarageSection>

              <GarageSection
                title="Interior"
                icon={<Armchair size={24} />}
                modCount={modsByCategory['Interior']?.length || 0}
              >
                <ModList
                  mods={modsByCategory['Interior'] || []}
                  category="Interior"
                  vehicleId={vehicleId}
                  onUpdate={loadVehicleData}
                />
              </GarageSection>

              <GarageSection
                title="Fluids & Consumables"
                icon={<Droplet size={24} />}
                modCount={modsByCategory['Fluids & Consumables']?.length || 0}
              >
                <ModList
                  mods={modsByCategory['Fluids & Consumables'] || []}
                  category="Fluids & Consumables"
                  vehicleId={vehicleId}
                  onUpdate={loadVehicleData}
                />
              </GarageSection>
            </div>
          </div>
        )}

        {/* Stickers Section */}
        <div className="mb-6 px-4 v3-stagger v3-stagger-4">
          <div className="slbl">Bumper Stickers</div>
          <div className="sticker-strip">
            <StickerSlab vehicleId={vehicleId} />
          </div>
        </div>

        {/* Build Timeline Section — claimed vehicles + owner only */}
        {vehicle.is_claimed && isOwner && (
          <div className="mb-6 px-4">
            <div className="slbl">Build Timeline</div>
            <div className="build-timeline">
              {modifications.length > 0 ? modifications.map((mod, i) => (
                <div key={mod.id} className="bt-item">
                  <div className={i === 0 ? 'bt-dot' : 'bt-dot-steel'} />
                  <div>
                    <div className="text-xs text-primary">{mod.part_name}</div>
                    <div className="text-[10px] font-mono" style={{ color: 'var(--t4)' }}>
                      {mod.category || 'Modification'}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="bt-item">
                  <div className="bt-dot" />
                  <div>
                    <div className="text-xs text-primary">Vehicle Added</div>
                    <div className="text-[10px] font-mono" style={{ color: 'var(--t4)' }}>
                      {vehicle?.claimed_at ? new Date(vehicle.claimed_at).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!isOwner && user && (
          <>
            {/* Action Hints */}
            <div className="flex gap-2 px-4 mb-3">
              <div
                className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer active:opacity-80"
                style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.06), var(--s1))', border: '1px solid rgba(249,115,22,0.12)' }}
                onClick={() => onNavigate('scan')}
              >
                <Star className="w-3 h-3 flex-shrink-0" strokeWidth={1.2} style={{ color: 'var(--orange)' }} />
                <span className="text-[9px] text-secondary">Spot a vehicle</span>
              </div>
              <div
                className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer active:opacity-80"
                style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.06), var(--s1))', border: '1px solid rgba(249,115,22,0.12)' }}
              >
                <Heart className="w-3 h-3 flex-shrink-0" strokeWidth={1.2} style={{ color: 'var(--orange)' }} />
                <span className="text-[9px] text-secondary">Give Bumper Sticker</span>
              </div>
            </div>
            <div className="mb-6">
              <VehicleStickerSelector vehicleId={vehicleId} onStickerGiven={loadVehicleData} />
            </div>
          </>
        )}

        <div id="reviews" className="card-v3 card-v3-lift p-6 mx-4 mb-6 v3-stagger v3-stagger-5">
          <h3 className="text-xl font-bold mb-4 uppercase tracking-wider text-primary">Community Spots</h3>
          {reviews.length > 0 && (
            <p className="text-[8px] text-center mb-2" style={{ color: '#909aaa' }}>
              Spotted by <strong style={{ color: '#F97316' }}>{reviews.length}</strong> {reviews.length === 1 ? 'spotter' : 'spotters'}
            </p>
          )}
          {reviews.length === 0 ? (
            <p className="text-[var(--t3)] text-center py-8">
              No spots yet. Spot this plate to leave the first review!
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const isPreClaim = canModerateReview(review);
                // God Mode Rules:
                // - Pre-claim reviews: Owner can DELETE (not hide)
                // - Post-claim reviews: Owner can HIDE (not delete)
                // - Authors can always delete their own reviews
                const canDelete = review.author_id === user?.id || (isOwner && isPreClaim);
                const canHide = isOwner && !isPreClaim;

                return (
                  <div
                    key={review.id}
                    className="border border-white/[0.06] rounded-xl p-4 bg-surface"
                  >
                    {review.author_id === user?.id && review.moderation_status !== 'approved' && (
                      <div className="mb-3">
                        <ModerationStatus
                          status={review.moderation_status}
                          rejectionReason={review.rejection_reason}
                          isOwnContent={true}
                        />
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="text-sm text-[var(--t3)] mb-2">
                          by {review.author.handle || 'Anonymous'} · {new Date(review.created_at).toLocaleDateString()}
                        </div>
                        {review.comment && (
                          <p className="text-primary">{review.comment}</p>
                        )}
                      </div>
                      {(canDelete || canHide) && (
                        <div className="flex gap-2 ml-4">
                          {canHide && (
                            <button
                              onClick={() => handleToggleHidden(review)}
                              className="text-xs px-2 py-1 bg-surface-2 hover:bg-[var(--border2)] rounded text-[var(--t3)]"
                            >
                              {review.is_hidden_by_owner ? 'Unhide' : 'Hide'}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteReview(review.id)}
                              className="text-xs px-2 py-1 bg-red-900/30 hover:bg-red-900/50 rounded text-status-danger flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Rating Categories */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
                      {review.rating_vehicle != null && (
                        <div className="text-xs">
                          <span style={{ color: 'var(--t4)' }}>Vehicle</span>{' '}
                          <span className="font-semibold" style={{ color: 'var(--orange)' }}>{review.rating_vehicle}/5</span>
                        </div>
                      )}
                      {review.rating_driving != null && (
                        <div className="text-xs">
                          <span style={{ color: 'var(--t4)' }}>Driving</span>{' '}
                          <span className="font-semibold" style={{ color: 'var(--orange)' }}>{review.rating_driving}/5</span>
                        </div>
                      )}
                      {review.looks_rating != null && (
                        <div className="text-xs">
                          <span style={{ color: 'var(--t4)' }}>Looks</span>{' '}
                          <span className="font-semibold" style={{ color: 'var(--orange)' }}>{review.looks_rating}/5</span>
                        </div>
                      )}
                      {review.sound_rating != null && (
                        <div className="text-xs">
                          <span style={{ color: 'var(--t4)' }}>Sound</span>{' '}
                          <span className="font-semibold" style={{ color: 'var(--orange)' }}>{review.sound_rating}/5</span>
                        </div>
                      )}
                      {review.condition_rating != null && (
                        <div className="text-xs">
                          <span style={{ color: 'var(--t4)' }}>Condition</span>{' '}
                          <span className="font-semibold" style={{ color: 'var(--orange)' }}>{review.condition_rating}/5</span>
                        </div>
                      )}
                    </div>
                    {review.sentiment && (
                      <div className="mt-1.5">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          review.sentiment === 'love' ? 'bg-rose-500/15 text-rose-300' :
                          review.sentiment === 'hate' ? 'bg-red-500/15 text-red-300' :
                          'bg-white/5 text-[var(--t4)]'
                        }`}>
                          {review.sentiment === 'love' ? '❤️ Love It' : review.sentiment === 'hate' ? '👎 Hate It' : review.sentiment}
                        </span>
                        {review.spot_type && (
                          <span className="text-[10px] font-mono ml-2 px-2 py-0.5 rounded-full" style={{ background: 'var(--s2)', color: 'var(--t4)' }}>
                            {review.spot_type === 'full' ? 'Full Spot' : 'Quick Spot'}
                          </span>
                        )}
                      </div>
                    )}
                    {review.location_label && (
                      <div className="text-[10px] mt-1" style={{ color: 'var(--t4)' }}>{review.location_label}</div>
                    )}
                    {canModerateReview(review) && (
                      <div className="mt-2 text-xs text-accent-primary flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Pre-claim review (God Mode enabled)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isOwner && (
          <div className="px-4 mt-6 mb-6">
            <button className="w-full py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-all active:scale-[0.98] bg-transparent border border-[rgba(239,68,68,0.3)] text-[#fca5a5]">
              Retire This Ride
            </button>
          </div>
        )}
      </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-md w-full">
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-accent-primary transition-colors"
            >
              <X className="w-6 h-6" />
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
            <div className="mt-4 text-center">
              <p className="text-sm text-secondary mb-4">
                Take a screenshot to share on social media
              </p>
              <button
                onClick={() => setShowShareModal(false)}
                className="px-6 py-3 bg-surfacehighlight hover:bg-accent-primary rounded-lg font-bold uppercase tracking-wider text-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver rating removed in V3
      {showRateDriver && vehicle && vehicle.owner && (
        <RateDriverModal
          driverId={vehicle.owner_id!}
          driverHandle={vehicle.owner.handle || 'unknown'}
          vehicleId={vehicle.id}
          onClose={() => setShowRateDriver(false)}
          onSuccess={() => {
            setShowRateDriver(false);
            loadVehicleData();
          }}
        />
      )}
      */}

      {guestMode && <GuestBottomNav onNavigate={onNavigate} />}
    </Layout>
  );
}
