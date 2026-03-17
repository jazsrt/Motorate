import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, User, Car, MapPin, Target, AlertCircle, X } from 'lucide-react';
import { Layout } from '../components/Layout';
import { FollowButton } from '../components/FollowButton';
import { UserAvatar } from '../components/UserAvatar';
import { EmptyState } from '../components/ui/EmptyState';
import { hashPlate } from '../lib/hash';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { PlateSearch } from '../components/PlateSearch';
import { PlateNotFound, type CreateVehicleData } from '../components/PlateNotFound';
import { PlateFoundUnclaimed } from '../components/PlateFoundUnclaimed';
import { PlateFoundClaimed } from '../components/PlateFoundClaimed';
import { VinClaimModal } from '../components/VinClaimModal';
import { CameraModal } from '../components/spot/CameraModal';
import type { SpotWizardData } from '../types/spot';
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
  onNavigate: (page: any, data?: any) => void;
  onViewVehicle?: (vehicleId: string) => void;
  initialQuery?: string;
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
  const [currentUserHandle, setCurrentUserHandle] = useState<string>('');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

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

  useEffect(() => {
    if (initialQuery && query === initialQuery && !hasSearched) {
      performUnifiedSearch();
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setUsers([]);
      setVehicles([]);
      setHasSearched(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performUnifiedSearch();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  async function performUnifiedSearch() {
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

      const vehiclesResult = await supabase
        .from('vehicles')
        .select('id, make, model, year, color, trim, stock_image_url, owner_id, is_claimed, verification_tier, plate_hash, plate_state, plate_number')
        .textSearch('fts', ftsQuery)
        .limit(10);

      if (vehiclesResult.error) {
        setVehicles([]);
      } else {
        setVehicles(vehiclesResult.data || []);
      }

      setUsers([]);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleVehicleClick = (vehicle: Vehicle) => {
    if (onViewVehicle) {
      onViewVehicle(vehicle.id);
    } else {
      onNavigate('vehicle-detail', vehicle.id);
    }
  };

  const handlePlateSearch = async (searchState: string, searchPlate: string) => {
    if (!searchPlate.trim()) return;

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
        setPlateViewState('search');
        return;
      }

      if (vehicleData) {
        setPlateVehicle(vehicleData as Vehicle);
        setPlateViewState(vehicleData.is_claimed ? 'claimed' : 'unclaimed');
      } else {
        setPlateViewState('not-found');
      }
    } catch (err: any) {
      showToast('Failed to search. Please try again.', 'error');
      setPlateViewState('search');
    }
  };

  const handleCreateVehicle = async (vehicleData: CreateVehicleData) => {
    if (!user) {
      showToast('Please log in to create a vehicle profile', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data: newVehicle, error: createError } = await supabase
        .from('vehicles')
        .insert({
          plate_hash: plateHash,
          plate_state: plateStateCode,
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

      const wizardData: SpotWizardData = {
        plateState: plateStateCode,
        plateNumber: plateNumber.trim().toUpperCase(),
        plateHash,
        vehicleId: newVehicle.id,
        make: vehicleData.make,
        model: vehicleData.model,
        color: vehicleData.color || '',
        year: vehicleData.year ? String(vehicleData.year) : undefined,
      };

      onNavigate('quick-spot-review', { wizardData });
    } catch (err: any) {
      showToast('Failed to create vehicle. Please try again.', 'error');
    } finally {
      setLoading(false);
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

  const totalResults = users.length + vehicles.length;

  const isPlateMode = searchMode === 'plate';

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      <div style={{ minHeight: '100vh', background: '#060910' }}>
        {/* Sticky Header */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(6,9,14,0.97)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          padding: '52px 16px 10px',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}>
          <h1 style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: '#eef4f8',
            margin: 0,
            marginBottom: 12,
          }}>
            Search
          </h1>

          {/* Mode Toggle Pills + Camera Button Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <button
              onClick={() => setSearchMode('general')}
              style={{
                borderRadius: 20,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase' as const,
                padding: '6px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                ...(searchMode === 'general'
                  ? { background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.35)', color: '#F97316' }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#5a6e7e' }
                ),
              }}
            >
              User
            </button>
            <button
              onClick={() => setSearchMode('plate')}
              style={{
                borderRadius: 20,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase' as const,
                padding: '6px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                ...(searchMode === 'plate'
                  ? { background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.35)', color: '#F97316' }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#5a6e7e' }
                ),
              }}
            >
              Plate
            </button>

            <div style={{ flex: 1 }} />

            {searchMode === 'plate' && (
              <button
                onClick={() => setShowCameraModal(true)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#0a0d14',
                  border: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#5a6e7e',
                  padding: 0,
                }}
              >
                <Target style={{ width: 16, height: 16 }} />
              </button>
            )}
          </div>

          {/* Search Input (general mode only) */}
          {searchMode === 'general' && (
            <div style={{ position: 'relative' }}>
              <Search style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                color: '#5a6e7e',
                pointerEvents: 'none',
              }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search @username, make, model..."
                style={{
                  width: '100%',
                  background: '#0a0d14',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10,
                  padding: '11px 40px 11px 38px',
                  fontFamily: "'Barlow', sans-serif",
                  fontSize: 14,
                  color: '#eef4f8',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#5a6e7e',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Plate Search Component */}
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

        {showCameraModal && (
          <CameraModal
            onClose={() => setShowCameraModal(false)}
            onPlateDetected={(detected) => {
              setShowCameraModal(false);
              setPlateNumber(detected.toUpperCase());
            }}
          />
        )}

        {searchMode === 'plate' && plateViewState === 'loading' && (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '2px solid rgba(249,115,22,0.2)',
                borderTopColor: '#f97316',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <p style={{ fontSize: 14, color: '#5a6e7e', fontFamily: "'Barlow', sans-serif", margin: 0 }}>
              Searching {plateState} —{' '}
              <span style={{
                fontWeight: 600,
                color: '#eef4f8',
                letterSpacing: '2px',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {plateNumber}
              </span>
            </p>
          </div>
        )}

        {searchMode === 'plate' && plateViewState === 'not-found' && (
          <div style={{ padding: '16px 16px 0' }}>
            <PlateNotFound
              state={plateState}
              plateNumber={plateNumber}
              onCancel={handleBackToPlateSearch}
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
              vehicle={plateVehicle as any}
              onLeaveReview={handleSpotAndReview}
              onBack={handleBackToPlateSearch}
              onViewOwnerProfile={(userId) => onNavigate('user-profile', userId)}
            />
          </div>
        )}

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

        {/* General search: loading */}
        {searchMode === 'general' && loading && (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '2px solid rgba(249,115,22,0.2)',
                borderTopColor: '#f97316',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <p style={{ fontSize: 12, color: '#5a6e7e', fontFamily: "'Barlow', sans-serif", margin: 0 }}>
              Searching...
            </p>
          </div>
        )}

        {/* General search: no results */}
        {searchMode === 'general' && !loading && hasSearched && totalResults === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <div style={{ marginBottom: 8 }}>
              <Search style={{ width: 32, height: 32, color: '#3a4e60', margin: '0 auto 12px' }} />
            </div>
            <h3 style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: '#eef4f8',
              margin: '0 0 6px',
            }}>
              No results found
            </h3>
            <p style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: 12,
              color: '#5a6e7e',
              margin: '0 0 16px',
              lineHeight: 1.5,
            }}>
              No users or vehicles found matching &ldquo;{query}&rdquo;.
              Try a different search or create a shadow profile.
            </p>
            <button
              onClick={() => setSearchMode('plate')}
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase' as const,
                background: 'rgba(249,115,22,0.10)',
                border: '1px solid rgba(249,115,22,0.35)',
                color: '#F97316',
                borderRadius: 20,
                padding: '8px 18px',
                cursor: 'pointer',
              }}
            >
              Create Shadow Profile
            </button>
            {currentUserHandle && (
              <p style={{
                fontSize: 10,
                color: '#5a6e7e',
                fontFamily: "'Barlow', sans-serif",
                marginTop: 12,
              }}>
                Your handle: <span style={{ fontWeight: 700, color: '#F97316' }}>@{currentUserHandle}</span>
              </p>
            )}
          </div>
        )}

        {/* General search: results */}
        {searchMode === 'general' && !loading && hasSearched && totalResults > 0 && (
          <div>
            {users.length > 0 && (
              <div>
                {/* Section Header */}
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase' as const,
                  color: '#3a4e60',
                  padding: '14px 16px 6px',
                }}>
                  Users ({users.length})
                </div>
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => onNavigate('user-profile', u.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      borderBlockEnd: '1px solid rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt={u.handle || 'User'}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <User style={{ width: 16, height: 16, color: '#5a6e7e' }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#eef4f8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        @{u.handle || 'anonymous'}
                      </div>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        color: '#5a6e7e',
                      }}>
                        Member
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <FollowButton targetUserId={u.id} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {vehicles.length > 0 && (
              <div>
                {/* Section Header */}
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase' as const,
                  color: '#3a4e60',
                  padding: '14px 16px 6px',
                }}>
                  Vehicles ({vehicles.length})
                </div>
                {vehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    onClick={() => handleVehicleClick(vehicle)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      borderBlockEnd: '1px solid rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {vehicle.stock_image_url ? (
                      <img
                        src={vehicle.stock_image_url}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        style={{
                          width: 56,
                          height: 38,
                          borderRadius: 4,
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 56,
                        height: 38,
                        borderRadius: 4,
                        background: 'rgba(255,255,255,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Car style={{ width: 18, height: 18, color: '#3a4e60' }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#eef4f8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10,
                          color: '#5a6e7e',
                        }}>
                          {vehicle.color}
                        </span>
                        {vehicle.is_claimed && (
                          <span style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontSize: 8,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase' as const,
                            background: 'rgba(34,197,94,0.10)',
                            border: '1px solid rgba(34,197,94,0.30)',
                            color: '#22c55e',
                            borderRadius: 10,
                            padding: '2px 8px',
                          }}>
                            Claimed
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* General search: empty state (no query) */}
        {searchMode === 'general' && !query.trim() && !loading && (
          <div style={{ padding: '24px 16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 20,
            }}>
              <Search style={{ width: 18, height: 18, color: '#3a4e60', flexShrink: 0, marginTop: 2 }} />
              <div>
                <h3 style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#eef4f8',
                  margin: '0 0 8px',
                }}>
                  Quick Search Tips
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <User style={{ width: 14, height: 14, color: '#5a6e7e', flexShrink: 0, marginTop: 1 }} />
                    <span style={{
                      fontFamily: "'Barlow', sans-serif",
                      fontSize: 12,
                      color: '#5a6e7e',
                    }}>
                      Find members by their @handle
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Car style={{ width: 14, height: 14, color: '#5a6e7e', flexShrink: 0, marginTop: 1 }} />
                    <span style={{
                      fontFamily: "'Barlow', sans-serif",
                      fontSize: 12,
                      color: '#5a6e7e',
                    }}>
                      Search vehicles by make or model
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Target style={{ width: 14, height: 14, color: '#5a6e7e', flexShrink: 0, marginTop: 1 }} />
                    <span style={{
                      fontFamily: "'Barlow', sans-serif",
                      fontSize: 12,
                      color: '#5a6e7e',
                    }}>
                      View profiles and rate vehicles
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(249,115,22,0.04)',
              border: '1px solid rgba(249,115,22,0.12)',
              borderRadius: 10,
              padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'rgba(249,115,22,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Target style={{ width: 14, height: 14, color: '#F97316' }} />
                </div>
                <h3 style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#eef4f8',
                  margin: 0,
                }}>
                  Looking for a license plate?
                </h3>
              </div>
              <p style={{
                fontFamily: "'Barlow', sans-serif",
                fontSize: 12,
                color: '#5a6e7e',
                margin: '0 0 12px',
              }}>
                Spot and rate vehicles by their license plate
              </p>
              <button
                onClick={() => setSearchMode('plate')}
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase' as const,
                  background: 'rgba(249,115,22,0.10)',
                  border: '1px solid rgba(249,115,22,0.35)',
                  color: '#F97316',
                  borderRadius: 20,
                  padding: '8px 18px',
                  cursor: 'pointer',
                }}
              >
                Search by Plate
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keyframe for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}
