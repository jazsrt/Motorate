import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Car, Crosshair, X, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Layout } from '../components/Layout';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { AddRetiredVehicleModal } from '../components/AddRetiredVehicleModal';
import { RetireVehicleModal } from '../components/RetireVehicleModal';
import { getVehicleImageUrl } from '../lib/carImageryApi';
import type { GarageVehicle } from '../types/garage';
import { VEHICLE_OWNER_COLUMNS } from '../lib/vehicles';

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
  const [stockImages, setStockImages] = useState<Record<string, string>>({});
  const [, setUserBadgesForGarage] = useState<any[]>([]);
  const [retiredStockImages, setRetiredStockImages] = useState<Record<string, string>>({});


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

  // Removed FleetTile + RetiredTimeline — replaced with inline image rows

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

        {/* ── 1. FLEET HERO ── */}
        <div style={{ position: 'relative', width: '100%', height: 260, minHeight: 200, overflow: 'hidden' }}>
          {heroImage ? (
            <img src={heroImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0a0d14, #070a0f)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car style={{ width: 48, height: 48, color: '#1e2a38' }} strokeWidth={1.2} />
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.97) 0%, rgba(3,5,8,0.5) 50%, transparent 100%)' }} />
          <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 2, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div
              onClick={() => user && handleNavigate('profile')}
              style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: '#1e2a38', flexShrink: 0, cursor: 'pointer', border: '2px solid rgba(249,115,22,0.4)' }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} color="#5a6e7e" />
                </div>
              )}
            </div>
            <div>
              <div
                onClick={() => user && handleNavigate('profile')}
                style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#eef4f8', lineHeight: 1, cursor: 'pointer' }}
              >
                @{handle}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 3 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, color: '#F97316', fontVariantNumeric: 'tabular-nums' }}>
                  {(userProfile?.reputation_score ?? totalRP).toLocaleString()}
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#F97316' }}>RP</span>
                {userProfile?.reputation_tier && (
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5a6e7e', marginLeft: 4 }}>{userProfile.reputation_tier}</span>
                )}
              </div>
            </div>
          </div>
          {!heroImage && vehicles.length === 0 && (
            <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 2 }}>
              <button
                onClick={() => handleNavigate('search')}
                style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#F97316' }}
              >
                Claim Your First Vehicle
              </button>
            </div>
          )}
        </div>

        {/* ── 2. STAT STRIP ── */}
        <div style={{ display: 'flex', background: '#0a0d14', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {[
            { label: 'RP', value: (userProfile?.reputation_score ?? totalRP).toLocaleString(), accent: true },
            { label: 'Vehicles', value: vehicles.length, accent: false },
            { label: 'Spots', value: userSpotCount, accent: false },
            { label: 'Badges', value: badgeCount, accent: false },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{
              flex: 1, padding: '12px 0', textAlign: 'center' as const,
              borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, color: stat.accent ? '#F97316' : '#eef4f8', display: 'block', fontVariantNumeric: 'tabular-nums' }}>{stat.value}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: stat.accent ? '#F97316' : '#3a4e60', display: 'block', marginTop: 2 }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ── 3. FLEET — full-width image rows ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 6px' }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
            Fleet{vehicles.length > 0 ? ` \u00B7 ${vehicles.length}` : ''}
          </span>
        </div>

        {vehicles.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
            {vehicles.map(vehicle => {
              const img = (vehicle as any).profile_image_url || vehicle.stock_image_url || stockImages[vehicle.id];
              const vHandle = (vehicle as any).vehicle_handle;
              const isPending = (vehicle as any)._claimStatus === 'pending' || (vehicle.verification_tier as string) === 'pending';
              const isVerified = vehicle.verification_tier === 'vin_verified';
              const isClaimed = !isPending && (vehicle.owner_id || vehicle.is_claimed);
              const statusLabel = isPending ? 'Pending' : isVerified ? 'Verified' : isClaimed ? 'Claimed' : 'Unclaimed';
              const statusColor = isPending ? '#F97316' : (isVerified || isClaimed) ? '#20c060' : '#5a6e7e';
              const spotCount = (vehicle as any).spot_count ?? (vehicle as any).spots_count ?? 0;
              const rp = (vehicle as any).reputation_score ?? 0;

              return (
                <div
                  key={vehicle.id}
                  onClick={() => handleNavigate('vehicle-detail', { vehicleId: vehicle.id })}
                  style={{ position: 'relative', width: '100%', height: 140, minHeight: 140, overflow: 'hidden', cursor: 'pointer', background: '#0a0d14' }}
                >
                  {img ? (
                    <img src={img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0d1117, #070a0f)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Car style={{ width: 36, height: 36, color: '#1e2a38' }} strokeWidth={1.2} />
                    </div>
                  )}
                  {/* Left gradient for text legibility */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(3,5,8,0.85) 0%, rgba(3,5,8,0.4) 50%, transparent 100%)' }} />
                  {/* Bottom gradient */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.7) 0%, transparent 50%)' }} />

                  {/* Status badge top-right */}
                  <div style={{
                    position: 'absolute', top: 8, right: 8, zIndex: 3,
                    background: 'rgba(3,5,8,0.8)', border: `1px solid ${statusColor}40`, borderRadius: 3,
                    padding: '2px 7px',
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: statusColor,
                  }}>
                    {statusLabel}
                  </div>

                  {/* Bottom-left content */}
                  <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, zIndex: 2 }}>
                    {vHandle && (
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: '#F97316', letterSpacing: '0.06em', lineHeight: 1, marginBottom: 2 }}>
                        @{vHandle}
                      </div>
                    )}
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
                      {vehicle.model || vehicle.make}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      {vehicle.year && (
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: '#7a8e9e' }}>{vehicle.year}</span>
                      )}
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: '#F97316', fontVariantNumeric: 'tabular-nums' }}>
                        {rp.toLocaleString()} RP
                      </span>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
                        {spotCount} Spots
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '32px 24px', textAlign: 'center' as const }}>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e' }}>No vehicles claimed yet</div>
          </div>
        )}

        {/* ── 4. LIFETIME RIDES (retired) ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 6px' }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
            Lifetime Rides{retiredVehicles.length > 0 ? ` \u00B7 ${retiredVehicles.length}` : ''}
          </span>
          <span onClick={() => setShowAddRetiredVehicle(true)} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', cursor: 'pointer' }}>
            + Add Past Vehicle
          </span>
        </div>

        {retiredVehicles.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
            {retiredVehicles.map(rv => {
              const rvImg = rv.photo_url_1 || retiredStockImages[rv.id];
              return (
                <div key={rv.id} style={{ position: 'relative', width: '100%', height: 120, overflow: 'hidden', background: '#0a0d14' }}>
                  {rvImg ? (
                    <img src={rvImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'saturate(0.4) brightness(0.7)' }} />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0d1117, #070a0f)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Car style={{ width: 32, height: 32, color: '#1e2a38', opacity: 0.5 }} strokeWidth={1.2} />
                    </div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(3,5,8,0.85) 0%, rgba(3,5,8,0.3) 60%, transparent 100%)' }} />

                  {/* Retired tag top-right */}
                  <div style={{
                    position: 'absolute', top: 8, right: 8, zIndex: 3,
                    background: 'rgba(3,5,8,0.8)', border: '1px solid rgba(90,110,126,0.3)', borderRadius: 3,
                    padding: '2px 7px',
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5a6e7e',
                  }}>
                    Retired
                  </div>

                  <div style={{ position: 'absolute', bottom: 10, left: 12, zIndex: 2 }}>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#a8bcc8', lineHeight: 1 }}>
                      {rv.year ? `${rv.year} ` : ''}{rv.model || rv.make}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, color: '#5a6e7e' }}>{rv.make}</span>
                      {rv.ownership_period && (
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 600, color: '#3a4e60' }}>{rv.ownership_period}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '20px 16px', textAlign: 'center' as const }}>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#3a4e60' }}>No past rides added yet</div>
          </div>
        )}

        {/* ── 5. RECENT ACTIVITY ── */}
        <div style={{ padding: '16px 0 0' }}>
          <div style={{ padding: '0 16px 8px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
            Recent Activity
          </div>
          {recentSpots.length > 0 ? (
            <div>
              {recentSpots.slice(0, 8).map((spot, i) => (
                <div
                  key={spot.id}
                  onClick={() => handleNavigate('vehicle-detail', { vehicleId: spot.vehicle_id })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}
                >
                  <Crosshair size={12} color="#F97316" style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#eef4f8', flex: 1 }}>
                    Spotted {[spot.make, spot.model].filter(Boolean).join(' ') || spot.plate_number || 'vehicle'}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a4e60', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {timeAgo(spot.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '16px', textAlign: 'center' as const }}>
              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#3a4e60' }}>No recent activity</span>
            </div>
          )}
        </div>

        {/* ── 6. BADGES (compact) ── */}
        {badgeCount > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
                Badges · {badgeCount}
              </span>
              <span
                onClick={() => handleNavigate('badges')}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', cursor: 'pointer' }}
              >
                View All
              </span>
            </div>
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowAllRetiredModal(false)}
        >
          <div
            style={{ position: 'relative', width: '100%', maxWidth: 512, background: '#070a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden', maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#eef4f8' }}>Lifetime Rides · {retiredVehicles.length}</span>
              <button onClick={() => setShowAllRetiredModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)' }}>
                <X style={{ width: 16, height: 16, color: '#9ab0c0' }} />
              </button>
            </div>
            <div style={{ overflowY: 'auto' as const, maxHeight: 'calc(85vh - 60px)' }}>
              {retiredVehicles.map(rv => {
                const rvImg = rv.photo_url_1 || retiredStockImages[rv.id];
                return (
                  <div key={rv.id} style={{ position: 'relative', width: '100%', height: 120, overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {rvImg ? (
                      <img src={rvImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.4) brightness(0.7)' }} />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Car style={{ width: 32, height: 32, color: '#1e2a38', opacity: 0.5 }} strokeWidth={1.2} />
                      </div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(3,5,8,0.85) 0%, transparent 100%)' }} />
                    <div style={{ position: 'absolute', bottom: 10, left: 12, zIndex: 2 }}>
                      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#a8bcc8', lineHeight: 1 }}>{rv.year ? `${rv.year} ` : ''}{rv.model || rv.make}</div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, color: '#5a6e7e', marginTop: 2 }}>{rv.make}{rv.ownership_period ? ` · ${rv.ownership_period}` : ''}</div>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => { setShowAllRetiredModal(false); setShowAddRetiredVehicle(true); }}
                style={{ width: '100%', padding: '14px 0', background: 'none', border: 'none', borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Plus style={{ width: 12, height: 12 }} /> Add Past Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
