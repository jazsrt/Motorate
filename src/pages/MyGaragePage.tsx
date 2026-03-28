import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Car,
  Sparkles,
  Calendar,
  Crosshair,
  ChevronRight,
  X,
  User,
  Album,
} from 'lucide-react';
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
import { Search } from 'lucide-react';
import type { GarageVehicle } from '../types/garage';
import { TIER_COLORS } from '../config/badgeConfig';
import { VEHICLE_OWNER_COLUMNS } from '../lib/vehicles';
import { NearMissBadgeNudge } from '../components/NearMissBadgeNudge';
import { ProfileInsights } from '../components/ProfileInsights';

/** Owner columns + avg_rating + joins needed by garage */
const GARAGE_VEHICLE_SELECT = VEHICLE_OWNER_COLUMNS + `, avg_rating, photos:vehicle_images(*), modifications(*)`;

interface MyGaragePageProps {
  onNavigate?: (page: string, data?: unknown) => void;
}

export function MyGaragePage({ onNavigate }: MyGaragePageProps = {}) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [vehicles, setVehicles] = useState<(GarageVehicle & { [key: string]: any })[]>([]);
  const [vehicleStickerCounts, setVehicleStickerCounts] = useState<Record<string, { name: string; count: number }[]>>({});
  const [retiredVehicles, setRetiredVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRetiredVehicle, setShowAddRetiredVehicle] = useState(false);
  const [vehicleToRetire, setVehicleToRetire] = useState<GarageVehicle | null>(null);
  const [showAllRetiredModal, setShowAllRetiredModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [vehicleToVerify, setVehicleToVerify] = useState<(GarageVehicle & { [key: string]: any }) | null>(null);
  const [stockImages, setStockImages] = useState<Record<string, string>>({});
  const [showClaimSearch, setShowClaimSearch] = useState(false);
  const [claimSearchQuery, setClaimSearchQuery] = useState('');
  const [claimSearchLoading, setClaimSearchLoading] = useState(false);
  const [claimSearchResult, setClaimSearchResult] = useState<any>(null);
  const [claimSearchError, setClaimSearchError] = useState('');
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [_userBadgesForGarage, setUserBadgesForGarage] = useState<any[]>([]);
  const [retiredStockImages, setRetiredStockImages] = useState<Record<string, string>>({});

  // Albums
  const [garageAlbums, setGarageAlbums] = useState<{ id: string; title: string; cover_image_url: string | null; photo_count: number }[]>([]);

  // New state for garage hero
  const [userProfile, setUserProfile] = useState<{ handle: string; full_name: string | null; avatar_url: string | null; reputation_tier: string | null } | null>(null);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [badgeCount, setBadgeCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('handle, full_name, avatar_url, tier').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setUserProfile({ ...data, reputation_tier: data.tier }); });
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id).eq('status', 'accepted')
      .then(({ count }) => { if (count !== null) setFollowerCount(count); });
    supabase.from('user_badges').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      .then(({ count }) => { if (count !== null) setBadgeCount(count); });
    supabase.from('albums').select('id, title, cover_image_url').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
      .then(async ({ data }) => {
        if (!data) return;
        const withCounts = await Promise.all(data.map(async (a) => {
          const { count } = await supabase.from('album_photos').select('*', { count: 'exact', head: true }).eq('album_id', a.id);
          return { ...a, photo_count: count || 0 };
        }));
        setGarageAlbums(withCounts);
      });
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
        const url = await getVehicleImageUrl(vehicle.make, vehicle.model, vehicle.year, vehicle.color || undefined);
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
      .select('vehicle_id, tag_name, count')
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
  }, [retiredVehicles, retiredStockImages]);

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

  const loadVehicles = useCallback(async () => {
    const { data: ownedVehicles } = await supabase
      .from('vehicles')
      .select(GARAGE_VEHICLE_SELECT)
      .eq('owner_id', user!.id)
      .order('created_at', { ascending: false });

    const { data: allClaims } = await supabase
      .from('verification_claims')
      .select(`vehicle_id, status, created_at, vehicle:vehicles!inner(${GARAGE_VEHICLE_SELECT})`)
      .eq('user_id', user!.id)
      .in('status', ['pending', 'approved']);

    const allVehicles: any[] = [];
    if (ownedVehicles) allVehicles.push(...(ownedVehicles as any[]));
    if (allClaims) {
      const ownedIds = new Set((ownedVehicles as any[])?.map((v: any) => v.id) || []);
      for (const claim of (allClaims as any[])) {
        if (claim.vehicle && !ownedIds.has(claim.vehicle.id)) {
          allVehicles.push({
            ...claim.vehicle,
            _claimStatus: claim.status,
            verification_tier: claim.status === 'pending' ? 'pending' : claim.vehicle.verification_tier,
          });
        }
      }
    }
    setVehicles(allVehicles);

    if (user?.id) {
      const { data: badgeData } = await supabase
        .from('user_badges')
        .select('badge_id, badges(id, name, icon_name, category, tier)')
        .eq('user_id', user.id)
        .limit(20);
      if (badgeData) {
        setUserBadgesForGarage(
          badgeData.filter((ub: any) => ub.badges).map((ub: any) => ({
            id: ub.badges.id, name: ub.badges.name, icon: ub.badges.icon_name,
            category: ub.badges.category, tier: ub.badges.tier,
          }))
        );
      }
    }

    const vehicleIds = allVehicles.map((v: any) => v.id);
    if (vehicleIds.length > 0) {
      const { data: followCounts } = await supabase
        .from('vehicle_follows')
        .select('vehicle_id')
        .in('vehicle_id', vehicleIds)
        .eq('status', 'accepted');
      const countMap: Record<string, number> = {};
      (followCounts || []).forEach((f: any) => {
        countMap[f.vehicle_id] = (countMap[f.vehicle_id] || 0) + 1;
      });
      allVehicles.forEach((v: any) => {
        v._vehicleFollowerCount = countMap[v.id as string] || 0;
      });

      // Load vehicle badges for fleet tiles
      const { data: vehicleBadgeData } = await supabase
        .from('vehicle_badges')
        .select('vehicle_id, badge_id, tier, sticker_count')
        .in('vehicle_id', vehicleIds);

      if (vehicleBadgeData) {
        const tierOrder: Record<string, number> = { Platinum: 4, Gold: 3, Silver: 2, Bronze: 1 };
        const badgeMap: Record<string, { badge_id: string; tier: string }> = {};
        (vehicleBadgeData as any[]).forEach((vb: any) => {
          const existing = badgeMap[vb.vehicle_id];
          const newOrder = tierOrder[vb.tier] || 0;
          const existingOrder = existing ? (tierOrder[existing.tier] || 0) : 0;
          if (!existing || newOrder > existingOrder) {
            badgeMap[vb.vehicle_id] = { badge_id: vb.badge_id, tier: vb.tier };
          }
        });
        allVehicles.forEach((v: any) => {
          v.topBadge = badgeMap[v.id as string] || null;
        });
      }
    }

    return allVehicles;
  }, [user]);

  const loadRetiredVehicles = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('retired_vehicles')
      .select('*')
      .eq('user_id', user.id)
      .order('retired_at', { ascending: false });
    if (data) setRetiredVehicles(data);
  }, [user]);

  const loadGarageData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadVehicles(), loadRetiredVehicles()]);
    } catch {
      showToast('Failed to load garage', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, loadVehicles, loadRetiredVehicles]);

  useEffect(() => {
    if (user) {
      loadGarageData();
    }
  }, [user, loadGarageData]);

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

  const handleNavigate = (page: string, data?: unknown) => {
    if (onNavigate) {
      onNavigate(page, data);
    } else {
      window.location.hash = page;
    }
  };

  if (loading || !user) {
    return <LoadingScreen />;
  }

  // Hero derived data
  const heroVehicle = vehicles[0];
  const heroPhoto = heroVehicle ? (heroVehicle.photos?.[0]?.url || heroVehicle.photo_url || heroVehicle.stock_image_url || stockImages[heroVehicle.id]) : null;
  const displayName = userProfile?.full_name || user?.user_metadata?.full_name || 'My Garage';
  const handle = userProfile?.handle || user?.user_metadata?.handle || 'driver';
  const avatarUrl = userProfile?.avatar_url || user?.user_metadata?.avatar_url;
  const tier = userProfile?.reputation_tier;
  const totalRP = vehicles.reduce((sum, v) => sum + ((v as unknown as Record<string, number>).reputation_score ?? 0), 0);

  // FleetTile component
  const FleetTile = ({ vehicle }: { vehicle: GarageVehicle & { [key: string]: any } }) => {
    const [imgError, setImgError] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [uploading, setUploading] = useState(false);

    const userPhoto = vehicle.photos?.[0]?.url || vehicle.photo_url;
    const stockPhoto = vehicle.stock_image_url || stockImages[vehicle.id];
    const photoUrl: string | null = imgError ? null : (userPhoto || stockPhoto) as string | null;

    const isPending = vehicle._claimStatus === 'pending' || (vehicle.verification_tier as string) === 'pending';
    const isClaimed = !isPending && (vehicle.owner_id || vehicle.is_claimed);
    const isVerified = vehicle.verification_tier === 'verified' || vehicle.verification_tier === 'vin_verified';

    const statusLabel = isPending ? 'Pending' : isVerified ? 'Verified' : isClaimed ? 'Claimed' : 'Unclaimed';
    const statusBg = isPending ? 'rgba(249,115,22,0.1)' : isVerified ? 'rgba(34,197,94,0.1)' : isClaimed ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)';
    const statusBorder = isPending ? 'rgba(249,115,22,0.25)' : isVerified ? 'rgba(34,197,94,0.3)' : isClaimed ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)';
    const statusColor = isPending ? '#F97316' : isVerified ? '#22c55e' : isClaimed ? '#22c55e' : '#556677';

    const spotCount = vehicle.spot_count ?? vehicle.spots_count ?? 0;
    const vehiclePhotos = (vehicle.photos as unknown as Array<{ url: string; uploaded_at: string }>) || [];
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
        const photoUrl = await uploadImage(file, 'vehicles');
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
        loadGarageData();
      } catch (error) {
        console.error('Failed to upload photo:', error);
        showToast('Failed to upload photo', 'error');
      } finally {
        setUploading(false);
      }
    };

    return (
      <div
        style={{
          flexShrink: 0, width: 195, borderRadius: 8, overflow: 'hidden',
          background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)',
          cursor: 'pointer', scrollSnapAlign: 'start' as const,
        }}
        onClick={() => handleNavigate('vehicle-detail', { vehicleId: vehicle.id })}
      >
        {/* Photo area */}
        <div style={{ height: 134, position: 'relative', overflow: 'hidden' }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#0e1320', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car style={{ width: 28, height: 28, color: '#334455' }} strokeWidth={1.2} />
            </div>
          )}
          {/* Bottom gradient */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%', background: 'linear-gradient(to top, rgba(10,13,20,0.95) 0%, transparent 100%)' }} />

          {/* Rank badge top right */}
          {(vehicle as any).city_rank && (
            <div style={{
              position: 'absolute', top: 7, right: 8, zIndex: 4,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
              color: 'rgba(255,255,255,0.35)',
            }}>
              #{(vehicle as any).city_rank}
            </div>
          )}

          {/* Status badge top left */}
          <div style={{
            position: 'absolute', top: 7, left: 8, zIndex: 4,
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: statusBg, border: `1px solid ${statusBorder}`,
            borderRadius: 3, padding: '2px 7px',
          }}>
            {isVerified && (
              <svg width="9" height="9" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M8 0L10.2 2.5L13.5 2L13.8 5.3L16 7.5L14 10L14.5 13.3L11.3 14L9 16.2L7 14L3.7 14.5L3 11.3L0 9.5L2 7L1.5 3.7L4.7 3L7 0.5L8 0Z" fill="#22c55e" />
                <path d="M6.5 10.5L4.5 8.5L5.5 7.5L6.5 8.5L10 5L11 6L6.5 10.5Z" fill="#0a0d14" />
              </svg>
            )}
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: statusColor,
            }}>
              {statusLabel}
            </span>
          </div>

          {/* Top badge overlay */}
          {(vehicle as any).topBadge && (() => {
            const tb = (vehicle as any).topBadge;
            const colors = TIER_COLORS[tb.tier as keyof typeof TIER_COLORS] || TIER_COLORS.Bronze;
            return (
              <div style={{
                position: 'absolute', bottom: 44, left: 8, zIndex: 4,
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: colors.bg, border: `1px solid ${colors.border}`,
                borderRadius: 5, padding: '3px 7px',
              }}>
                <span style={{
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: 8, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: colors.text,
                }}>
                  {tb.badge_id}
                </span>
              </div>
            );
          })()}

          {/* Text overlay at bottom of photo */}
          <div style={{ position: 'absolute', bottom: 6, left: 8, right: 8, zIndex: 4 }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316',
            }}>
              {vehicle.make}
            </div>
            <div style={{
              fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 700,
              color: '#eef4f8', lineHeight: 1.1,
              whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {vehicle.model || vehicle.make}
            </div>
          </div>
        </div>

        {/* Info below photo */}
        <div style={{ padding: '8px 10px 10px' }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
            letterSpacing: '0.04em', color: '#7a8e9e',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {spotCount} Spots · {(vehicle as any)._vehicleFollowerCount ?? 0} Followers · {(vehicle as any).reputation_score > 0 ? `${((vehicle as any).reputation_score).toLocaleString()} RP` : 'No RP yet'}
          </div>
        </div>

        {/* Photo thumbnail strip */}
        {(vehiclePhotos.length > 0 || isClaimed) && (
          <div
            style={{ display: 'flex', gap: 4, padding: '0 8px 8px', overflowX: 'auto' as const, scrollbarWidth: 'none' as const }}
            onClick={(e) => e.stopPropagation()}
          >
            {vehiclePhotos.map((photo, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(index);
                  setLightboxOpen(true);
                }}
                style={{
                  width: 32, height: 32, borderRadius: 5, overflow: 'hidden', flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.08)', background: 'none', padding: 0, cursor: 'pointer',
                }}
              >
                <img src={photo.url} alt={`Photo ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
            {isClaimed && vehiclePhotos.length < 10 && (
              <label style={{
                width: 32, height: 32, borderRadius: 5, flexShrink: 0, cursor: 'pointer',
                border: '1.5px dashed rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
                {uploading ? (
                  <div style={{
                    width: 12, height: 12, border: '2px solid #F97316', borderTopColor: 'transparent',
                    borderRadius: '50%', animation: 'spin 1s linear infinite',
                  }} />
                ) : (
                  <Plus style={{ width: 14, height: 14, color: '#556677' }} strokeWidth={1.5} />
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
      </div>
    );
  };

  // RetiredTimeline component
  const RetiredTimeline = ({ vehicles: rv, limit }: { vehicles: any[]; limit?: number }) => {
    const list = limit ? rv.slice(0, limit) : rv;
    return (
      <div style={{ position: 'relative', paddingLeft: 24 }}>
        <div style={{
          position: 'absolute', left: 8, top: 8, bottom: 8, width: 2,
          background: 'linear-gradient(to bottom, rgba(249,115,22,0.5), rgba(255,255,255,0.04), rgba(255,255,255,0.04))',
        }} />
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
          {list.map((vehicle) => {
            const stockUrl = retiredStockImages[vehicle.id];
            return (
              <div key={vehicle.id} style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: -18, top: 12, width: 16, height: 16,
                  borderRadius: '50%', background: '#070a0f', border: '2px solid #F97316', zIndex: 10,
                }} />
                <div style={{
                  background: '#0a0d14', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 8, overflow: 'hidden',
                }}>
                  {(vehicle.photo_url_1 || vehicle.photo_url_2) ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#0e1320' }}>
                      {vehicle.photo_url_1 && (
                        <img src={vehicle.photo_url_1} alt="" style={{ width: '100%', height: 112, objectFit: 'cover' }} />
                      )}
                      {vehicle.photo_url_2 ? (
                        <img src={vehicle.photo_url_2} alt="" style={{ width: '100%', height: 112, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: 112, background: '#0e1320', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Car style={{ width: 32, height: 32, color: '#334455', opacity: 0.4 }} strokeWidth={1.2} />
                        </div>
                      )}
                    </div>
                  ) : stockUrl ? (
                    <div style={{ height: 112, overflow: 'hidden' }}>
                      <img src={stockUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ height: 96, background: 'linear-gradient(135deg, #0e1320, #111827)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Car style={{ width: 40, height: 40, color: '#334455', opacity: 0.3 }} strokeWidth={1.2} />
                    </div>
                  )}
                  <div style={{ padding: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#eef4f8' }}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                      {vehicle.trim && <span style={{ fontSize: 12, color: '#7a8e9e', fontWeight: 400, marginLeft: 4 }}>{vehicle.trim}</span>}
                    </div>
                    {vehicle.ownership_period && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: '#F97316' }}>
                        <Calendar style={{ width: 12, height: 12 }} />
                        {vehicle.ownership_period}
                      </div>
                    )}
                    {vehicle.notes && (
                      <p style={{
                        fontSize: 13, color: '#9ab0c0', marginTop: 8, lineHeight: 1.6,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                      }}>{vehicle.notes}</p>
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
      <div style={{ background: '#070a0f', minHeight: '100vh', paddingBottom: 100 }}>

        {/* 1. GARAGE HERO */}
        <div style={{ position: 'relative', height: 175, overflow: 'hidden', flexShrink: 0 }}>
          {heroPhoto ? (
            <img src={heroPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.42) saturate(0.5)' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#0a0d14' }} />
          )}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.008) 0, rgba(255,255,255,0.008) 1px, transparent 1px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.008) 0, rgba(255,255,255,0.008) 1px, transparent 1px, transparent 8px)`,
          }} />
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: 'linear-gradient(to bottom, rgba(3,5,8,0.3) 0%, rgba(3,5,8,0.86) 100%)',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5,
            padding: '0 18px 12px',
            display: 'flex', alignItems: 'flex-end', gap: 13,
          }}>
            <div style={{
              width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              border: '2px solid #F97316', boxShadow: '0 0 18px rgba(249,115,22,0.28)',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: '#0e1320', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User style={{ width: 24, height: 24, color: '#445566' }} strokeWidth={1.5} />
                  </div>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 20, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
                {displayName}
              </div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: '#7a8e9e', marginTop: 2 }}>
                @{handle}
              </div>
              {tier && (
                <div style={{
                  display: 'inline-block', marginTop: 4,
                  background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)',
                  borderRadius: 3, padding: '2px 8px',
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316',
                }}>
                  {tier}
                </div>
              )}
            </div>
            {totalRP > 0 && (
              <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 22, fontWeight: 700, color: '#F97316', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {totalRP.toLocaleString()}
                </div>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#445566' }}>
                  Fleet RP
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. STAT BAR */}
        {vehicles.length > 0 && (
          <div style={{ display: 'flex', background: '#0a0d14', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {[
              { label: 'Vehicles', value: fleetStats.vehicleCount },
              { label: 'Spots', value: fleetStats.totalSpots },
              { label: 'Followers', value: followerCount ?? '\u2014' },
              { label: 'Badges', value: badgeCount ?? '\u2014' },
            ].map((stat, i, arr) => (
              <div key={stat.label} style={{
                flex: 1, padding: '12px 0',
                display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2,
                borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                cursor: 'pointer',
              }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 17, fontWeight: 700, color: '#eef4f8', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {stat.value}
                </div>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 7, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#445566' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PROFILE INSIGHTS */}
        {user && (
          <div style={{ padding: '12px 18px 0' }}>
            <ProfileInsights profileId={user.id} />
          </div>
        )}

        {/* BADGE NUDGE */}
        {user && (
          <div style={{ paddingTop: 12 }}>
            <NearMissBadgeNudge userId={user.id} />
          </div>
        )}

        {/* 3. FLEET SECTION or EMPTY STATE */}
        {vehicles.length > 0 ? (
          <>
            {/* Fleet header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 10px' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: '#445566' }}>
                The Fleet {'\u00B7'} {vehicles.length}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span onClick={() => handleNavigate('glovebox')} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7a8e9e', cursor: 'pointer' }}>
                  Glovebox
                </span>
                <span onClick={() => onNavigate?.('create-post')} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7a8e9e', cursor: 'pointer' }}>
                  + New Post
                </span>
                <span onClick={() => setShowClaimSearch(true)} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', cursor: 'pointer' }}>
                  + Claim Vehicle
                </span>
              </div>
            </div>

            {/* Fleet carousel */}
            <div style={{ display: 'flex', gap: 10, padding: '0 18px 18px', overflowX: 'auto', scrollSnapType: 'x mandatory' as const, scrollbarWidth: 'none' as const }}>
              {vehicles.map(vehicle => <FleetTile key={vehicle.id} vehicle={vehicle} />)}
              {/* Add tile */}
              <div onClick={() => setShowClaimSearch(true)} style={{
                flexShrink: 0, width: 130, height: 134, borderRadius: 8,
                border: '1.5px dashed rgba(249,115,22,0.22)',
                display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
                gap: 7, cursor: 'pointer', scrollSnapAlign: 'start' as const,
              }}>
                <Plus style={{ width: 22, height: 22, color: '#F97316' }} strokeWidth={1.5} />
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7a8e9e', textAlign: 'center' as const, whiteSpace: 'pre-line' as const }}>
                  Claim a{'\n'}Vehicle
                </span>
              </div>
            </div>
          </>
        ) : (
          /* EMPTY STATE */
          <div style={{ padding: '64px 16px', textAlign: 'center' as const }}>
            <div style={{
              width: 64, height: 64, margin: '0 auto', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#0e1320', border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <Car style={{ width: 28, height: 28, color: '#334455' }} strokeWidth={1.2} />
            </div>
            <div style={{ marginTop: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#eef4f8' }}>Garage Empty</h2>
              <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.65, color: '#9ab0c0' }}>
                Claim your first vehicle to start tracking spots, ratings, and bumper stickers from the community.
              </p>
            </div>
            <button
              onClick={() => setShowClaimSearch(true)}
              style={{
                marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em',
                color: '#ffffff', background: '#F97316',
              }}
            >
              <Crosshair style={{ width: 14, height: 14 }} strokeWidth={2} />
              Claim a Plate
            </button>
          </div>
        )}

        {/* 4. ALBUMS */}
        <div style={{ padding: '16px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: '#445566' }}>
            Albums{garageAlbums.length > 0 ? ` \u00B7 ${garageAlbums.length}` : ''}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {garageAlbums.length > 0 && (
              <span
                onClick={() => handleNavigate('albums')}
                style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7a8e9e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
              >
                View All
                <ChevronRight style={{ width: 12, height: 12 }} />
              </span>
            )}
            <span
              onClick={() => handleNavigate('albums')}
              style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', cursor: 'pointer' }}
            >
              + New Album
            </span>
          </div>
        </div>

        {garageAlbums.length > 0 ? (
          <div style={{ display: 'flex', gap: 10, padding: '0 18px 18px', overflowX: 'auto', scrollSnapType: 'x mandatory' as const, scrollbarWidth: 'none' as const }}>
            {garageAlbums.map(album => (
              <div
                key={album.id}
                onClick={() => handleNavigate('albums')}
                style={{
                  flexShrink: 0, width: 140, borderRadius: 8, overflow: 'hidden',
                  background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer', scrollSnapAlign: 'start' as const,
                }}
              >
                <div style={{ height: 100, position: 'relative', overflow: 'hidden' }}>
                  {album.cover_image_url ? (
                    <img src={album.cover_image_url} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#0e1320', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Album style={{ width: 24, height: 24, color: '#334455' }} strokeWidth={1.2} />
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, rgba(10,13,20,0.9), transparent)' }} />
                  <div style={{ position: 'absolute', bottom: 6, left: 8, right: 8, zIndex: 2 }}>
                    <div style={{
                      fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700,
                      color: '#eef4f8', lineHeight: 1.1,
                      whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {album.title}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
                    letterSpacing: '0.04em', color: '#7a8e9e',
                  }}>
                    {album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ margin: '0 18px 18px' }}>
            <button
              onClick={() => handleNavigate('albums')}
              style={{
                width: '100%', padding: '24px 0',
                background: '#0a0d14', border: '1.5px dashed rgba(255,255,255,0.08)', borderRadius: 8,
                display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
                gap: 8, cursor: 'pointer',
              }}
            >
              <Album style={{ width: 28, height: 28, color: '#334455', opacity: 0.4 }} strokeWidth={1.2} />
              <div style={{ textAlign: 'center' as const }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#9ab0c0' }}>Create Your First Album</span>
                <span style={{ display: 'block', fontSize: 11, color: '#556677', marginTop: 3 }}>Organize your car photos into collections</span>
              </div>
            </button>
          </div>
        )}

        {/* 5. LIFETIME RIDES */}
        <div style={{
          fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: '#445566',
          padding: '16px 18px 10px',
        }}>
          Lifetime Rides{retiredVehicles.length > 0 ? ` \u00B7 ${retiredVehicles.length}` : ''}
        </div>

        {retiredVehicles.length > 0 ? (
          <div style={{ margin: '0 16px 16px' }}>
            {retiredVehicles.length > 2 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <button
                  onClick={() => setShowAllRetiredModal(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 600, color: '#F97316',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  View All
                  <ChevronRight style={{ width: 12, height: 12 }} />
                </button>
              </div>
            )}
            <RetiredTimeline vehicles={retiredVehicles} limit={2} />
            <button
              onClick={() => setShowAddRetiredVehicle(true)}
              style={{
                width: '100%', marginTop: 12, padding: '16px 0',
                background: '#0a0d14', border: '1.5px dashed rgba(255,255,255,0.08)', borderRadius: 8,
                display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
                gap: 6, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: '#9ab0c0' }}>Remember Your Past Rides</span>
              <span style={{ fontSize: 11, color: '#556677' }}>Add vehicles you've owned to build your automotive history</span>
            </button>
          </div>
        ) : (
          <div style={{ margin: '0 16px 16px' }}>
            <button
              onClick={() => setShowAddRetiredVehicle(true)}
              style={{
                width: '100%', padding: '32px 0',
                background: '#0a0d14', border: '1.5px dashed rgba(255,255,255,0.08)', borderRadius: 8,
                display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
                gap: 12, cursor: 'pointer',
              }}
            >
              <Car style={{ width: 32, height: 32, color: '#334455', opacity: 0.4 }} strokeWidth={1.2} />
              <div style={{ textAlign: 'center' as const }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#9ab0c0' }}>Remember Your Past Rides</span>
                <span style={{ display: 'block', fontSize: 11, color: '#556677', marginTop: 4 }}>Add vehicles you've owned to build your automotive history</span>
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
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={() => { setShowClaimSearch(false); setClaimSearchQuery(''); setClaimSearchResult(null); setClaimSearchError(''); }}
        >
          <div
            style={{
              background: '#0e1320', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, width: '100%', maxWidth: 448,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: 20, borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h3 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, color: '#eef4f8' }}>Claim a Plate</h3>
              <button
                onClick={() => { setShowClaimSearch(false); setClaimSearchQuery(''); setClaimSearchResult(null); setClaimSearchError(''); }}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.06)',
                }}
              >
                <X style={{ width: 16, height: 16, color: '#9ab0c0' }} />
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ fontSize: 14, color: '#9ab0c0', marginBottom: 16 }}>Enter your license plate number to find and claim your vehicle.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#556677' }} />
                  <input
                    type="text"
                    value={claimSearchQuery}
                    onChange={e => setClaimSearchQuery(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleClaimSearch()}
                    placeholder="ABC1234"
                    maxLength={8}
                    autoFocus
                    style={{
                      width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12, fontSize: 14, color: '#eef4f8',
                      fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                      outline: 'none',
                    }}
                  />
                </div>
                <button
                  onClick={handleClaimSearch}
                  disabled={!claimSearchQuery.trim() || claimSearchLoading}
                  style={{
                    padding: '12px 20px', background: '#F97316', border: 'none', borderRadius: 12,
                    fontSize: 14, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em',
                    color: '#ffffff', cursor: 'pointer',
                    opacity: (!claimSearchQuery.trim() || claimSearchLoading) ? 0.5 : 1,
                  }}
                >
                  {claimSearchLoading ? (
                    <div style={{
                      width: 20, height: 20, border: '2px solid #ffffff', borderTopColor: 'transparent',
                      borderRadius: '50%', animation: 'spin 1s linear infinite',
                    }} />
                  ) : 'Search'}
                </button>
              </div>

              {claimSearchError && (
                <div style={{
                  marginTop: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: 12, padding: 16, fontSize: 14, color: '#fbbf24',
                }}>
                  {claimSearchError}
                </div>
              )}

              {claimSearchResult && (
                <div style={{
                  marginTop: 16, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
                  borderRadius: 12, padding: 16,
                }}>
                  <div style={{ textAlign: 'center' as const }}>
                    <p style={{ fontWeight: 700, fontSize: 18, color: '#eef4f8' }}>
                      {claimSearchResult.year} {claimSearchResult.make} {claimSearchResult.model}
                    </p>
                    <p style={{ fontSize: 14, color: '#9ab0c0', marginTop: 4 }}>
                      {claimSearchResult.color} {'\u00B7'} {claimSearchResult.plate_state}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowClaimSearch(false);
                      setShowClaimModal(true);
                    }}
                    style={{
                      width: '100%', marginTop: 12, padding: '12px 0', border: 'none', borderRadius: 12,
                      fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontSize: 14,
                      color: '#ffffff', cursor: 'pointer',
                      background: 'linear-gradient(to right, #22c55e, #10b981)',
                    }}
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
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowAllRetiredModal(false)}
        >
          <div
            style={{
              position: 'relative', width: '100%', maxWidth: 512,
              background: '#070a0f', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 16, overflow: 'hidden', maxHeight: '85vh',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles style={{ width: 16, height: 16, color: '#F97316' }} strokeWidth={1.5} />
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: 14, color: '#eef4f8', lineHeight: 1 }}>Lifetime Rides</h3>
                  <p style={{ fontSize: 10, color: '#7a8e9e', marginTop: 2 }}>{retiredVehicles.length} vehicles</p>
                </div>
              </div>
              <button
                onClick={() => setShowAllRetiredModal(false)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                <X style={{ width: 16, height: 16, color: '#9ab0c0' }} />
              </button>
            </div>
            <div style={{ overflowY: 'auto' as const, padding: 20, maxHeight: 'calc(85vh - 70px)' }}>
              <RetiredTimeline vehicles={retiredVehicles} />
              <button
                onClick={() => {
                  setShowAllRetiredModal(false);
                  setShowAddRetiredVehicle(true);
                }}
                style={{
                  width: '100%', marginTop: 16, padding: '10px 0',
                  background: 'rgba(255,255,255,0.02)', border: '1.5px dashed rgba(255,255,255,0.08)',
                  borderRadius: 12, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em',
                  color: '#9ab0c0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Plus style={{ width: 14, height: 14 }} />
                Add Another Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
