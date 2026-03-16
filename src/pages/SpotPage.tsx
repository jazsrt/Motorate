import { useState, useRef, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { type OnNavigate } from '../types/navigation';
import { ArrowLeft, Camera, Upload, Keyboard, Car, Zap } from 'lucide-react';
import { getVehicleImageUrl } from '../lib/carImageryApi';
import { useWeeklyMetrics } from '../hooks/useWeeklyMetrics';
import { supabase } from '../lib/supabase';
import { hashPlate } from '../lib/hash';
import { type VerificationTier } from '../components/TierBadge';
import { PlateSearch } from '../components/PlateSearch';
import { PlateNotFound, type CreateVehicleData } from '../components/PlateNotFound';
import { PlateFoundUnclaimed } from '../components/PlateFoundUnclaimed';
import { PlateFoundClaimed } from '../components/PlateFoundClaimed';
import { VinClaimModal } from '../components/VinClaimModal';
import { CameraModal } from '../components/spot/CameraModal';
import type { SpotWizardData } from '../types/spot';

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

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

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
    loadRecentSpots();
    loadWeeklySpots();
  }, []);

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

  const handleSearch = async (searchState: string, searchPlate: string) => {
    if (!searchPlate.trim()) return;

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

      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select(`
          id, make, model, year, color, trim, stock_image_url,
          is_claimed, verification_tier, owner_id, plate_state, plate_number,
          created_by_user_id,
          owner:profiles!vehicles_owner_id_fkey(handle, avatar_url),
          creator:profiles!vehicles_created_by_user_id_fkey(handle, avatar_url)
        `)
        .eq('plate_hash', hash)
        .maybeSingle();

      if (vehicleError) {
        showToast('Search failed: ' + vehicleError.message, 'error');
        setViewState('search');
        return;
      }

      // Trigger plate reveal animation
      setRevealResult({
        vehicle: vehicleData as VehicleResult | null,
        found: !!vehicleData,
      });
      if (vehicleData) setVehicle(vehicleData as VehicleResult);
      setViewState('revealing');
      setRevealPhase(1);
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
        <div className="max-w-lg mx-auto px-4 py-6 page-enter">
          <div className="grid grid-cols-2 gap-3 mb-8 stg">
            <button
              onClick={() => setShowCameraModal(true)}
              className="flex flex-col items-center gap-3 p-5 hover:border-accent-primary/60 transition-all active:scale-95 group"
              style={{ background: 'var(--carbon-2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px' }}
            >
              <Camera style={{ width: '28px', height: '28px', color: 'var(--accent)' }} />
              <div className="text-center">
                <p style={{ fontFamily: 'var(--font-cond)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scan a Plate</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--dim)' }} className="mt-0.5">Camera + OCR</p>
              </div>
            </button>

            <button
              onClick={handleUploadPhoto}
              className="flex flex-col items-center gap-3 p-5 hover:border-accent-primary/60 transition-all active:scale-95 group"
              style={{ background: 'var(--carbon-2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px' }}
            >
              <Upload style={{ width: '28px', height: '28px', color: 'var(--accent)' }} />
              <div className="text-center">
                <p style={{ fontFamily: 'var(--font-cond)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Upload Photo</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--dim)' }} className="mt-0.5">Auto-fill with OCR</p>
              </div>
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          {user && (
            <div
              className="rounded-xl p-4 mb-6 stg"
              style={{ background: 'linear-gradient(180deg, #1c1814 0%, rgba(28,24,20,0.5) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontFamily: 'var(--font-cond)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>This Week's Run</span>
                <span className="text-[8px]" style={{ color: '#6a7486' }}>
                  Personal best: <span style={{ color: '#F97316' }}>{weeklyMetrics.bestWeekSpots > 0 ? weeklyMetrics.bestWeekSpots : '—'}</span>
                </span>
              </div>
              <div className="flex items-end gap-1.5 h-[60px] mb-2">
                {weeklySpots.map((count, i) => {
                  const maxCount = Math.max(...weeklySpots, 1);
                  const height = count > 0 ? Math.max(15, (count / maxCount) * 100) : 4;
                  const currentDayIdx = (new Date().getDay() + 6) % 7;
                  const isToday = i === currentDayIdx;
                  const isPast = i < currentDayIdx;
                  return (
                    <div key={i} className="flex-1 flex items-end justify-center">
                      <div
                        className="w-full rounded-sm transition-all"
                        style={{
                          height: `${height}%`,
                          minHeight: '4px',
                          background: isToday ? '#F97316' : isPast ? 'rgba(249,115,22,0.4)' : '#302c24',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mb-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
                  const currentDayIdx = (new Date().getDay() + 6) % 7;
                  return (
                    <span
                      key={i}
                      className="flex-1 text-center text-[7px]"
                      style={{ color: i === currentDayIdx ? '#F97316' : '#6a7486', fontWeight: i === currentDayIdx ? 600 : 300 }}
                    >
                      {d}
                    </span>
                  );
                })}
              </div>
              <p className="text-[9px] text-center" style={{ color: '#909aaa' }}>
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

          <div className="mt-12 stg">
            <div className="relative flex items-center gap-4 mb-6">
              <div className="flex-1 h-px" style={{ background: 'var(--border-2)' }} />
              <span style={{ fontFamily: 'var(--font-cond)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Recent Spots
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border-2)' }} />
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
                      className="w-full transition-colors"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 20px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <div className="flex-1 text-left min-w-0">
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700 }}>
                          {v.year} {v.make} {v.model}
                        </div>
                        <div style={{ fontFamily: 'var(--font-cond)', fontSize: '10px', color: 'var(--dim)' }} className="mt-0.5">
                          {v.plate_state} • {v.plate_number}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--accent)' }}>1</div>
                        <div className="text-[9px] uppercase" style={{ color: 'var(--text-quaternary)', letterSpacing: '0.5px' }}>
                          spot
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 px-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Car className="w-8 h-8 mx-auto mb-3" strokeWidth={1.5} style={{ color: 'var(--text-quaternary)' }} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  No recent spots yet
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
        <div className="px-4 pt-10 text-center">
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin mx-auto mb-4"
            style={{ borderColor: 'rgba(249,115,22,0.2)', borderTopColor: '#f97316' }}
          />
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Searching {state} — <span style={{ fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '2px' }}>{plateNumber}</span>
          </p>
        </div>
      )}

      {viewState === 'revealing' && (
        <div className="px-4 pt-10 flex flex-col items-center gap-6">
          {/* Phase 1: Plate slides in */}
          <div
            style={{
              opacity: revealPhase >= 1 ? 1 : 0,
              transform: revealPhase >= 1 ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.9)',
              transition: 'all 0.5s cubic-bezier(.25,.46,.45,.94)',
            }}
          >
            <div className="relative bg-white rounded-lg px-8 py-4 shadow-xl border-4 border-gray-800">
              <div className="absolute top-1.5 left-3 text-[10px] text-gray-600 font-bold">{stateCode}</div>
              <div className="text-3xl font-mono font-extrabold text-black tracking-widest text-center">
                {plateNumber.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Phase 2: Scanning line */}
          {revealPhase >= 2 && revealPhase < 4 && (
            <div
              className="w-48 h-0.5 rounded-full"
              style={{
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
            <p className="text-sm font-heading font-bold uppercase tracking-wider" style={{ color: '#F97316' }}>
              {revealResult?.found ? 'Vehicle Found' : 'New Plate Detected'}
            </p>
            {revealResult?.found && revealResult.vehicle && (
              <p className="text-xs text-secondary mt-1">
                {revealResult.vehicle.year} {revealResult.vehicle.make} {revealResult.vehicle.model}
              </p>
            )}
          </div>
        </div>
      )}

      {viewState !== 'search' && viewState !== 'loading' && (
        <div className="px-4 pt-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 mb-4 transition-colors hover:text-accent-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            <span className="label-micro">Back to Search</span>
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
