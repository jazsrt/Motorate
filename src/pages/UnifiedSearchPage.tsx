import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { VEHICLE_PUBLIC_COLUMNS, VEHICLE_PLATE_VISIBLE_COLUMNS } from '../lib/vehicles';
import { Search, User, X } from 'lucide-react';
import { Layout } from '../components/Layout';
import { FollowButton } from '../components/FollowButton';
import { UserAvatar } from '../components/UserAvatar';
import { hashPlate } from '../lib/hash';
import { US_STATES } from '../lib/constants';
import { LicensePlate } from '../components/LicensePlate';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { PlateSearch } from '../components/PlateSearch';
import { PlateFoundUnclaimed } from '../components/PlateFoundUnclaimed';
import { PlateFoundClaimed } from '../components/PlateFoundClaimed';
import { VinClaimModal } from '../components/VinClaimModal';
import { CameraModal } from '../components/spot/CameraModal';
import type { SpotWizardData } from '../types/spot';
import { lookupPlate } from '../lib/plateToVinApi';
import { type VerificationTier } from '../components/TierBadge';

interface Profile {
  id: string;
  handle: string;
  avatar_url: string | null;
}

interface Vehicle {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  trim: string | null;
  stock_image_url: string | null;
  profile_image_url?: string | null;
  owner_id: string | null;
  is_claimed: boolean;
  verification_tier: VerificationTier;
  plate_hash: string;
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

interface SearchPageProps {
  onNavigate: (page: string, data?: unknown) => void;
  onViewVehicle?: (vehicleId: string) => void;
  initialQuery?: string;
  onClose?: () => void;
}


type SearchMode = 'general' | 'plate';
type PlateViewState = 'search' | 'not-found' | 'unclaimed' | 'claimed' | 'loading';

export default function UnifiedSearchPage({ onNavigate, onViewVehicle, initialQuery = '' }: SearchPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchMode, setSearchMode] = useState<SearchMode>('general');
  const [query, setQuery] = useState(initialQuery);
  const [users, setUsers] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [_currentUserHandle, setCurrentUserHandle] = useState<string>('');
  const _searchTimeoutRef = useRef<NodeJS.Timeout>();

