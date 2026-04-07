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
  const [, setUserBadgesForGarage] = useState<any[]>([]);
  const [retiredStockImages, setRetiredStockImages] = useState<Record<string, string>>({});

  // Albums
  const [garageAlbums, setGarageAlbums] = useState<{ id: string; title: string; cover_image_url: string | null; photo_count: number }[]>([]);

  // Garage hero + stats state
  const [userProfile, setUserProfile] = useState<{ handle: string; full_name: string | null; avatar_url: string | null; reputation_tier: string | null; reputation_score: number } | null>(null);
  const [userSpotCount, setUserSpotCount] = useState(0);
  const [vehicleFollowerTotal, setVehicleFollowerTotal] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);
  const [latestBadge, setLatestBadge] = useState<{ name: string; tier: string } | null>(null);
  const [recentSpots, setRecentSpots] = useState<{ id: string; vehicle_id: string; plate_number: string | null; make: string | null; model: string | null; created_at: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    // Profile
    supabase.from('profiles').select('handle, full_name, avatar_url, tier, reputation_score').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setUserProfile({ ...data, reputation_tier: data.tier, reputation_score: data.reputation_score ?? 0 }); });
    // User's own spot count (from spot_history)
    supabase.from('spot_history').select('*', { count: 'exact', head: true }).eq('spotter_id', user.id)
      .then(({ count }) => { if (count !== null) setUserSpotCount(count); });
    // Badge count + latest badge
    supabase.from('user_badges').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      .then(({ count }) => { if (count !== null) setBadgeCount(count); });
    supabase.from('user_badges').select('badge_id, badges(name, tier)').eq('user_id', user.id).order('earned_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data && data[0]) {
          const b = (data[0] as any).badges;
          if (b) setLatestBadge({ name: b.name, tier: b.tier || 'Bronze' });
        }
      });
    // Recent spots (last 10 by this user)
    supabase.from('spot_history')
      .select('id, vehicle_id, created_at, vehicle:vehicles!spot_history_vehicle_id_fkey(plate_number, make, model)')
      .eq('spotter_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) {
          setRecentSpots(data.map((s: any) => ({
            id: s.id,
            vehicle_id: s.vehicle_id,
            plate_number: s.vehicle?.plate_number || null,
            make: s.vehicle?.make || null,
            model: s.vehicle?.model || null,
            created_at: s.created_at,
          })));
        }
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
      let totalFollowers = 0;
      allVehicles.forEach((v: any) => {
        v._vehicleFollowerCount = countMap[v.id as string] || 0;
        totalFollowers += v._vehicleFollowerCount;
      });
      setVehicleFollowerTotal(totalFollowers);

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

  const handle = userProfile?.handle || user?.user_metadata?.handle || 'driver';
  const avatarUrl = userProfile?.avatar_url || user?.user_metadata?.avatar_url;
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

    const claimedTag = isClaimed || isVerified;
    const tagLabel = isPending ? 'Pending' : isVerified ? 'Verified' : isClaimed ? 'Claimed' : 'Unclaimed';
    const tagBg = claimedTag ? 'rgba(32,192,96,0.10)' : 'rgba(249,115,22,0.10)';
    const tagBorder = claimedTag ? '1px solid rgba(32,192,96,0.20)' : '1px solid rgba(249,115,22,0.20)';
    const tagColor = claimedTag ? '#20c060' : '#F97316';

    return (
      <div
        style={{
          background: '#0d1117', borderRadius: 10, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.05)',
          cursor: 'pointer',
        }}
        onClick={() => handleNavigate('vehicle-detail', { vehicleId: vehicle.id })}
      >
        {/* Image */}
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{ width: '100%', height: 100, background: '#111720', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3a4e60" strokeWidth="1.2">
              <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17H3v-6l2-5h9l4 5h3v6h-2"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
        )}

        {/* Card body */}
        <div style={{ padding: '10px 12px 12px' }}>
          {/* Make */}
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316', marginBottom: 1 }}>
            {vehicle.make}
          </div>
          {/* Model + year */}
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#eef4f8', lineHeight: 1, marginBottom: 6 }}>
            {vehicle.year ? `${vehicle.year} ` : ''}{vehicle.model || vehicle.make}
          </div>
          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: '#F97316', fontVariantNumeric: 'tabular-nums' }}>
              {((vehicle as any).reputation_score ?? 0).toLocaleString()} RP
            </span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, color: '#5a6e7e', letterSpacing: '0.08em' }}>
              {spotCount} SPOTS
            </span>
            <span style={{
              marginLeft: 'auto',
              background: tagBg, border: tagBorder, color: tagColor,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700,
              textTransform: 'uppercase' as const, padding: '2px 7px', borderRadius: 4,
            }}>
              {tagLabel}
            </span>
          </div>
        </div>

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
                  background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 10, overflow: 'hidden',
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
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316', marginBottom: 1 }}>
                      {vehicle.make}
                    </div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#eef4f8', lineHeight: 1, marginBottom: 4 }}>
                      {vehicle.year ? `${vehicle.year} ` : ''}{vehicle.model || vehicle.make}
                      {vehicle.trim && <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#5a6e7e', fontWeight: 600, marginLeft: 6 }}>{vehicle.trim}</span>}
                    </div>
                    {vehicle.ownership_period && (
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: '#5a6e7e', marginTop: 2 }}>
                        {vehicle.ownership_period}
                      </div>
                    )}
                    {vehicle.notes && (
                      <p style={{
                        fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7a8e9e', marginTop: 6, lineHeight: 1.4,
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

  // Helper: relative time
  function timeAgo(dateStr: string): string {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  // Primary vehicle image for hero
  const primaryVehicle = vehicles[0];
  const heroImage = primaryVehicle
    ? ((primaryVehicle as any).profile_image_url || primaryVehicle.stock_image_url || stockImages[primaryVehicle.id] || null)
    : null;

  return (
    <Layout currentPage="my-garage" onNavigate={handleNavigate}>
      <div style={{ background: '#070a0f', minHeight: '100vh', paddingBottom: 100 }}>

        {/* ── 1. HERO — vehicle-image driven ── */}
        <div style={{ position: 'relative', width: '100%', height: 240, overflow: 'hidden' }}>
          {heroImage ? (
            <img src={heroImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0a0d14, #070a0f)' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.95) 0%, rgba(3,5,8,0.5) 50%, transparent 100%)' }} />
          <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 2 }}>
            <div
              onClick={() => user && handleNavigate('profile')}
              style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 26, fontWeight: 700, color: '#eef4f8', lineHeight: 1, cursor: 'pointer' }}
            >
              @{handle}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: '#F97316', fontVariantNumeric: 'tabular-nums' }}>
                {(userProfile?.reputation_score ?? totalRP).toLocaleString()}
              </span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#F97316' }}>RP</span>
            </div>
          </div>
        </div>

        {/* ── 2. STAT STRIP (all live) ── */}
        <div style={{ display: 'flex', background: '#0a0d14', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {[
            { label: 'Vehicles', value: vehicles.length },
            { label: 'Spots', value: userSpotCount },
            { label: 'Followers', value: vehicleFollowerTotal },
            { label: 'Badges', value: badgeCount },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{
              flex: 1, padding: '12px 0', textAlign: 'center' as const,
              borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, color: (stat.label === 'Followers' || stat.label === 'Badges') ? '#F97316' : '#eef4f8', display: 'block', fontVariantNumeric: 'tabular-nums' }}>{stat.value}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#3a4e60', display: 'block', marginTop: 2 }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ── 3. FLEET — 2x2 image grid ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px 8px' }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
            Fleet{vehicles.length > 0 ? ` \u00B7 ${vehicles.length}` : ''}
          </span>
        </div>

        {vehicles.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {vehicles.map(vehicle => {
              const img = (vehicle as any).profile_image_url || vehicle.stock_image_url || stockImages[vehicle.id];
              const topSticker = vehicleStickerCounts[vehicle.id]?.[0];
              const fans = (vehicle as any)._vehicleFollowerCount ?? 0;
              const isVerified = vehicle.verification_tier === 'vin_verified';

              return (
                <div
                  key={vehicle.id}
                  onClick={() => handleNavigate('vehicle-detail', { vehicleId: vehicle.id })}
                  style={{
                    position: 'relative', height: 90, overflow: 'hidden', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #0d1117, #070a0f)',
                    ...(fans > 50 ? { boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.35)' } : {}),
                  }}
                >
                  {img && <img src={img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.85) brightness(0.9)' }} />}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(3,5,8,0) 20%, rgba(3,5,8,0.92) 100%)' }} />
                  {/* VIN chip */}
                  {isVerified && (
                    <div style={{ position: 'absolute', top: 5, left: 5, zIndex: 3, background: 'rgba(3,5,8,0.8)', border: '1px solid rgba(249,115,22,0.4)', borderRadius: 2, padding: '1px 5px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, color: '#F97316' }}>VIN</div>
                  )}
                  {/* Follower count */}
                  <div style={{ position: 'absolute', top: 5, right: 5, zIndex: 3, background: 'rgba(3,5,8,0.8)', borderRadius: 2, padding: '2px 5px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, color: '#eef4f8' }}>{fans} Followers</div>
                  {/* Bottom meta */}
                  <div style={{ position: 'absolute', bottom: 6, left: 6, right: 6, zIndex: 2 }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#F97316', lineHeight: 1 }}>{vehicle.make}</div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
                      {(vehicle as any).vehicle_handle ? `@${(vehicle as any).vehicle_handle}` : vehicle.model || vehicle.make}
                    </div>
                    {topSticker && (
                      <div style={{ marginTop: 2, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, color: '#F97316', background: 'rgba(249,115,22,0.1)', borderRadius: 2, padding: '1px 5px', display: 'inline-block' }}>{topSticker.name}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '32px 24px', textAlign: 'center' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
            <Car style={{ width: 32, height: 32, color: '#1e2a38', marginBottom: 12 }} strokeWidth={1.2} />
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8', marginBottom: 6 }}>No vehicles claimed yet</div>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e', lineHeight: 1.5, marginBottom: 16 }}>Search for your plate and claim your first vehicle.</p>
            <button onClick={() => handleNavigate('search')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
              Search a Plate
            </button>
          </div>
        )}

        {/* ── 4. ACHIEVEMENTS PREVIEW ── */}
        <NearMissBadgeNudge userId={user?.id} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
            Badges · {badgeCount}
          </span>
          <span
            onClick={() => handleNavigate('badges')}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', cursor: 'pointer' }}
          >
            View All
          </span>
        </div>

        {latestBadge ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px 14px' }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 700, color: '#eef4f8' }}>
              {latestBadge.name}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
              Most Recent
            </div>
          </div>
        ) : (
          <div style={{ padding: '6px 16px 14px' }}>
            <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e' }}>Spot vehicles to earn badges</span>
          </div>
        )}

        {/* ── 5. RECENT SPOT ACTIVITY ── */}
        <div style={{ padding: '0 14px 16px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e', marginBottom: 10 }}>
            Recent Spots
          </div>
          {recentSpots.length > 0 ? (
            <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden' }}>
              {recentSpots.map((spot, i) => (
                <div
                  key={spot.id}
                  onClick={() => handleNavigate('vehicle-detail', { vehicleId: spot.vehicle_id })}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: i < recentSpots.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: '#eef4f8', letterSpacing: '0.06em' }}>
                      {spot.plate_number || [spot.make, spot.model].filter(Boolean).join(' ') || 'Vehicle'}
                    </span>
                    {spot.plate_number && spot.make && (
                      <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#5a6e7e', marginLeft: 8 }}>
                        {spot.make} {spot.model}
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600, color: '#5a6e7e', flexShrink: 0 }}>
                    {timeAgo(spot.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '20px 16px', textAlign: 'center' as const }}>
              <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e' }}>No spots yet</div>
            </div>
          )}
        </div>

        {/* ── 6. LIFETIME RIDES ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px' }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
            Lifetime Rides{retiredVehicles.length > 0 ? ` \u00B7 ${retiredVehicles.length}` : ''}
          </span>
          <div style={{ display: 'flex', gap: 14 }}>
            {retiredVehicles.length > 2 && (
              <span onClick={() => setShowAllRetiredModal(true)} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5a6e7e', cursor: 'pointer' }}>
                View All
              </span>
            )}
            <span onClick={() => setShowAddRetiredVehicle(true)} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', cursor: 'pointer' }}>
              + Add Ride
            </span>
          </div>
        </div>

        {retiredVehicles.length > 0 ? (
          <div style={{ margin: '0 14px 16px' }}>
            <RetiredTimeline vehicles={retiredVehicles} limit={2} />
          </div>
        ) : (
          <div style={{ margin: '0 14px 16px', padding: '20px 16px', background: '#0d1117', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', textAlign: 'center' as const }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3a4e60" strokeWidth="1.2" style={{ marginBottom: 8 }}><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17H3v-6l2-5h9l4 5h3v6h-2"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: '#eef4f8', marginBottom: 2 }}>No Past Rides</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#5a6e7e', marginBottom: 10 }}>Remember vehicles you've owned</div>
            <button onClick={() => setShowAddRetiredVehicle(true)} style={{ background: 'transparent', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316' }}>
              + Add Ride
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
