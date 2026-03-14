import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Car,
  Star,
  Eye,
  Wrench,
  Sparkles,
  Lock,
  Calendar,
  Crosshair,
  Zap,
  ChevronRight,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { Heart, Users as UsersIcon, Award, MessageSquare, UserPlus, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Layout } from '../components/Layout';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { AddRetiredVehicleModal } from '../components/AddRetiredVehicleModal';
import { RetireVehicleModal } from '../components/RetireVehicleModal';
import { VinClaimModal } from '../components/VinClaimModal';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { uploadImage } from '../lib/storage';
import { getVehicleImageUrl } from '../lib/carImageryApi';
import { getVehicleClaimStatus, getVehicleImage, formatRP, formatCount } from '../lib/vehicleUtils';
import { getTierFromScore } from '../lib/tierConfig';
import { Search } from 'lucide-react';
import type { GarageVehicle } from '../types/garage';

interface MyGaragePageProps {
  onNavigate?: (page: string, data?: any) => void;
}

function VehicleCard({
  vehicle,
  stickers,
  stockImages,
  onNavigate,
  onPhotosUpdated,
}: {
  vehicle: GarageVehicle & { [key: string]: any };
  stickers: { name: string; count: number }[];
  stockImages: Record<string, string>;
  onNavigate: (page: string, data?: any) => void;
  onPhotosUpdated: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  const userPhoto = vehicle.photos?.[0]?.url || vehicle.photo_url;
  const stockPhoto = vehicle.stock_image_url || stockImages[vehicle.id];
  const photoUrl = imgError ? null : (userPhoto || stockPhoto);

  const isPending = vehicle._claimStatus === 'pending' || vehicle.verification_status === 'pending';
  const isClaimed = !isPending && (vehicle.owner_id || vehicle.is_claimed);

  const statusLabel = isPending ? 'Pending' : isClaimed ? 'Claimed' : 'Unclaimed';
  const statusClass = isPending
    ? 'bg-orange/10 text-orange border border-orange/20'
    : isClaimed
    ? 'bg-positive/10 text-positive border border-positive/20'
    : 'bg-surface-3/50 text-quaternary border border-subtle';

  const spotCount = vehicle.spot_count ?? vehicle.spots_count ?? 0;
  const avgRating = vehicle.avg_rating ?? vehicle.average_rating;
  const modCount = vehicle.modifications?.length ?? 0;
  const plateNumber = vehicle.plate_number || vehicle.license_plate || '';

  const top4Stickers = stickers.slice(0, 4);
  const remainingCount = stickers.length > 4 ? stickers.length - 4 : 0;

  const vehiclePhotos = (vehicle.photos as Array<{ url: string; uploaded_at: string }>) || [];
  const photoUrls = vehiclePhotos.map(p => p.url);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (vehiclePhotos.length >= 10) {
      showToast('Maximum 10 photos per vehicle', 'error');
      return;
    }

    setUploading(true);
    try {
      const photoUrl = await uploadImage(file, 'vehicle-photos');
      const updatedPhotos = [
        ...vehiclePhotos,
        { url: photoUrl, uploaded_at: new Date().toISOString() }
      ];

      const { error } = await supabase
        .from('vehicles')
        .update({ photos: updatedPhotos })
        .eq('id', vehicle.id);

      if (error) throw error;

      showToast('Photo uploaded successfully', 'success');
      onPhotosUpdated();
    } catch (error) {
      console.error('Failed to upload photo:', error);
      showToast('Failed to upload photo', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="card-v3 card-v3-lift mx-4 mb-4 overflow-hidden cursor-pointer"
      onClick={() => onNavigate('vehicle-detail', { vehicleId: vehicle.id })}
    >
      {/* Photo Area */}
      <div className="h-[200px] relative overflow-hidden photo-scan">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surface-2 to-surface-3 flex items-center justify-center">
            <Car className="w-12 h-12 text-quaternary opacity-30" strokeWidth={1.2} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg/80" />
        {plateNumber && (
          <div className="absolute bottom-3 left-4 z-[2] font-mono text-[13px] font-bold tracking-[3px] text-white/70">
            {plateNumber}
          </div>
        )}
        <div className={`absolute top-3 right-3 z-[2] text-[7px] font-medium uppercase tracking-[2px] px-2.5 py-1 rounded-full ${statusClass}`}>
          {statusLabel}
        </div>
      </div>

      {/* Photo Thumbnails Strip */}
      {(vehiclePhotos.length > 0 || isClaimed) && (
        <div className="flex gap-2 px-4 pt-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }} onClick={(e) => e.stopPropagation()}>
          {vehiclePhotos.map((photo, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(index);
                setLightboxOpen(true);
              }}
              className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-border hover:border-accent-primary transition-colors"
            >
              <img src={photo.url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
          {isClaimed && vehiclePhotos.length < 10 && (
            <label className="w-12 h-12 rounded-lg border-2 border-dashed border-border hover:border-accent-primary cursor-pointer flex items-center justify-center transition-colors flex-shrink-0">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-5 h-5 text-quaternary" strokeWidth={1.5} />
              )}
            </label>
          )}
        </div>
      )}

      {lightboxOpen && photoUrls.length > 0 && (
        <PhotoLightbox
          photos={photoUrls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Info Area */}
      <div className="p-4">
        {plateNumber && (
          <div className="font-mono text-[16px] font-bold tracking-[5px] text-primary">
            {plateNumber}
          </div>
        )}
        <div className="text-[12px] text-secondary font-light mt-1">
          {[vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ')}
        </div>

        <div className="flex gap-4 mt-2.5">
          <span className="text-[10px] text-quaternary">
            <span className="font-mono text-primary font-semibold">{spotCount}</span> spots
          </span>
          <span className="text-[10px] text-quaternary">
            <span className="font-mono text-primary font-semibold">
              {avgRating ? Number(avgRating).toFixed(1) : '—'}
            </span> rating
          </span>
          <span className="text-[10px] text-quaternary">
            <span className="font-mono text-primary font-semibold">{modCount}</span> mods
          </span>
        </div>
      </div>

      {/* Sticker Strip */}
      {top4Stickers.length > 0 && (
        <div className="flex gap-2 px-4 pb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {top4Stickers.map((sticker, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1 flex-shrink-0 px-3 py-2 bg-surface-2 border border-subtle rounded-xl min-w-[60px]"
            >
              <span className="text-[8px] text-secondary font-light text-center leading-tight">{sticker.name}</span>
              <span className="font-mono text-[11px] font-semibold text-primary">{sticker.count}</span>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0 px-3 py-2 bg-surface-2 border border-subtle rounded-xl min-w-[44px]">
              <span className="font-mono text-[11px] font-semibold text-quaternary">+{remainingCount}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MyGaragePage({ onNavigate }: MyGaragePageProps = {}) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<(GarageVehicle & { [key: string]: any })[]>([]);
  const [vehicleStickerCounts, setVehicleStickerCounts] = useState<Record<string, { name: string; count: number }[]>>({});
  const [retiredVehicles, setRetiredVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRetiredVehicle, setShowAddRetiredVehicle] = useState(false);
  const [vehicleToRetire, setVehicleToRetire] = useState<any | null>(null);
  const [showAllRetiredModal, setShowAllRetiredModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [vehicleToVerify, setVehicleToVerify] = useState<(GarageVehicle & { [key: string]: any }) | null>(null);
  const [stockImages, setStockImages] = useState<Record<string, string>>({});
  const [showClaimSearch, setShowClaimSearch] = useState(false);
  const [claimSearchQuery, setClaimSearchQuery] = useState('');
  const [claimSearchLoading, setClaimSearchLoading] = useState(false);
  const [claimSearchResult, setClaimSearchResult] = useState<any | null>(null);
  const [claimSearchError, setClaimSearchError] = useState('');
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadGarageData();
      // Fetch avatar_url from profiles
      supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.avatar_url) setUserAvatarUrl(data.avatar_url);
        });
    }
  }, [user]);

  useEffect(() => {
    if (!vehicles.length) return;
    vehicles.forEach(async (vehicle) => {
      const hasUserPhoto = vehicle.photos?.[0]?.url || vehicle.photo_url;
      if (hasUserPhoto) return;
      if (vehicle.stock_image_url) {
        setStockImages(prev => ({ ...prev, [vehicle.id]: vehicle.stock_image_url }));
        return;
      }
      try {
        const url = await getVehicleImageUrl(vehicle.make, vehicle.model, vehicle.year);
        if (url) {
          setStockImages(prev => ({ ...prev, [vehicle.id]: url }));
          await supabase.from('vehicles').update({ stock_image_url: url }).eq('id', vehicle.id);
        }
      } catch {
        // silent
      }
    });
  }, [vehicles]);

  useEffect(() => {
    if (!vehicles.length) return;
    const vehicleIds = vehicles.map(v => v.id);
    supabase
      .from('vehicle_sticker_counts')
      .select('vehicle_id, tag_name, icon_name, count')
      .in('vehicle_id', vehicleIds)
      .order('count', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const grouped: Record<string, { name: string; count: number }[]> = {};
        data.forEach((row: any) => {
          if (!grouped[row.vehicle_id]) grouped[row.vehicle_id] = [];
          grouped[row.vehicle_id].push({ name: row.tag_name, count: row.count });
        });
        setVehicleStickerCounts(grouped);
      });
  }, [vehicles]);

  const fleetStats = useMemo(() => {
    const totalSpots = vehicles.reduce((sum, v) => sum + (v.spot_count ?? v.spots_count ?? 0), 0);
    const ratings = vehicles
      .map(v => v.avg_rating ?? v.average_rating)
      .filter(r => r && Number(r) > 0)
      .map(r => Number(r));
    const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + r, 0) / ratings.length) : 0;
    const totalStickers = Object.values(vehicleStickerCounts).reduce(
      (sum, stickers) => sum + stickers.reduce((s, st) => s + st.count, 0),
      0
    );
    return {
      vehicleCount: vehicles.length,
      avgRating: avgRating.toFixed(1),
      totalSpots,
      totalStickers,
    };
  }, [vehicles, vehicleStickerCounts]);

  const loadGarageData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadVehicles(), loadRetiredVehicles()]);
      // Load follower + badge counts
      const [{ count: fc }, { count: bc }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user!.id),
        supabase.from('user_badges').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
      ]);
      setFollowerCount(fc || 0);
      setBadgeCount(bc || 0);
    } catch {
      showToast('Failed to load garage', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadVehicles = async () => {
    const { data: ownedVehicles } = await supabase
      .from('vehicles')
      .select(`*, stock_image_url, photos:vehicle_images(*), modifications(*)`)
      .eq('owner_id', user!.id)
      .order('created_at', { ascending: false });

    const { data: allClaims } = await supabase
      .from('verification_claims')
      .select(`vehicle_id, status, created_at, vehicle:vehicles!inner(*, stock_image_url, photos:vehicle_images(*), modifications(*))`)
      .eq('user_id', user!.id)
      .in('status', ['pending', 'approved']);

    const allVehicles: any[] = [];
    if (ownedVehicles) allVehicles.push(...ownedVehicles);
    if (allClaims) {
      const ownedIds = new Set(ownedVehicles?.map(v => v.id) || []);
      for (const claim of allClaims) {
        if (claim.vehicle && !ownedIds.has(claim.vehicle.id)) {
          allVehicles.push({
            ...claim.vehicle,
            _claimStatus: claim.status,
            verification_status: claim.status === 'pending' ? 'pending' : claim.vehicle.verification_status,
          });
        }
      }
    }
    setVehicles(allVehicles);
    return allVehicles;
  };

  const loadRetiredVehicles = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('retired_vehicles')
      .select('*')
      .eq('user_id', user.id)
      .order('retired_at', { ascending: false });
    if (data) setRetiredVehicles(data);
  };

  const handleClaimSearch = async () => {
    const query = claimSearchQuery.trim().toUpperCase().replace(/\s+/g, '');
    if (!query) return;

    setClaimSearchLoading(true);
    setClaimSearchResult(null);
    setClaimSearchError('');

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, make, model, year, color, plate_number, plate_state, is_claimed, owner_id')
        .ilike('plate_number', query)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setClaimSearchError('Plate not found. Try spotting it first on the Spot tab.');
      } else if (data.is_claimed && data.owner_id) {
        setClaimSearchError('This plate is already claimed by another user.');
      } else {
        setClaimSearchResult(data);
      }
    } catch {
      setClaimSearchError('Search failed. Please try again.');
    } finally {
      setClaimSearchLoading(false);
    }
  };

  const [retiredStockImages, setRetiredStockImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!retiredVehicles.length) return;
    retiredVehicles.forEach(async (rv) => {
      if (rv.photo_url_1 || rv.photo_url_2) return;
      if (retiredStockImages[rv.id]) return;
      try {
        const url = await getVehicleImageUrl(rv.make, rv.model, rv.year);
        if (url) setRetiredStockImages(prev => ({ ...prev, [rv.id]: url }));
      } catch {
        // silent
      }
    });
  }, [retiredVehicles]);

  const handleNavigate = (page: string, data?: any) => {
    if (onNavigate) {
      onNavigate(page, data);
    } else {
      window.location.hash = page;
    }
  };

  if (loading || !user) {
    return <LoadingScreen />;
  }

  const RetiredTimeline = ({ vehicles: rv, limit }: { vehicles: any[]; limit?: number }) => {
    const list = limit ? rv.slice(0, limit) : rv;
    return (
      <div className="relative pl-6">
        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-orange/50 via-subtle to-subtle" />
        <div className="space-y-4">
          {list.map((vehicle) => {
            const stockUrl = retiredStockImages[vehicle.id];
            return (
              <div key={vehicle.id} className="relative">
                <div className="absolute -left-[18px] top-3 w-4 h-4 rounded-full bg-bg border-2 border-orange z-10 dot-pulse" />
                <div className="card-v3 overflow-hidden">
                  {(vehicle.photo_url_1 || vehicle.photo_url_2) ? (
                    <div className="grid grid-cols-2 gap-0.5 bg-surface-2">
                      {vehicle.photo_url_1 && (
                        <img src={vehicle.photo_url_1} alt="" className="w-full h-28 object-cover" />
                      )}
                      {vehicle.photo_url_2 ? (
                        <img src={vehicle.photo_url_2} alt="" className="w-full h-28 object-cover" />
                      ) : (
                        <div className="w-full h-28 bg-surface-2 flex items-center justify-center">
                          <div style={{ width:'100%', height:'100%', background:'var(--carbon-2,#0e1320)' }} />
                        </div>
                      )}
                    </div>
                  ) : stockUrl ? (
                    <div className="h-28 overflow-hidden">
                      <img src={stockUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-24 bg-gradient-to-br from-surface-2 to-surface-3 flex items-center justify-center">
                      <div style={{ width:'100%', height:'100%', background:'var(--carbon-2,#0e1320)' }} />
                    </div>
                  )}
                  <div className="p-3">
                    <div style={{ fontSize: '14px' }} className="font-semibold text-primary">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                      {vehicle.trim && <span className="text-xs text-tertiary font-normal ml-1">{vehicle.trim}</span>}
                    </div>
                    {vehicle.ownership_period && (
                      <div className="flex items-center gap-1.5 mt-1.5" style={{ fontSize: '12px', color: 'var(--orange)' }}>
                        <Calendar className="w-3 h-3" />
                        {vehicle.ownership_period}
                      </div>
                    )}
                    {vehicle.notes && (
                      <p style={{ fontSize: '13px' }} className="text-secondary mt-2 leading-relaxed line-clamp-2">{vehicle.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Layout currentPage="my-garage" onNavigate={handleNavigate}>
      <div className="pb-24 animate-page-enter">

        {/* V11 HERO SECTION */}
        <div style={{ position: 'relative', height: 175, overflow: 'hidden' }}>
          {/* Background image */}
          {vehicles[0]?.stock_image_url ? (
            <img
              src={vehicles[0].stock_image_url}
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'brightness(0.42) saturate(0.5)',
              }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: 'var(--carbon-0, #070a0f)' }} />
          )}
          {/* Carbon weave texture */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.008) 0, rgba(255,255,255,0.008) 1px, transparent 1px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.008) 0, rgba(255,255,255,0.008) 1px, transparent 1px, transparent 8px)',
            }}
          />
          {/* Gradient */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              background: 'linear-gradient(to bottom, rgba(3,5,8,0.3), rgba(3,5,8,0.86))',
            }}
          />
          {/* Hero content */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 5,
              padding: '0 18px 12px',
              display: 'flex',
              alignItems: 'flex-end',
              gap: 13,
            }}
          >
            {/* Owner avatar */}
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid var(--accent, #F97316)',
                boxShadow: '0 0 18px rgba(249,115,22,0.28)',
                flexShrink: 0,
                background: 'var(--surface-2, #1a1d24)',
              }}
            >
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UsersIcon style={{ width: 22, height: 22, color: 'var(--muted, #6b7280)' }} strokeWidth={1.5} />
                </div>
              )}
            </div>
            {/* Info block */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {profile?.handle || 'MotoRate User'}
              </div>
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--dim, #9ca3af)',
                }}
              >
                @{profile?.handle || 'user'}
              </div>
              <div
                style={{
                  display: 'inline-block',
                  marginTop: 4,
                  background: 'rgba(249,115,22,0.12)',
                  border: '1px solid rgba(249,115,22,0.2)',
                  borderRadius: 3,
                  padding: '2px 10px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--accent, #F97316)',
                  whiteSpace: 'nowrap',
                }}
              >
                {getTierFromScore(profile?.reputation_score ?? 0)} TIER
              </div>
            </div>
            {/* RP */}
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--accent, #F97316)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                {formatRP(profile?.reputation_score ?? 0)}
              </div>
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--muted, #6b7280)',
                }}
              >
                REPUTATION
              </div>
            </div>
          </div>
        </div>

        {/* V11 STAT BAR */}
        <div
          style={{
            display: 'flex',
            background: 'var(--carbon-1, #0a0d14)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          {[
            { label: 'VEHICLES', value: vehicles.length },
            { label: 'SPOTS', value: fleetStats.totalSpots },
            { label: 'FOLLOWERS', value: followerCount },
            { label: 'BADGES', value: badgeCount },
          ].map((stat, i, arr) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                padding: '12px 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#fff',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {stat.value != null ? stat.value : '—'}
              </div>
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 7,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'var(--muted, #6b7280)',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* V11 FLEET CAROUSEL */}
        {vehicles.length > 0 ? (
          <>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'var(--muted, #6b7280)',
                padding: '10px 18px 8px',
              }}
            >
              MY FLEET
            </div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                padding: '0 18px 18px',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none',
              }}
              className="hide-scrollbar"
            >
              {vehicles.map(vehicle => {
                const userPhoto = vehicle.photos?.[0]?.url || vehicle.photo_url;
                const stockPhoto = vehicle.stock_image_url || stockImages[vehicle.id];
                const tileImg = userPhoto || stockPhoto;
                const claimResult = getVehicleClaimStatus(vehicle);
                const isPending = vehicle._claimStatus === 'pending' || vehicle.verification_status === 'pending';

                let badgeBg = 'rgba(255,255,255,0.06)';
                let badgeBorder = 'rgba(255,255,255,0.1)';
                let badgeColor = 'var(--dim, #9ca3af)';
                let badgeLabel = claimResult.label;

                if (isPending) {
                  badgeBg = 'rgba(249,115,22,0.15)';
                  badgeBorder = 'rgba(249,115,22,0.4)';
                  badgeColor = 'var(--accent, #F97316)';
                  badgeLabel = 'PENDING';
                } else if (claimResult.status === 'verified') {
                  badgeBg = 'rgba(249,115,22,0.15)';
                  badgeBorder = 'rgba(249,115,22,0.4)';
                  badgeColor = 'var(--accent, #F97316)';
                } else if (claimResult.status === 'claimed') {
                  badgeBg = 'rgba(32,192,96,0.1)';
                  badgeBorder = 'rgba(32,192,96,0.3)';
                  badgeColor = '#20c060';
                }

                return (
                  <div
                    key={vehicle.id}
                    style={{
                      width: 195,
                      borderRadius: 8,
                      overflow: 'hidden',
                      flexShrink: 0,
                      scrollSnapAlign: 'start',
                      cursor: 'pointer',
                      background: 'var(--carbon-1, #0a0d14)',
                    }}
                    onClick={() => handleNavigate('vehicle-detail', { vehicleId: vehicle.id })}
                  >
                    {/* Photo area */}
                    <div style={{ width: 195, height: 134, position: 'relative', overflow: 'hidden' }}>
                      {tileImg ? (
                        <img
                          src={tileImg}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'var(--carbon-2,#0e1320)' }}>
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to top, rgba(3,5,8,0.96) 0%, rgba(3,5,8,0.2) 55%, transparent 100%)',
                          pointerEvents: 'none',
                        }}
                      />
                      {/* Status badge */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 7,
                          left: 7,
                          background: badgeBg,
                          border: `1px solid ${badgeBorder}`,
                          borderRadius: 3,
                          padding: '2px 6px',
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: 7,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: badgeColor,
                        }}
                      >
                        {badgeLabel}
                      </div>
                      {/* Overlay text */}
                      <div style={{ position: 'absolute', bottom: 0, padding: '0 10px 10px' }}>
                        <div
                          style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontSize: 8,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.18em',
                            color: 'var(--accent, #F97316)',
                          }}
                        >
                          {vehicle.year}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Rajdhani', sans-serif",
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#fff',
                            lineHeight: 1,
                          }}
                        >
                          {vehicle.model}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontSize: 9,
                            fontWeight: 600,
                            color: 'var(--dim, #9ca3af)',
                          }}
                        >
                          {vehicle.make}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Vehicle tile */}
              <div
                style={{
                  width: 130,
                  height: 134,
                  flexShrink: 0,
                  border: '1.5px dashed rgba(249,115,22,0.22)',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  cursor: 'pointer',
                }}
                onClick={() => setShowClaimSearch(true)}
              >
                <span style={{ fontSize: 26, color: 'var(--accent, #F97316)', lineHeight: 1 }}>+</span>
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 10,
                    textTransform: 'uppercase',
                    color: 'var(--dim, #9ca3af)',
                  }}
                >
                  ADD VEHICLE
                </span>
              </div>
            </div>
          </>
        ) : (
          /* EMPTY STATE */
          <div className="py-16 text-center space-y-4 px-4">
            <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center bg-surface-2 border border-subtle">
              <Car className="w-7 h-7 text-quaternary" strokeWidth={1.2} />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-primary">Your garage is empty</h2>
              <p className="text-[13px] mt-2 leading-[1.65] text-secondary">
                Claim your first vehicle to start tracking spots, ratings, and bumper stickers from the community.
              </p>
            </div>
            <button
              onClick={() => setShowClaimSearch(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all active:scale-95 text-white bg-orange"
            >
              <Crosshair className="w-3.5 h-3.5" strokeWidth={2} />
              Claim a Plate
            </button>
          </div>
        )}

        {/* LIFETIME RIDES */}
        <div className="slbl stg">
          Lifetime Rides{retiredVehicles.length > 0 ? ` · ${retiredVehicles.length}` : ''}
        </div>

        {retiredVehicles.length > 0 ? (
          <div className="mx-4 mb-4">
            {retiredVehicles.length > 2 && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setShowAllRetiredModal(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-orange"
                >
                  View All
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
            <RetiredTimeline vehicles={retiredVehicles} limit={2} />
            <button
              onClick={() => setShowAddRetiredVehicle(true)}
              className="card-v3 w-full mt-3 py-4 border-dashed hover:border-orange text-secondary hover:text-primary transition-colors flex flex-col items-center justify-center gap-1.5"
            >
              <span className="text-sm font-bold">Remember Your Past Rides</span>
              <span className="text-[11px] text-quaternary">Add vehicles you've owned to build your automotive history</span>
            </button>
          </div>
        ) : (
          <div className="mx-4 mb-4">
            <button
              onClick={() => setShowAddRetiredVehicle(true)}
              className="card-v3 w-full py-8 border-dashed hover:border-orange text-secondary hover:text-primary transition-colors flex flex-col items-center justify-center gap-3"
            >
              <Car className="w-8 h-8 opacity-40" strokeWidth={1.2} />
              <div className="text-center">
                <span className="block text-sm font-bold">Remember Your Past Rides</span>
                <span className="block text-[11px] text-quaternary mt-1">Add vehicles you've owned to build your automotive history</span>
              </div>
            </button>
          </div>
        )}

      </div>

      {/* MODALS */}
      {showAddRetiredVehicle && user && (
        <AddRetiredVehicleModal
          userId={user.id}
          onClose={() => setShowAddRetiredVehicle(false)}
          onSuccess={() => loadRetiredVehicles()}
        />
      )}

      {vehicleToRetire && user && (
        <RetireVehicleModal
          vehicle={vehicleToRetire}
          userId={user.id}
          onClose={() => setVehicleToRetire(null)}
          onSuccess={() => loadGarageData()}
        />
      )}

      {showVerificationModal && vehicleToVerify && (
        <VinClaimModal
          vehicleId={vehicleToVerify.id}
          vehicleInfo={{
            make: vehicleToVerify.make,
            model: vehicleToVerify.model,
            year: vehicleToVerify.year,
          }}
          onClose={() => {
            setShowVerificationModal(false);
            setVehicleToVerify(null);
          }}
          onSuccess={() => {
            setShowVerificationModal(false);
            setVehicleToVerify(null);
            loadGarageData();
            showToast('Vehicle verified via VIN!', 'success');
          }}
        />
      )}

      {/* Claim Search Modal */}
      {showClaimSearch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowClaimSearch(false); setClaimSearchQuery(''); setClaimSearchResult(null); setClaimSearchError(''); }}>
          <div className="bg-surface border border-surfacehighlight rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-surfacehighlight flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg">Claim a Plate</h3>
              <button onClick={() => { setShowClaimSearch(false); setClaimSearchQuery(''); setClaimSearchResult(null); setClaimSearchError(''); }} className="w-8 h-8 rounded-full flex items-center justify-center bg-surfacehighlight hover:bg-surface transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-secondary">Enter your license plate number to find and claim your vehicle.</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                  <input
                    type="text"
                    value={claimSearchQuery}
                    onChange={e => setClaimSearchQuery(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleClaimSearch()}
                    placeholder="ABC1234"
                    maxLength={8}
                    className="w-full pl-10 pr-4 py-3 bg-surfacehighlight border border-surfacehighlight rounded-xl text-sm font-mono tracking-wider focus:outline-none focus:border-orange uppercase"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleClaimSearch}
                  disabled={!claimSearchQuery.trim() || claimSearchLoading}
                  className="px-5 py-3 bg-orange hover:bg-orange/90 disabled:opacity-50 rounded-xl text-sm font-bold uppercase tracking-wider transition-all"
                >
                  {claimSearchLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : 'Search'}
                </button>
              </div>

              {claimSearchError && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-300">
                  {claimSearchError}
                </div>
              )}

              {claimSearchResult && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-3">
                  <div className="text-center">
                    <p className="font-bold text-lg">{claimSearchResult.year} {claimSearchResult.make} {claimSearchResult.model}</p>
                    <p className="text-sm text-secondary">{claimSearchResult.color} &middot; {claimSearchResult.plate_state}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowClaimSearch(false);
                      setShowClaimModal(true);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg rounded-xl font-bold uppercase tracking-wider text-sm transition-all active:scale-95"
                  >
                    Claim This Plate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Claim Vehicle VIN Modal */}
      {showClaimModal && claimSearchResult && (
        <VinClaimModal
          vehicleId={claimSearchResult.id}
          vehicleInfo={{
            year: claimSearchResult.year,
            make: claimSearchResult.make,
            model: claimSearchResult.model,
            color: claimSearchResult.color,
            plateState: claimSearchResult.plate_state,
            plateNumber: claimSearchResult.plate_number,
          }}
          onClose={() => {
            setShowClaimModal(false);
            setClaimSearchResult(null);
            setClaimSearchQuery('');
          }}
          onSuccess={() => {
            setShowClaimModal(false);
            setClaimSearchResult(null);
            setClaimSearchQuery('');
            loadGarageData();
          }}
        />
      )}

      {/* All Retired Vehicles Modal */}
      {showAllRetiredModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center sm:items-center" onClick={() => setShowAllRetiredModal(false)}>
          <div
            className="relative w-full max-w-lg bg-bg border border-subtle rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-faint">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange" strokeWidth={1.5} />
                <div>
                  <h3 className="font-semibold text-sm text-primary leading-none">Lifetime Rides</h3>
                  <p className="text-[10px] text-tertiary mt-0.5">{retiredVehicles.length} vehicles</p>
                </div>
              </div>
              <button
                onClick={() => setShowAllRetiredModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-2 hover:bg-surface-3 transition-colors"
              >
                <X className="w-4 h-4 text-secondary" />
              </button>
            </div>
            <div className="overflow-y-auto p-5" style={{ maxHeight: 'calc(85vh - 70px)' }}>
              <RetiredTimeline vehicles={retiredVehicles} />
              <button
                onClick={() => {
                  setShowAllRetiredModal(false);
                  setShowAddRetiredVehicle(true);
                }}
                className="w-full mt-4 py-2.5 border border-dashed border-subtle hover:border-orange bg-surface rounded-xl text-xs text-secondary hover:text-primary font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Another Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
