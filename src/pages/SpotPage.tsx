import { useState, useRef, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { type OnNavigate } from '../types/navigation';
import { ArrowLeft, Camera, Upload, Keyboard, Car, Zap } from 'lucide-react';
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
              plate_number
            )
          `)
          .order('created_at', { ascending: false })
          .limit(8);

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
        setRevealResult({ vehicle: vehicleData as VehicleResult, found: true });
        setVehicle(vehicleData as VehicleResult);
        setViewState('revealing');
        setRevealPhase(1);
      } else {
        // Not in DB — try Auto.dev plate lookup
        const apiResult = await lookupPlate(searchPlate.trim().toUpperCase(), code);

        if (apiResult && apiResult.make && apiResult.model) {
          // Auto.dev returned vehicle data — fetch stock image in parallel, show confirm screen
          const stockImageUrl = await getVehicleImageUrl(apiResult.make, apiResult.model, apiResult.year ? parseInt(apiResult.year) : undefined);
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
    } catch (err: any) {
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
      const stockImagePromise = getVehicleImageUrl(vehicleData.make, vehicleData.model, vehicleData.year ?? undefined);

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
    } catch (err: any) {
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
        <div style={{ maxWidth: 512, margin: '0 auto', padding: '24px 16px' }} className="page-enter">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }} className="stg">
            <button
              onClick={() => setShowCameraModal(true)}
              style={{
                ...cardStyle,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                padding: 20,
                cursor: 'pointer',
              }}
            >
              <Camera style={{ width: 28, height: 28, color: '#F97316' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={cardTitleStyle}>Scan a Plate</p>
                <p style={{ ...cardSubtitleStyle, marginTop: 2 }}>Camera + OCR</p>
              </div>
            </button>

            <button
              onClick={handleUploadPhoto}
              style={{
                ...cardStyle,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                padding: 20,
                cursor: 'pointer',
              }}
            >
              <Upload style={{ width: 28, height: 28, color: '#F97316' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={cardTitleStyle}>Upload Photo</p>
                <p style={{ ...cardSubtitleStyle, marginTop: 2 }}>Auto-fill with OCR</p>
              </div>
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

          {user && (
            <div
              className="stg"
              style={{
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
                background: 'linear-gradient(180deg, #1c1814 0%, rgba(28,24,20,0.5) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={sectionHeaderStyle}>This Week's Run</span>
                <span style={{ fontSize: 8, color: '#6a7486' }}>
                  Personal best: <span style={{ color: '#F97316' }}>{weeklyMetrics.bestWeekSpots > 0 ? weeklyMetrics.bestWeekSpots : '—'}</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60, marginBottom: 8 }}>
                {weeklySpots.map((count, i) => {
                  const maxCount = Math.max(...weeklySpots, 1);
                  const height = count > 0 ? Math.max(15, (count / maxCount) * 100) : 4;
                  const currentDayIdx = (new Date().getDay() + 6) % 7;
                  const isToday = i === currentDayIdx;
                  const isPast = i < currentDayIdx;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${height}%`,
                          minHeight: 4,
                          background: isToday ? '#F97316' : isPast ? 'rgba(249,115,22,0.4)' : '#302c24',
                          borderRadius: 3,
                          transition: 'all 0.3s',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
                  const currentDayIdx = (new Date().getDay() + 6) % 7;
                  return (
                    <span
                      key={i}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        fontSize: 7,
                        color: i === currentDayIdx ? '#F97316' : '#6a7486',
                        fontWeight: i === currentDayIdx ? 600 : 300,
                      }}
                    >
                      {d}
                    </span>
                  );
                })}
              </div>
              <p style={{ fontSize: 9, textAlign: 'center', color: '#909aaa' }}>
                <strong style={{ color: '#f2f4f7' }}>{weeklySpots[(new Date().getDay() + 6) % 7]}</strong> spots today · <strong style={{ color: '#f2f4f7' }}>{weekTotal}</strong> this week
              </p>
            </div>
          )}

          <PlateSearch
            initialPlate={plateNumber}
            onSearch={handleSearch}
            onCameraScan={() => setShowCameraModal(true)}
            onNavigateToVehicle={(vehicleId) => onNavigate('vehicle-detail', vehicleId)}
          />

          <div style={{ marginTop: 48 }} className="stg">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              <span style={sectionHeaderStyle}>
                Recent Spots
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            </div>

            {recentSpots.length > 0 ? (
              <div>
                {recentSpots.map((spot) => {
                  const v = spot.vehicle;
                  if (!v || !v.make || !v.model) return null;
                  return (
                    <button
                      key={spot.id}
                      onClick={() => onNavigate('vehicle-detail', v.id)}
                      style={{
                        ...recentRowStyle,
                        width: '100%',
                        background: 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                        <div style={vehicleNameStyle}>
                          {v.year} {v.make} {v.model}
                        </div>
                        <div style={{ ...plateTextStyle, marginTop: 2 }}>
                          {v.plate_state} • {v.plate_number}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={spotCountStyle}>1</div>
                        <div style={{ fontSize: 9, textTransform: 'uppercase' as const, color: '#4a5568', letterSpacing: '0.5px' }}>
                          spot
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '32px 16px',
                borderRadius: 12,
                background: '#0a0d14',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <Car style={{ width: 32, height: 32, margin: '0 auto 12px', color: '#3a4e60' }} strokeWidth={1.5} />
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: '#8a9aaa' }}>
                  No recent spots yet
                </p>
                <p style={{ fontSize: 12, color: '#5a6e7e' }}>
                  Be the first to spot a ride in your area
                </p>
              </div>
            )}
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
          vehicle={vehicle as any}
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
