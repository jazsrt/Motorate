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
      <div className="h-[200px] relative overflow-hidden">
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
  const { user } = useAuth();
  const { showToast } = useToast();

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

  useEffect(() => {
    if (user) {
      loadGarageData();
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
      .select('vehicle_id, sticker_name, count')
      .in('vehicle_id', vehicleIds)
      .order('count', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const grouped: Record<string, { name: string; count: number }[]> = {};
        data.forEach((row: any) => {
          if (!grouped[row.vehicle_id]) grouped[row.vehicle_id] = [];
          grouped[row.vehicle_id].push({ name: row.sticker_name, count: row.count });
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
                <div className="absolute -left-[18px] top-3 w-4 h-4 rounded-full bg-bg border-2 border-orange z-10" />
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
                          <Car className="w-8 h-8 text-quaternary opacity-40" strokeWidth={1.2} />
                        </div>
                      )}
                    </div>
                  ) : stockUrl ? (
                    <div className="h-28 overflow-hidden">
                      <img src={stockUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-24 bg-gradient-to-br from-surface-2 to-surface-3 flex items-center justify-center">
                      <Car className="w-10 h-10 text-quaternary opacity-30" strokeWidth={1.2} />
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
      <div className="pb-24 page-enter">

        {/* FLEET OVERVIEW */}
        {vehicles.length > 0 && (
          <>
            <div className="slbl stg">Fleet Overview</div>
            <div className="card-v3 card-v3-lift mx-4 mb-4 p-4 stg v3-stagger v3-stagger-1">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Vehicles', value: fleetStats.vehicleCount },
                  { label: 'Avg Rating', value: fleetStats.avgRating },
                  { label: 'Spots', value: fleetStats.totalSpots },
                  { label: 'Stickers', value: fleetStats.totalStickers },
                ].map(stat => (
                  <div key={stat.label} className="text-center">
                    <div className="font-mono text-[18px] font-semibold text-primary leading-none">
                      {stat.value}
                    </div>
                    <div className="text-[8px] font-medium uppercase tracking-[2px] text-quaternary mt-1">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* YOUR PLATES */}
        {vehicles.length > 0 ? (
          <>
            <div className="slbl stg">Your {vehicles.length === 1 ? 'Plate' : 'Plates'} · {vehicles.length}</div>
            {vehicles.map(vehicle => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                stickers={vehicleStickerCounts[vehicle.id] || []}
                stockImages={stockImages}
                onNavigate={handleNavigate}
                onPhotosUpdated={() => loadVehicles()}
              />
            ))}

            {/* Claim Next Plate CTA */}
            <div
              className="card-v3 card-v3-lift mx-4 mb-4 flex items-center gap-3 px-4 py-4 cursor-pointer active:opacity-80"
              onClick={() => setShowClaimSearch(true)}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-accent-dim">
                <Plus className="w-[18px] h-[18px] text-orange" strokeWidth={1.2} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-primary">Claim your next plate</p>
                <p className="text-[8px] mt-0.5 text-quaternary">Add another vehicle to your garage</p>
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
