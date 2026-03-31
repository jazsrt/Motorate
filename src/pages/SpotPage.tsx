import { useState, useRef, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { type OnNavigate } from '../types/navigation';
import { ArrowLeft, Camera, Upload, Car } from 'lucide-react';
import { getVehicleImageUrl } from '../lib/carImageryApi';
import { useWeeklyMetrics } from '../hooks/useWeeklyMetrics';
import { supabase } from '../lib/supabase';
import { VEHICLE_PLATE_VISIBLE_COLUMNS } from '../lib/vehicles';
import { hashPlate } from '../lib/hash';
import { US_STATES } from '../lib/constants';
import { LicensePlate } from '../components/LicensePlate';
import { type VerificationTier } from '../components/TierBadge';
import { PlateSearch } from '../components/PlateSearch';
import { PlateNotFound, type CreateVehicleData } from '../components/PlateNotFound';
import { PlateFoundUnclaimed } from '../components/PlateFoundUnclaimed';
import { PlateFoundClaimed } from '../components/PlateFoundClaimed';
import { VinClaimModal } from '../components/VinClaimModal';
import { CameraModal } from '../components/spot/CameraModal';
import type { SpotWizardData } from '../types/spot';
import { lookupPlate } from '../lib/plateToVinApi';

interface SpotPageProps {
  onNavigate: OnNavigate;
}

interface VehicleResult {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  trim: string | null;
  stock_image_url: string | null;
  is_claimed: boolean;
  verification_tier: VerificationTier;
  owner_id: string | null;
  plate_state: string | null;
  plate_number: string | null;
  created_by_user_id?: string | null;
  owner?: {
    handle: string;
    avatar_url: string | null;
  };
  creator?: {
    handle: string;
    avatar_url: string | null;
  };
}


const cardStyle: React.CSSProperties = {
  background: '#0a0d14',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 10,
};

const cardTitleStyle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
};

const cardSubtitleStyle: React.CSSProperties = {
  fontFamily: "'Barlow', sans-serif",
  fontSize: 11,
  color: '#5a6e7e',
};

const sectionHeaderStyle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: '#7a8e9e',
};

const recentRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 20px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
};

const vehicleNameStyle: React.CSSProperties = {
  fontFamily: "'Rajdhani', sans-serif",
  fontSize: 15,
  fontWeight: 700,
};

const plateTextStyle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 10,
  color: '#5a6e7e',
};

const spotCountStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 14,
  fontWeight: 600,
  color: '#F97316',
};

type ViewState = 'search' | 'not-found' | 'unclaimed' | 'claimed' | 'loading' | 'revealing';

