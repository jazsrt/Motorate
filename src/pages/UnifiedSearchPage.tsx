import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, User, Car, MapPin, Target, AlertCircle } from 'lucide-react';
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
import { ClaimVehicleModalVerification } from '../components/ClaimVehicleModalVerification';
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
      showToast('Please log in to create a plate profile', 'error');
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

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Search</h1>
          <p className="text-secondary">Find members, vehicles, and more</p>
        </div>

        <div className="bg-surface border border-surfacehighlight rounded-xl p-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSearchMode('general')}
              className={`flex-1 py-2 px-4 rounded-lg font-bold uppercase tracking-wider text-sm transition-all ${
                searchMode === 'general'
                  ? 'bg-accent-primary text-white'
                  : 'bg-surfacehighlight text-secondary hover:bg-surfacehighlight/70'
              }`}
            >
              <Search className="w-4 h-4 inline mr-2" />
              General
            </button>
            <button
              onClick={() => setSearchMode('plate')}
              className={`flex-1 py-2 px-4 rounded-lg font-bold uppercase tracking-wider text-sm transition-all ${
                searchMode === 'plate'
                  ? 'bg-accent-primary text-white'
                  : 'bg-surfacehighlight text-secondary hover:bg-surfacehighlight/70'
              }`}
            >
              <Target className="w-4 h-4 inline mr-2" />
              License Plate
            </button>
          </div>

          {searchMode === 'general' ? (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary w-5 h-5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search @username, make, model..."
                className="w-full bg-surfacehighlight border border-surfacehighlight rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-accent-primary placeholder-secondary"
                autoFocus
              />
            </div>
          ) : null}
        </div>

        {searchMode === 'plate' && plateViewState === 'search' && (
          <PlateSearch
            initialPlate={plateNumber}
            onSearch={handlePlateSearch}
            onCameraScan={() => setShowCameraModal(true)}
            onNavigateToVehicle={(vehicleId) => onNavigate('vehicle-detail', vehicleId)}
          />
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
          <div className="px-4 pt-10 text-center">
            <div
              className="w-10 h-10 rounded-full border-2 animate-spin mx-auto mb-4"
              style={{ borderColor: 'rgba(249,115,22,0.2)', borderTopColor: '#f97316' }}
            />
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Searching {plateState} — <span style={{ fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '2px' }}>{plateNumber}</span>
            </p>
          </div>
        )}

        {searchMode === 'plate' && plateViewState === 'not-found' && (
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
              showToast('Please create the plate profile first', 'info');
            }}
            loading={loading}
          />
        )}

        {searchMode === 'plate' && plateViewState === 'unclaimed' && plateVehicle && (
          <PlateFoundUnclaimed
            state={plateState}
            plateNumber={plateNumber}
            vehicle={plateVehicle}
            onSpotAndReview={handleSpotAndReview}
            onClaimVehicle={handleClaimVehicle}
            onViewVehicle={(vehicleId) => onNavigate('vehicle-detail', vehicleId)}
            isLoggedIn={!!user}
          />
        )}

        {searchMode === 'plate' && plateViewState === 'claimed' && plateVehicle && (
          <PlateFoundClaimed
            state={plateState}
            plateNumber={plateNumber}
            vehicle={plateVehicle as any}
            onLeaveReview={handleSpotAndReview}
            onBack={handleBackToPlateSearch}
            onViewOwnerProfile={(userId) => onNavigate('user-profile', userId)}
          />
        )}

        {showClaimModal && plateVehicle && user && (
          <ClaimVehicleModalVerification
            vehicleId={plateVehicle.id}
            userId={user.id}
            vehicleInfo={{
              make: plateVehicle.make || 'Unknown',
              model: plateVehicle.model || 'Unknown',
              year: plateVehicle.year || 0,
              color: plateVehicle.color || 'Unknown',
              plateState: plateStateCode,
              plateNumber: plateNumber,
            }}
            onClose={() => {
              setShowClaimModal(false);
              handlePlateSearch(plateState, plateNumber);
            }}
            onSuccess={() => {
              setShowClaimModal(false);
              showToast('Claim submitted successfully!', 'success');
              handlePlateSearch(plateState, plateNumber);
            }}
          />
        )}

        {searchMode === 'general' && loading && (
          <div className="text-center py-12">
            <div className="animate-pulse text-secondary">Searching...</div>
          </div>
        )}

        {searchMode === 'general' && !loading && hasSearched && totalResults === 0 && (
          <div className="bg-surface border border-surfacehighlight rounded-xl">
            <EmptyState
              icon={Search}
              title="No results found"
              description={`No users or vehicles found matching "${query}". Try a different search or create a shadow profile for a vehicle.`}
              actionLabel="Create Shadow Profile"
              onAction={() => setSearchMode('plate')}
            />
            {currentUserHandle && (
              <p className="text-center text-secondary text-xs pb-4">
                Your handle: <span className="font-bold text-accent-primary">@{currentUserHandle}</span>
              </p>
            )}
          </div>
        )}

        {searchMode === 'general' && !loading && hasSearched && totalResults > 0 && (
          <div className="space-y-6">
            {users.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-secondary" />
                  <h2 className="font-bold uppercase tracking-wider text-sm text-secondary">
                    Members ({users.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => onNavigate('user-profile', user.id)}
                      className="w-full bg-surface border border-surfacehighlight rounded-xl p-4 flex items-center gap-4 hover:border-accent-primary/50 hover:bg-surfacehighlight/50 transition-all text-left group"
                    >
                      <div className="relative">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.handle || 'User'}
                            className="w-14 h-14 rounded-full object-cover ring-2 ring-surfacehighlight group-hover:ring-accent-primary/30 transition-all"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-surfacehighlight flex items-center justify-center ring-2 ring-surfacehighlight group-hover:ring-accent-primary/30 transition-all">
                            <User className="w-7 h-7 text-secondary" />
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent-primary rounded-full flex items-center justify-center">
                          <User className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-primary truncate">
                          @{user.handle || 'anonymous'}
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <FollowButton targetUserId={user.id} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {vehicles.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Car className="w-5 h-5 text-secondary" />
                  <h2 className="font-bold uppercase tracking-wider text-sm text-secondary">
                    Vehicles ({vehicles.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {vehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      onClick={() => handleVehicleClick(vehicle)}
                      className="w-full bg-surface border border-surfacehighlight rounded-xl p-4 flex items-center gap-4 hover:border-accent-primary/50 hover:bg-surfacehighlight/50 transition-all text-left group"
                    >
                      <div className="relative">
                        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-accent-primary/20 to-accent-hover/20 flex items-center justify-center ring-2 ring-surfacehighlight group-hover:ring-accent-primary/30 transition-all">
                          <Car className="w-7 h-7 text-accent-primary" />
                        </div>
                        {vehicle.is_claimed && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-primary truncate">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </div>
                        <div className="text-sm text-secondary">
                          {vehicle.color} • {vehicle.is_claimed ? 'Claimed' : 'Unclaimed'}
                        </div>
                      </div>
                      <div className="text-accent-primary group-hover:translate-x-1 transition-transform">
                        →
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {searchMode === 'general' && !query.trim() && !loading && (
          <div className="space-y-4">
            <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-accent-primary/10 rounded-lg flex-shrink-0">
                  <Search className="w-6 h-6 text-accent-primary" />
                </div>
                <div>
                  <h3 className="font-bold mb-2">Quick Search Tips</h3>
                  <ul className="text-sm text-secondary space-y-1.5">
                    <li className="flex items-start gap-2">
                      <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Find members by their @handle</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Car className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Search vehicles by make or model</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>View profiles and rate vehicles</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-accent-primary/10 to-accent-hover/10 border border-accent-primary/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-accent-primary rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold">Looking for a license plate?</h3>
              </div>
              <p className="text-sm text-secondary mb-4">
                Spot and rate vehicles by their license plate
              </p>
              <button
                onClick={() => onNavigate('scan')}
                className="px-4 py-2 bg-accent-primary hover:bg-accent-hover rounded-lg font-bold uppercase tracking-wider text-sm transition-all active:scale-95"
              >
                Search by Plate
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