  const [plateViewState, setPlateViewState] = useState<PlateViewState>('search');
  const [plateState, setPlateState] = useState('');
  const [plateStateCode, setPlateStateCode] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [plateHash, setPlateHash] = useState('');
  const [plateVehicle, setPlateVehicle] = useState<Vehicle | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  useEffect(() => {
    async function loadCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('handle')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && profile?.handle) {
          setCurrentUserHandle(profile.handle);
        }
      }
    }
    loadCurrentUser();
  }, []);

  const _performUnifiedSearch = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);

    try {
      const rawQuery = query.trim();
      const isUserSearch = rawQuery.startsWith('@');
      const searchTerm = rawQuery.replace(/^@/, '');

      // If searching for a user (@ prefix), skip vehicle search entirely
      if (isUserSearch) {
        // Use Full Text Search instead of ilike for better performance
        // Convert spaces to & for AND search (e.g., "john doe" becomes "john & doe")
        const ftsQuery = searchTerm.replace(/\s+/g, ' & ');

        const { data: userResults, error: userError } = await supabase
          .from('profiles')
          .select('id, handle, avatar_url')
          .textSearch('fts', ftsQuery)
          .limit(10);

        if (userError) {
          setUsers([]);
        } else {
          setUsers(userResults || []);
        }

        setVehicles([]);
        setLoading(false);
        return;
      }

      // Otherwise, search for vehicles by make/model using Full Text Search
      // Convert spaces to & for AND search (e.g., "dodge charger" becomes "dodge & charger")
      const ftsQuery = searchTerm.replace(/\s+/g, ' & ');

      // PLATE: hidden — public surface
      const vehiclesResult = await supabase
        .from('vehicles')
        .select(VEHICLE_PUBLIC_COLUMNS)
        .textSearch('fts', ftsQuery)
        .limit(10);

      if (vehiclesResult.error) {
        setVehicles([]);
      } else {
        setVehicles((vehiclesResult.data || []) as unknown as Vehicle[]);
      }

      setUsers([]);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handlePlateSearch = async (searchState: string, searchPlate: string) => {
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

    setPlateState(searchState);
    setPlateNumber(searchPlate);
    setPlateViewState('loading');
    setPlateVehicle(null);

    try {
      const stateObj = US_STATES.find(s => s.name.toLowerCase() === searchState.toLowerCase());
      const code = stateObj?.code || searchState;
      setPlateStateCode(code);

      const hash = await hashPlate(code, searchPlate.trim().toUpperCase());
      setPlateHash(hash);

      // PLATE: visible — plate search confirmation
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select(VEHICLE_PLATE_VISIBLE_COLUMNS + `, owner:profiles!vehicles_owner_id_fkey(handle, avatar_url)`)
        .eq('plate_hash', hash)
        .maybeSingle();

      if (vehicleError) {
        showToast('Search failed: ' + vehicleError.message, 'error');
        setPlateViewState('search');
        return;
      }

      if (vehicleData) {
        const vehicle = vehicleData as unknown as Vehicle;
        setPlateVehicle(vehicle);
        setPlateViewState(vehicle.is_claimed ? 'claimed' : 'unclaimed');
      } else {
        // Not in DB — try Auto.dev plate lookup
        const apiResult = await lookupPlate(searchPlate.trim().toUpperCase(), code);

        if (apiResult && apiResult.make && apiResult.model) {
          // Auto.dev returned vehicle data — navigate to spot review with pre-filled data
          const wizardData: SpotWizardData = {
            plateState: code,
            plateNumber: searchPlate.trim().toUpperCase(),
            plateHash: hash,
            make: apiResult.make,
            model: apiResult.model,
            color: apiResult.color || '',
            year: apiResult.year || undefined,
            trim: apiResult.trim || undefined,
          };
          onNavigate('quick-spot-review', { wizardData });
        } else {
          // Auto.dev returned nothing — show not-found for manual entry
          setPlateViewState('not-found');
        }
      }
    } catch {
      showToast('Failed to search. Please try again.', 'error');
      setPlateViewState('search');
    }
  };

  const handleBackToPlateSearch = () => {
    setPlateViewState('search');
    setPlateVehicle(null);
    setPlateState('');
    setPlateStateCode('');
    setPlateNumber('');
    setPlateHash('');
  };

  const handleSpotAndReview = () => {
    if (!plateVehicle) return;
    if (!user) {
      showToast('Please log in to spot vehicles', 'error');
      return;
    }

    const wizardData: SpotWizardData = {
      plateState: plateStateCode,
      plateNumber,
      plateHash,
      vehicleId: plateVehicle.id,
      make: plateVehicle.make || '',
      model: plateVehicle.model || '',
      color: plateVehicle.color || '',
      year: plateVehicle.year ? String(plateVehicle.year) : undefined,
      trim: plateVehicle.trim || undefined,
    };

    onNavigate('quick-spot-review', { wizardData });
  };

  const handleClaimVehicle = () => {
    if (!plateVehicle) return;
    if (!user) {
      showToast('Please log in to claim this vehicle', 'error');
      return;
    }
    setShowClaimModal(true);
  };

  function ResultSection({ label, count }: { label: string; count: number }) {
    return (
      <div style={{
        padding: '10px 16px 6px',
        fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 700,
        letterSpacing: '0.24em', textTransform: 'uppercase' as const,
        color: '#3a4e60',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontVariantNumeric: 'tabular-nums' }}>
          {count}
        </span>
      </div>
    );
  }

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      <div style={{ paddingBottom: 100, background: '#070a0f', minHeight: '100vh' }}>

        {/* 1. Sticky header + search bar (always visible when searchMode !== 'plate') */}
        {searchMode !== 'plate' && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 20,
            background: 'rgba(6,9,14,0.97)', backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            padding: '48px 16px 12px',
          }}>
            <div style={{
              fontFamily: 'Rajdhani, sans-serif', fontSize: 24, fontWeight: 700,
              color: '#eef4f8', marginBottom: 10,
            }}>Search</div>

            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none', color: query.startsWith('@') ? '#F97316' : '#5a6e7e',
              }}>
                {query.startsWith('@')
                  ? <User style={{ width: 15, height: 15 }} />
                  : <Search style={{ width: 15, height: 15 }} />
                }
              </div>

              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search vehicles, plates, @users..."
                style={{
                  width: '100%',
                  background: '#0a0d14',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10,
                  padding: '11px 40px 11px 38px',
                  fontFamily: query && !query.startsWith('@') ? 'JetBrains Mono, monospace' : 'Barlow, sans-serif',
                  fontSize: 14, color: '#eef4f8', outline: 'none',
                  letterSpacing: !query.startsWith('@') && query ? '0.06em' : 'normal',
                  textTransform: !query.startsWith('@') && query ? 'uppercase' as const : 'none' as const,
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box' as const,
                }}
                onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(249,115,22,0.4)'}
                onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />

              {query && (
                <button
                  onClick={() => { setQuery(''); setUsers([]); setVehicles([]); setHasSearched(false); }}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#5a6e7e',
                    padding: 2,
                  }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>

            {query.length > 0 && (
              <div style={{
                marginTop: 8, fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
                textTransform: 'uppercase' as const,
                color: query.startsWith('@') ? '#F97316' : '#5a6e7e',
              }}>
                {query.startsWith('@') ? 'Searching users' : 'Searching vehicles & plates'}
              </div>
            )}
          </div>
        )}

        {/* 2. Loading state */}
        {loading && searchMode !== 'plate' && (
          <div style={{ padding: '32px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              border: '2px solid rgba(249,115,22,0.2)',
              borderTopColor: '#F97316',
              animation: 'spin 0.7s linear infinite',
            }} />
          </div>
        )}

        {/* 3. Search results */}
        {hasSearched && !loading && searchMode !== 'plate' && (
          <>
            {vehicles.length > 0 && (
              <>
                <ResultSection label="Vehicles" count={vehicles.length} />
                {vehicles.map(v => {
                  const name = [v.year, v.make, v.model].filter(Boolean).join(' ');
                  const plate = [v.plate_state, v.plate_number].filter(Boolean).join(' \u00B7 ');
                  return (
                    <div
                      key={v.id}
                      onClick={() => onViewVehicle ? onViewVehicle(v.id) : onNavigate('vehicle-detail', { vehicleId: v.id })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.03)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div style={{
                        width: 58, height: 40, borderRadius: 5, overflow: 'hidden',
                        background: '#0e1320', flexShrink: 0,
                      }}>
                        {(v.profile_image_url || v.stock_image_url) && (
                          <img src={(v.profile_image_url || v.stock_image_url)!} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'Rajdhani, sans-serif', fontSize: 16, fontWeight: 700,
                          color: '#eef4f8', lineHeight: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                        }}>
                          {name || 'Unknown Vehicle'}
                        </div>
                        {plate && (
                          <div style={{
                            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                            color: '#5a6e7e', marginTop: 3, letterSpacing: '0.1em',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {plate}
                          </div>
                        )}
                      </div>

                      <div style={{
                        fontFamily: 'Barlow Condensed, sans-serif', fontSize: 8, fontWeight: 700,
                        letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                        padding: '3px 8px', borderRadius: 4, flexShrink: 0,
                        ...(v.is_claimed
                          ? { color: '#20c060', background: 'rgba(32,192,96,0.1)', border: '1px solid rgba(32,192,96,0.25)' }
                          : { color: '#5a6e7e', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
                        ),
                      }}>
                        {v.is_claimed ? 'Claimed' : 'Unclaimed'}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {users.length > 0 && (
              <>
                <ResultSection label="Users" count={users.length} />
                {users.map(profile => (
                  <div
                    key={profile.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                    }}
                    onClick={() => onNavigate('user-profile', profile.id)}
                  >
                    <UserAvatar avatarUrl={profile.avatar_url} handle={profile.handle} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'Rajdhani, sans-serif', fontSize: 15, fontWeight: 700,
                        color: '#eef4f8',
                      }}>
                        @{profile.handle}
                      </div>
                    </div>
                    <div onClick={e => e.stopPropagation()}>
                      <FollowButton targetUserId={profile.id} />
                    </div>
                  </div>
                ))}
              </>
            )}

            {vehicles.length === 0 && users.length === 0 && (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <Search style={{ width: 32, height: 32, color: '#3a4e60', margin: '0 auto 14px', display: 'block' }} strokeWidth={1} />
                <div style={{
                  fontFamily: 'Rajdhani, sans-serif', fontSize: 18, fontWeight: 700,
                  color: '#eef4f8', marginBottom: 6,
                }}>No results</div>
                <div style={{
                  fontFamily: 'Barlow, sans-serif', fontSize: 12, color: '#5a6e7e', lineHeight: 1.5,
                }}>
                  Try a different name, plate number, or start with @ to search users
                </div>
              </div>
            )}
          </>
        )}

        {/* 4. Plate lookup flow */}
        {searchMode === 'plate' && plateViewState === 'search' && (
          <div style={{ padding: '16px 16px 0' }}>
            <PlateSearch
              initialPlate={plateNumber}
              onSearch={handlePlateSearch}
              onCameraScan={() => setShowCameraModal(true)}
              onNavigateToVehicle={(vehicleId) => onNavigate('vehicle-detail', vehicleId)}
            />
          </div>
        )}

        {searchMode === 'plate' && plateViewState === 'loading' && (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '2px solid rgba(249,115,22,0.2)',
              borderTopColor: '#F97316',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ fontSize: 14, color: '#5a6e7e', fontFamily: 'Barlow, sans-serif', margin: 0 }}>
              Searching {plateState} —{' '}
              <span style={{ fontWeight: 600, color: '#eef4f8', letterSpacing: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                {plateNumber}
              </span>
            </p>
          </div>
        )}

        {searchMode === 'plate' && plateViewState === 'not-found' && (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ marginBottom: 20 }}>
              <LicensePlate plateNumber={plateNumber} plateState={plateStateCode || plateState} size="lg" />
            </div>

            <div style={{
              fontFamily: 'Rajdhani, sans-serif', fontSize: 18, fontWeight: 700,
              color: '#eef4f8', marginBottom: 6,
            }}>
              Not in the system yet
            </div>
            <div style={{
              fontFamily: 'Barlow, sans-serif', fontSize: 12, color: '#5a6e7e',
              lineHeight: 1.55, marginBottom: 28,
            }}>
              Be the first to log this vehicle. Add it to MotoRate by spotting it now.
            </div>

            <button
              onClick={() => onNavigate('scan', { plateNumber, plateState: plateStateCode || plateState })}
              style={{
                width: '100%', padding: '13px',
                background: '#F97316', border: 'none', borderRadius: 8,
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#000',
                cursor: 'pointer', marginBottom: 10,
              }}
            >
              Log This Spot
            </button>

            <button
              onClick={handleBackToPlateSearch}
              style={{
                width: '100%', padding: '11px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 8,
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#5a6e7e',
                cursor: 'pointer',
              }}
            >
              Search Again
            </button>
          </div>
        )}

        {searchMode === 'plate' && plateViewState === 'unclaimed' && plateVehicle && (
          <div style={{ padding: '16px 16px 0' }}>
            <PlateFoundUnclaimed
              state={plateState}
              plateNumber={plateNumber}
              vehicle={plateVehicle}
              onSpotAndReview={handleSpotAndReview}
              onClaimVehicle={handleClaimVehicle}
              onViewVehicle={(vehicleId) => onNavigate('vehicle-detail', vehicleId)}
              isLoggedIn={!!user}
            />
          </div>
        )}

        {searchMode === 'plate' && plateViewState === 'claimed' && plateVehicle && (
          <div style={{ padding: '16px 16px 0' }}>
            <PlateFoundClaimed
              state={plateState}
              plateNumber={plateNumber}
              vehicle={plateVehicle as unknown as Parameters<typeof PlateFoundClaimed>[0]['vehicle']}
              onLeaveReview={handleSpotAndReview}
              onBack={handleBackToPlateSearch}
              onViewOwnerProfile={(userId) => onNavigate('user-profile', userId)}
            />
          </div>
        )}

        {/* 5. Discovery state (idle) */}
        {!query && !hasSearched && searchMode !== 'plate' && (
          <>
            {/* Trending section */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 16px 10px',
            }}>
              <div style={{
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: '#7a8e9e',
              }}>Trending Near You</div>
              <div style={{
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316',
                cursor: 'pointer',
              }}>View All</div>
            </div>

            {/* Trending grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 3, padding: '0 16px',
            }}>
              <div
                onClick={() => onNavigate('rankings')}
                style={{
                  gridRow: 'span 2', position: 'relative',
                  borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                  background: '#0a0d14', minHeight: 220,
                }}
              >
                <img
                  src="https://images.pexels.com/photos/1719648/pexels-photo-1719648.jpeg?auto=compress&cs=tinysrgb&w=400"
                  alt="Trending"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.92) 0%, transparent 50%)' }} />
                <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, zIndex: 3 }}>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 18, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
                    Huracan
                  </div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', marginTop: 2 }}>
                    #1 Chicago
                  </div>
                </div>
              </div>

              {[
                { img: 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=300', name: 'Hellcat', sub: '#3 Chicago' },
                { img: 'https://images.pexels.com/photos/2127733/pexels-photo-2127733.jpeg?auto=compress&cs=tinysrgb&w=300', name: 'GT3 RS', sub: '#2 Chicago' },
              ].map(item => (
                <div
                  key={item.name}
                  onClick={() => onNavigate('rankings')}
                  style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#0a0d14', minHeight: 108 }}
                >
                  <img src={item.img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.9) 0%, transparent 55%)' }} />
                  <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 3 }}>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>{item.name}</div>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', marginTop: 2 }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Browse brands */}
            <div style={{ padding: '18px 16px 8px' }}>
              <div style={{
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: '#7a8e9e',
                marginBottom: 10,
              }}>Browse Brands</div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' as const, paddingBottom: 4 }}>
                {['Dodge', 'Ford', 'Porsche', 'BMW', 'Lambo', 'Ferrari', 'Tesla', 'Chevy'].map(brand => (
                  <button key={brand} style={{
                    flexShrink: 0, padding: '7px 14px',
                    background: '#0a0d14', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 20, cursor: 'pointer',
                    fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#7a8e9e',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => setQuery(brand)}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(249,115,22,0.35)'; (e.currentTarget as HTMLElement).style.color = '#F97316'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#7a8e9e'; }}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

            {/* Plate lookup shortcut */}
            <div style={{
              margin: '8px 16px 20px',
              padding: '12px 14px',
              background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.14)',
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            }} onClick={() => setSearchMode('plate')}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M7 7V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2"/></svg>
              </div>
              <div>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#F97316' }}>
                  Look up a plate
                </div>
                <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: 11, color: '#5a6e7e', marginTop: 1 }}>
                  Find any vehicle by license plate number
                </div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3a4e60" strokeWidth="2" style={{ marginLeft: 'auto', flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </>
        )}
      </div>

      {/* Camera Modal */}
      {showCameraModal && (
        <CameraModal
          onClose={() => setShowCameraModal(false)}
          onPlateDetected={(detected) => {
            setShowCameraModal(false);
            setPlateNumber(detected.toUpperCase());
          }}
        />
      )}

      {/* Claim Modal */}
      {showClaimModal && plateVehicle && user && (
        <VinClaimModal
          vehicleId={plateVehicle.id}
          vehicleInfo={{
            make: plateVehicle.make,
            model: plateVehicle.model,
            year: plateVehicle.year,
            color: plateVehicle.color,
            plateState: plateStateCode,
            plateNumber: plateNumber,
          }}
          onClose={() => {
            setShowClaimModal(false);
            handlePlateSearch(plateState, plateNumber);
          }}
          onSuccess={() => {
            setShowClaimModal(false);
            showToast('Your ride is now verified!', 'success');
            handlePlateSearch(plateState, plateNumber);
          }}
        />
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}