export function SpotPage({ onNavigate }: SpotPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const weeklyMetrics = useWeeklyMetrics(user?.id);
  const [viewState, setViewState] = useState<ViewState>('search');
  const [state, setState] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [plateHash, setPlateHash] = useState('');
  const [vehicle, setVehicle] = useState<VehicleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [recentSpots, setRecentSpots] = useState<any[]>([]);
  const [weeklySpots, setWeeklySpots] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [weekTotal, setWeekTotal] = useState(0);
  const [revealPhase, setRevealPhase] = useState(0);
  const [revealResult, setRevealResult] = useState<{ vehicle: VehicleResult | null; found: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadWeeklySpots() {
      if (!user) return;
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);

      try {
        const { data } = await supabase
          .from('spot_history')
          .select('created_at')
          .eq('spotter_id', user.id)
          .gte('created_at', monday.toISOString())
          .order('created_at', { ascending: true });

        if (data) {
          const counts = [0, 0, 0, 0, 0, 0, 0];
          data.forEach(spot => {
            const d = new Date(spot.created_at);
            const dayIdx = (d.getDay() + 6) % 7;
            counts[dayIdx]++;
          });
          setWeeklySpots(counts);
          setWeekTotal(data.length);
        }
      } catch (err) {
        console.error('Error loading weekly spots:', err);
      }
    }

    async function loadRecentSpots() {
      try {
        const { data } = await supabase
          .from('spot_history')
          .select(`
            id,
            created_at,
            vehicle:vehicles(
              id,
              make,
              model,
              year,
              color,
              plate_state,
              plate_number,
              profile_image_url,
              stock_image_url
            )
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (data) {
          setRecentSpots(data.filter(s => s.vehicle));
        }
      } catch (error) {
        console.error('Error loading recent spots:', error);
      }
    }

    loadRecentSpots();
    loadWeeklySpots();
  }, [user]);

  // Reveal animation phases with proper cleanup
  useEffect(() => {
    if (viewState !== 'revealing') return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    timeouts.push(setTimeout(() => setRevealPhase(2), 400));
    timeouts.push(setTimeout(() => setRevealPhase(3), 900));
    timeouts.push(setTimeout(() => {
      setRevealPhase(4);
      timeouts.push(setTimeout(() => {
        if (revealResult?.found && revealResult.vehicle) {
          setViewState(revealResult.vehicle.is_claimed ? 'claimed' : 'unclaimed');
        } else {
          setViewState('not-found');
        }
      }, 400));
    }, 1400));
    return () => timeouts.forEach(t => clearTimeout(t));
  }, [viewState, revealResult]);

  const handleSearch = async (searchState: string, searchPlate: string) => {
    if (!searchPlate.trim()) return;

    const normalizedPlate = searchPlate.trim().toUpperCase().replace(/[\s-]/g, '');
    if (normalizedPlate.length < 2 || normalizedPlate.length > 8) {
      showToast('Please enter a valid plate number (2-8 characters)', 'error');
      return;
    }
    if (!/^[A-Z0-9]+$/.test(normalizedPlate)) {
      showToast('Plate numbers can only contain letters and numbers', 'error');
      return;
    }

    setState(searchState);
    setPlateNumber(searchPlate);
    setViewState('loading');
    setVehicle(null);

    try {
      const stateObj = US_STATES.find(s => s.name.toLowerCase() === searchState.toLowerCase());
      const code = stateObj?.code || searchState;
      setStateCode(code);

      const hash = await hashPlate(code, searchPlate.trim().toUpperCase());
      setPlateHash(hash);

      // PLATE: visible — spot flow confirmation
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select(VEHICLE_PLATE_VISIBLE_COLUMNS + `, owner:profiles!vehicles_owner_id_fkey(handle, avatar_url)`)
        .eq('plate_hash', hash)
        .maybeSingle();

      if (vehicleError) {
        showToast('Search failed: ' + vehicleError.message, 'error');
        setViewState('search');
        return;
      }

      if (vehicleData) {
        // Found in DB — trigger reveal animation
        setRevealResult({ vehicle: vehicleData as unknown as VehicleResult, found: true });
        setVehicle(vehicleData as unknown as VehicleResult);
        setViewState('revealing');
        setRevealPhase(1);
      } else {
        // Not in DB — try Auto.dev plate lookup
        const apiResult = await lookupPlate(searchPlate.trim().toUpperCase(), code, user?.id);

        if (apiResult && apiResult.make && apiResult.model) {
          // Auto.dev returned vehicle data — fetch stock image in parallel, show confirm screen
          const stockImageUrl = await getVehicleImageUrl(apiResult.make, apiResult.model, apiResult.year ? parseInt(apiResult.year) : undefined, apiResult.color || undefined);
          const wizardData: SpotWizardData = {
            plateState: code,
            plateNumber: searchPlate.trim().toUpperCase(),
            plateHash: hash,
            make: apiResult.make,
            model: apiResult.model,
            color: apiResult.color || '',
            year: apiResult.year || undefined,
            trim: apiResult.trim || undefined,
            stockImageUrl: stockImageUrl || undefined,
          };
          onNavigate('confirm-vehicle', { wizardData });
        } else {
          // Auto.dev returned nothing — show not-found state for manual entry
          setRevealResult({ vehicle: null, found: false });
          setViewState('revealing');
          setRevealPhase(1);
        }
      }
    } catch {
      showToast('Failed to search. Please try again.', 'error');
      setViewState('search');
    }
  };

  const handleCreateVehicle = async (vehicleData: CreateVehicleData) => {
    if (!user) {
      showToast('Please log in to create a vehicle profile', 'error');
      return;
    }

    setLoading(true);
    try {
      // Fetch stock image in parallel with vehicle creation
      const stockImagePromise = getVehicleImageUrl(vehicleData.make, vehicleData.model, vehicleData.year ?? undefined, vehicleData.color || undefined);

      const { data: newVehicle, error: createError } = await supabase
        .from('vehicles')
        .insert({
          plate_hash: plateHash,
          plate_state: stateCode,
          plate_number: plateNumber.trim().toUpperCase(),
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          color: vehicleData.color,
          owner_id: null,
          is_claimed: false,
          verification_tier: 'shadow',
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (createError) {
        showToast('Failed to create vehicle: ' + createError.message, 'error');
        return;
      }

      const stockImageUrl = await stockImagePromise;

      // Update vehicle with stock image if found
      if (stockImageUrl) {
        await supabase.from('vehicles').update({ stock_image_url: stockImageUrl }).eq('id', newVehicle.id);
      }

      const wizardData: SpotWizardData = {
        plateState: stateCode,
        plateNumber: plateNumber.trim().toUpperCase(),
        plateHash,
        vehicleId: newVehicle.id,
        make: vehicleData.make,
        model: vehicleData.model,
        color: vehicleData.color || '',
        year: vehicleData.year ? String(vehicleData.year) : undefined,
        stockImageUrl: stockImageUrl || undefined,
      };

      onNavigate('quick-spot-review', { wizardData });
    } catch {
      showToast('Failed to create vehicle. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setViewState('search');
    setVehicle(null);
    setState('');
    setStateCode('');
    setPlateNumber('');
    setPlateHash('');
  };

  const handleSpotAndReview = () => {
    if (!vehicle) return;
    if (!user) {
      showToast('Please log in to spot vehicles', 'error');
      return;
    }

    const wizardData: SpotWizardData = {
      plateState: stateCode,
      plateNumber,
      plateHash,
      vehicleId: vehicle.id,
      make: vehicle.make || '',
      model: vehicle.model || '',
      color: vehicle.color || '',
      year: vehicle.year ? String(vehicle.year) : undefined,
      trim: vehicle.trim || undefined,
      stockImageUrl: vehicle.stock_image_url || undefined,
    };

    onNavigate('quick-spot-review', { wizardData });
  };

  const handleClaimVehicle = () => {
    if (!vehicle) return;
    if (!user) {
      showToast('Please log in to claim this vehicle', 'error');
      return;
    }
    setShowClaimModal(true);
  };

  const handleUploadPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    showToast('Photo uploaded - OCR processing is available via camera scan', 'info');
    e.target.value = '';
  };

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      {viewState === 'search' && (
        <div>
          {/* Header */}
          <div style={{ padding: '52px 16px 20px', background: '#0a0d14', borderBottom: '1px solid rgba(249,115,22,0.10)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={() => onNavigate('feed')} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(3,5,8,0.7)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ArrowLeft size={14} color="#eef4f8" strokeWidth={2} />
              </button>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316' }}>Step 1 of 3</span>
            </div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', lineHeight: 1, marginBottom: 12 }}>Find the Vehicle</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'rgba(249,115,22,0.40)' }} />
              <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>
          </div>

          {/* Recently spotted strip */}
          {(() => {
            const spotsWithImages = recentSpots.filter(s => {
              const v = s.vehicle;
              return v && (v.profile_image_url || v.stock_image_url);
            });
            if (spotsWithImages.length === 0) return null;
            return (
              <div style={{ display: 'flex', gap: 8, padding: '10px 16px', overflowX: 'auto', scrollbarWidth: 'none' as const, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {spotsWithImages.map((spot: any) => {
                  const v = spot.vehicle;
                  const imgUrl = v.profile_image_url || v.stock_image_url;
                  return (
                    <button key={spot.id} onClick={() => onNavigate('vehicle-detail', v.id)} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <div style={{ width: 70, height: 52, borderRadius: 6, overflow: 'hidden', background: '#111720' }}>
                        <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, textTransform: 'uppercase' as const, color: '#5a6e7e' }}>{v.make}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* Form area */}
          <div style={{ padding: 16 }}>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

            {/* Pro upgrade hint */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, textTransform: 'uppercase', color: '#5a6e7e' }}>Auto-identify from plate · </span>
              <span
                onClick={() => onNavigate('premium')}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, textTransform: 'uppercase', color: '#F97316', cursor: 'pointer' }}
              >Upgrade to Pro</span>
            </div>

            <PlateSearch
              initialPlate={plateNumber}
              onSearch={handleSearch}
              onCameraScan={() => setShowCameraModal(true)}
              onNavigateToVehicle={(vehicleId) => onNavigate('vehicle-detail', vehicleId)}
            />

            {/* "or" divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#3a4e60' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
            </div>

            {/* Camera button */}
            <button
              onClick={() => setShowCameraModal(true)}
              style={{ padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, background: 'transparent', cursor: 'pointer', width: '100%' }}
            >
              <Camera size={18} color="#5a6e7e" />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7a8e9e' }}>Scan plate with camera</span>
            </button>
          </div>
        </div>
      )}

      {showCameraModal && (
        <CameraModal
          onClose={() => setShowCameraModal(false)}
          onPlateDetected={(detected) => {
            setShowCameraModal(false);
            setPlateNumber(detected.toUpperCase());
          }}
        />
      )}

      {viewState === 'loading' && (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: '2px solid rgba(249,115,22,0.2)',
              borderTopColor: '#f97316',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ fontSize: 14, color: '#8a9aaa' }}>
            Searching {state} — <span style={{ fontWeight: 600, color: '#eef4f8', letterSpacing: 2 }}>{plateNumber}</span>
          </p>
        </div>
      )}

      {viewState === 'revealing' && (
        <div style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          {/* Phase 1: Plate slides in */}
          <div
            style={{
              opacity: revealPhase >= 1 ? 1 : 0,
              transform: revealPhase >= 1 ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.9)',
              transition: 'all 0.5s cubic-bezier(.25,.46,.45,.94)',
            }}
          >
            <LicensePlate plateNumber={plateNumber} plateState={stateCode} size="lg" />
          </div>

          {/* Phase 2: Scanning line */}
          {revealPhase >= 2 && revealPhase < 4 && (
            <div
              style={{
                width: 192,
                height: 2,
                borderRadius: 9999,
                background: 'linear-gradient(90deg, transparent, #F97316, transparent)',
                animation: 'plate-scan 0.8s ease-in-out infinite',
              }}
            />
          )}

          {/* Phase 3: Result text */}
          <div
            style={{
              opacity: revealPhase >= 3 ? 1 : 0,
              transform: revealPhase >= 3 ? 'translateY(0)' : 'translateY(10px)',
              transition: 'all 0.4s cubic-bezier(.25,.46,.45,.94)',
              textAlign: 'center',
            }}
          >
            <p style={{
              fontSize: 14,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              color: '#F97316',
            }}>
              {revealResult?.found ? 'Vehicle Found' : 'New Plate Detected'}
            </p>
            {revealResult?.found && revealResult.vehicle && (
              <p style={{ fontSize: 12, color: '#8a9aaa', marginTop: 4 }}>
                {revealResult.vehicle.year} {revealResult.vehicle.make} {revealResult.vehicle.model}
              </p>
            )}
          </div>
        </div>
      )}

      {viewState !== 'search' && viewState !== 'loading' && (
        <div style={{ padding: '16px 16px 0' }}>
          <button
            onClick={handleBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 16,
              color: '#8a9aaa',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} strokeWidth={1.5} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase' as const,
            }}>Back to Search</span>
          </button>
        </div>
      )}

      {viewState === 'not-found' && (
        <PlateNotFound
          state={state}
          plateNumber={plateNumber}
          onCancel={handleBack}
          onCreate={handleCreateVehicle}
          onClaimVehicle={() => {
            if (!user) {
              showToast('Please log in to claim a vehicle', 'error');
              return;
            }
            showToast('Please create the vehicle profile first', 'info');
          }}
          loading={loading}
        />
      )}

      {viewState === 'unclaimed' && vehicle && (
        <PlateFoundUnclaimed
          state={state}
          plateNumber={plateNumber}
          vehicle={vehicle}
          onSpotAndReview={handleSpotAndReview}
          onClaimVehicle={handleClaimVehicle}
          onViewVehicle={(vehicleId) => onNavigate('vehicle-detail', vehicleId)}
          isLoggedIn={!!user}
        />
      )}

      {viewState === 'claimed' && vehicle && (
        <PlateFoundClaimed
          state={state}
          plateNumber={plateNumber}
          vehicle={vehicle as unknown as Parameters<typeof PlateFoundClaimed>[0]['vehicle']}
          onLeaveReview={handleSpotAndReview}
          onBack={handleBack}
          onViewOwnerProfile={(userId) => onNavigate('user-profile', userId)}
          onViewVehicle={(vehicleId) => onNavigate('vehicle-detail', vehicleId)}
        />
      )}

      {showClaimModal && vehicle && user && (
        <VinClaimModal
          vehicleId={vehicle.id}
          vehicleInfo={{
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color,
            plateState: stateCode,
            plateNumber: plateNumber,
          }}
          onClose={() => {
            setShowClaimModal(false);
            handleSearch(state, plateNumber);
          }}
          onSuccess={() => {
            setShowClaimModal(false);
            showToast('Vehicle verified via VIN!', 'success');
            handleSearch(state, plateNumber);
          }}
        />
      )}
    </Layout>
  );
}
