import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { VEHICLE_PUBLIC_COLUMNS } from '../lib/vehicles';
import { Search, User, X, Camera, Car, Eye } from 'lucide-react';
import { Layout } from '../components/Layout';
import { FollowButton } from '../components/FollowButton';
import { UserAvatar } from '../components/UserAvatar';
import { US_STATES } from '../lib/constants';
import { LicensePlate } from '../components/LicensePlate';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { VinClaimModal } from '../components/VinClaimModal';
import { CameraModal } from '../components/spot/CameraModal';
import { TierBadge } from '../components/TierBadge';
import type { SpotWizardData } from '../types/spot';
import { searchPlate as sharedSearchPlate } from '../lib/plateSearch';
import { type VerificationTier } from '../components/TierBadge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  spots_count?: number;
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

interface RecentSearch {
  plateState: string;
  plateNumber: string;
  vehicleId?: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  imageUrl?: string | null;
  ts: number;
}

interface SearchPageProps {
  onNavigate: (page: string, data?: unknown) => void;
  onViewVehicle?: (vehicleId: string) => void;
  initialQuery?: string;
  onClose?: () => void;
}

type PlateViewState = 'idle' | 'loading' | 'not-found' | 'unclaimed' | 'claimed';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const C = {
  bg: '#030508',
  surface: '#0d1117',
  accent: '#F97316',
  text1: '#eef4f8',
  text2: '#7a8e9e',
  text3: '#5a6e7e',
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(249,115,22,0.4)',
};

// ---------------------------------------------------------------------------
// localStorage helpers for recent searches
// ---------------------------------------------------------------------------

function recentSearchesKey(userId: string) {
  return `motorate_recent_searches_${userId}`;
}

function loadRecentSearches(userId: string): RecentSearch[] {
  try {
    const raw = localStorage.getItem(recentSearchesKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentSearch[];
    return parsed.slice(0, 5);
  } catch {
    return [];
  }
}

function saveRecentSearch(userId: string, entry: RecentSearch) {
  const existing = loadRecentSearches(userId);
  // Deduplicate by plate
  const filtered = existing.filter(
    e => !(e.plateState === entry.plateState && e.plateNumber === entry.plateNumber)
  );
  const updated = [entry, ...filtered].slice(0, 5);
  localStorage.setItem(recentSearchesKey(userId), JSON.stringify(updated));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UnifiedSearchPage({ onNavigate, onViewVehicle, initialQuery = '' }: SearchPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  // General search state
  const [query, setQuery] = useState(initialQuery);
  const [users, setUsers] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Plate search state
  const [plateState, setPlateState] = useState('IL');
  const [plateNumber, setPlateNumber] = useState('');
  const [plateHash, setPlateHash] = useState('');
  const [plateStateCode, setPlateStateCode] = useState('');
  const [plateViewState, setPlateViewState] = useState<PlateViewState>('idle');
  const [plateVehicle, setPlateVehicle] = useState<Vehicle | null>(null);
  const [spotCount, setSpotCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);

  // Modals
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Load recent searches on mount
  useEffect(() => {
    if (user?.id) {
      setRecentSearches(loadRecentSearches(user.id));
    }
  }, [user?.id]);

  // ---------------------------------------------------------------------------
  // General search (vehicles + users)
  // ---------------------------------------------------------------------------

  const performUnifiedSearch = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);

    try {
      const rawQuery = query.trim();
      const isUserSearch = rawQuery.startsWith('@');
      const searchTerm = rawQuery.replace(/^@/, '');

      if (isUserSearch) {
        const { data: userResults } = await supabase
          .from('profiles')
          .select('id, handle, avatar_url')
          .ilike('handle', `%${searchTerm}%`)
          .limit(10);

        setUsers(userResults || []);
        setVehicles([]);
        setLoading(false);
        return;
      }

      const ftsQuery = searchTerm.replace(/\s+/g, ' & ');
      // FTS requires minimum 2 characters; for short terms, skip FTS
      const useFts = searchTerm.length >= 3;

      const [vehiclesResult, plateResult, handleResult, userResult] = await Promise.all([
        useFts
          ? supabase.from('vehicles').select(VEHICLE_PUBLIC_COLUMNS).textSearch('fts', ftsQuery).limit(10)
          : supabase.from('vehicles').select(VEHICLE_PUBLIC_COLUMNS).ilike('make', `%${searchTerm}%`).limit(10),
        supabase.from('vehicles').select(VEHICLE_PUBLIC_COLUMNS).ilike('plate_number', `%${searchTerm}%`).eq('is_private', false).limit(10),
        supabase.from('vehicles').select(VEHICLE_PUBLIC_COLUMNS).ilike('vehicle_handle', `%${searchTerm}%`).eq('is_private', false).limit(10),
        supabase.from('profiles').select('id, handle, avatar_url').ilike('handle', `%${searchTerm}%`).limit(5),
      ]);

      const allIds = new Set<string>();
      const merged: Vehicle[] = [];
      [...(vehiclesResult.data || []), ...(plateResult.data || []), ...(handleResult.data || [])].forEach((v: any) => {
        if (!allIds.has(v.id)) { allIds.add(v.id); merged.push(v); }
      });
      setVehicles(merged);
      setUsers(userResult.data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [query]);

  // Debounced search trigger
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setUsers([]);
      setVehicles([]);
      setHasSearched(false);
      return;
    }
    const timer = setTimeout(() => {
      performUnifiedSearch();
    }, 350);
    return () => clearTimeout(timer);
  }, [query, performUnifiedSearch]);

  // ---------------------------------------------------------------------------
  // Plate search
  // ---------------------------------------------------------------------------

  const handlePlateSearch = async (searchStateCode: string, searchPlate: string) => {
    const normalizedPlate = searchPlate.trim().toUpperCase().replace(/[\s-]/g, '');
    if (!normalizedPlate || normalizedPlate.length < 2 || normalizedPlate.length > 8) {
      showToast('Enter a valid plate (2-8 characters)', 'error');
      return;
    }

    setPlateNumber(normalizedPlate);
    setPlateStateCode(searchStateCode);
    setPlateViewState('loading');
    setPlateVehicle(null);
    setSpotCount(0);
    setFollowerCount(0);

    const result = await sharedSearchPlate(searchStateCode, normalizedPlate, user?.id);

    if (result.plateHash) setPlateHash(result.plateHash);

    if (result.status === 'found' && result.vehicle) {
      setPlateVehicle(result.vehicle as unknown as Vehicle);
      setPlateViewState(result.vehicle.is_claimed ? 'claimed' : 'unclaimed');

      // Fetch spot + follower counts
      if (result.vehicle.id) {
        const [spotRes, followRes] = await Promise.all([
          supabase.from('spot_history').select('*', { count: 'exact', head: true }).eq('vehicle_id', result.vehicle.id),
          supabase.from('vehicle_follows').select('*', { count: 'exact', head: true }).eq('vehicle_id', result.vehicle.id).eq('status', 'accepted'),
        ]);
        setSpotCount(spotRes.count || 0);
        setFollowerCount(followRes.count || 0);
      }

      // Save recent
      if (user?.id) {
        saveRecentSearch(user.id, {
          plateState: searchStateCode, plateNumber: normalizedPlate,
          vehicleId: result.vehicle.id, make: result.vehicle.make, model: result.vehicle.model,
          year: result.vehicle.year ? Number(result.vehicle.year) : undefined,
          imageUrl: result.vehicle.profile_image_url || result.vehicle.stock_image_url,
          ts: Date.now(),
        });
        setRecentSearches(loadRecentSearches(user.id));
      }
    } else if (result.status === 'not-found') {
      setPlateViewState('not-found');
      if (user?.id) {
        saveRecentSearch(user.id, { plateState: searchStateCode, plateNumber: normalizedPlate, ts: Date.now() });
        setRecentSearches(loadRecentSearches(user.id));
      }
    } else {
      showToast(result.error || 'Search failed', 'error');
      setPlateViewState('idle');
    }
  };

  const handleClearPlateResult = () => {
    setPlateViewState('idle');
    setPlateVehicle(null);
    setPlateNumber('');
    setPlateHash('');
  };

  const handleSpotVehicle = (vehicle?: Vehicle | null) => {
    const v = vehicle || plateVehicle;
    if (!user) {
      showToast('Please log in to spot vehicles', 'error');
      return;
    }

    const wizardData: SpotWizardData = {
      plateState: plateStateCode,
      plateNumber,
      plateHash,
      vehicleId: v?.id,
      make: v?.make || '',
      model: v?.model || '',
      color: v?.color || '',
      year: v?.year ? String(v.year) : undefined,
      trim: v?.trim || undefined,
    };

    onNavigate('scan', { wizardData });
  };

  const handleSpotNewVehicle = () => {
    if (!user) {
      showToast('Please log in to spot vehicles', 'error');
      return;
    }
    // Navigate to scan with pre-filled plate data -- spot flow handles vehicle creation
    onNavigate('scan', { plateNumber, plateState: plateStateCode });
  };

  const handleClaimVehicle = () => {
    if (!plateVehicle) return;
    if (!user) {
      showToast('Please log in to claim this vehicle', 'error');
      return;
    }
    onNavigate('claim-vehicle', {
      vehicleId: plateVehicle.id,
      plateNumber,
      plateState: plateStateCode,
      make: plateVehicle.make,
      model: plateVehicle.model,
      year: plateVehicle.year,
    });
  };

  const handleViewVehicle = (vehicleId: string) => {
    if (onViewVehicle) {
      onViewVehicle(vehicleId);
    } else {
      onNavigate('vehicle-detail', { vehicleId });
    }
  };

  const handleRecentSearchTap = (entry: RecentSearch) => {
    setPlateState(entry.plateState);
    setPlateNumber(entry.plateNumber);
    handlePlateSearch(entry.plateState, entry.plateNumber);
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function vehicleName(v: { year?: number | null; make?: string | null; model?: string | null }) {
    return [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Unknown Vehicle';
  }

  function ResultSection({ label, count }: { label: string; count: number }) {
    return (
      <div style={{
        padding: '10px 16px 6px',
        fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 700,
        letterSpacing: '0.24em', textTransform: 'uppercase',
        color: C.text3,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontVariantNumeric: 'tabular-nums' }}>
          {count}
        </span>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Vehicle result card (shared by unclaimed + claimed)
  // ---------------------------------------------------------------------------

  function renderVehicleResult(v: Vehicle) {
    const isClaimed = v.is_claimed && v.owner_id;
    const imgSrc = v.profile_image_url || v.stock_image_url;

    return (
      <div>
        {/* Full-bleed image */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', overflow: 'hidden', background: '#0a0d12' }}>
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={vehicleName(v)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(160deg, #0c1826 0%, #0a1220 40%, #030508 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Car style={{ width: 48, height: 48, color: '#1e2a38' }} />
            </div>
          )}

          {/* Top gradient for status badge legibility */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, rgba(3,5,8,0.5) 0%, transparent 100%)' }} />

          {/* Bottom gradient for identity legibility */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to bottom, transparent 0%, rgba(3,5,8,0.8) 50%, #030508 100%)' }} />

          {/* Status badge — top right */}
          <div style={{
            position: 'absolute', top: 10, right: 12,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
            letterSpacing: '.8px', textTransform: 'uppercase',
            padding: '3px 8px', borderRadius: 2,
            ...(isClaimed
              ? { color: '#20c060', background: 'rgba(32,192,96,0.12)', border: '1px solid rgba(32,192,96,0.3)' }
              : { color: C.accent, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)' }
            ),
          }}>
            {isClaimed ? 'Claimed' : 'Unclaimed'}
          </div>

          {/* Identity overlay — bottom of image */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 14px' }}>
            {/* Plate */}
            <div style={{ marginBottom: 6 }}>
              <LicensePlate plateNumber={plateNumber} plateState={plateStateCode} size="md" />
            </div>
            {/* Make */}
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(249,115,22,0.8)', marginBottom: 2 }}>
              {v.make || 'Unknown'}
            </div>
            {/* Model */}
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '.5px' }}>
              {v.model || 'Vehicle'}
            </div>
            {/* Year + trim */}
            {(v.year || v.trim) && (
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
                {[v.year, v.trim].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        </div>

        {/* Stat strip */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(249,115,22,0.12)', borderTop: '1px solid rgba(249,115,22,0.12)' }}>
          {[
            { label: 'Spots', value: spotCount },
            { label: 'Fans', value: followerCount },
            { label: 'Status', value: isClaimed ? 'Claimed' : 'Unclaimed' },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 1, padding: '10px 0',
              borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              background: '#030508',
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 500, color: i === 2 && isClaimed ? '#20c060' : '#fff', lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', color: '#4B5563' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Owner row (claimed only) */}
        {isClaimed && v.owner && (
          <div
            onClick={() => onNavigate('user-profile', v.owner_id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px',
              background: '#030508',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              cursor: 'pointer',
            }}
          >
            <UserAvatar avatarUrl={v.owner.avatar_url} handle={v.owner.handle} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.1 }}>
                @{v.owner.handle}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#4B5563', letterSpacing: '.5px', marginTop: 1 }}>
                Owner
              </div>
            </div>
            <TierBadge tier={v.verification_tier} size="small" />
          </div>
        )}

        {/* Actions */}
        <div style={{ background: '#030508', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => handleViewVehicle(v.id)}
            style={{
              width: '100%', padding: '12px',
              background: C.accent, border: 'none', borderRadius: 2,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
              letterSpacing: '1.2px', textTransform: 'uppercase', color: '#000',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Eye style={{ width: 15, height: 15 }} />
            View Vehicle
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleSpotVehicle(v)}
              style={{
                flex: 1, padding: '11px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 2,
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
                letterSpacing: '1px', textTransform: 'uppercase', color: '#fff',
                cursor: 'pointer',
              }}
            >
              Leave a Spot
            </button>
            <button
              onClick={handleClaimVehicle}
              style={{
                flex: 1, padding: '11px',
                background: isClaimed ? 'transparent' : 'rgba(249,115,22,0.08)',
                border: `1px solid ${isClaimed ? 'rgba(255,255,255,0.09)' : 'rgba(249,115,22,0.3)'}`,
                borderRadius: 2,
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
                letterSpacing: '1px', textTransform: 'uppercase',
                color: isClaimed ? '#4B5563' : C.accent,
                cursor: isClaimed ? 'not-allowed' : 'pointer',
              }}
              disabled={!!isClaimed}
            >
              {isClaimed ? 'Claimed' : 'Claim Vehicle'}
            </button>
          </div>

          <button
            onClick={handleClearPlateResult}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600,
              letterSpacing: '.5px', color: '#4B5563', padding: '4px 0', textAlign: 'center',
            }}
          >
            Search Again
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const showPlateResult = plateViewState !== 'idle' && plateViewState !== 'loading';
  const showGeneralResults = query.trim().length >= 2 && hasSearched && !loading;

  return (
    <Layout currentPage="search" onNavigate={onNavigate}>
      <div style={{ paddingBottom: 100, background: '#070a0f', minHeight: '100vh' }}>

        {/* ================================================================ */}
        {/* SECTION 1: PLATE INPUT (always visible unless showing result)   */}
        {/* ================================================================ */}
        {!showPlateResult && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 20,
            background: 'rgba(6,9,14,0.97)', backdropFilter: 'blur(16px)',
            borderBottom: `1px solid ${C.border}`,
            padding: '48px 16px 14px',
          }}>
            <div style={{
              fontFamily: 'Rajdhani, sans-serif', fontSize: 24, fontWeight: 700,
              color: C.text1, marginBottom: 12,
            }}>Explore</div>

            {/* Plate input row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <select
                value={plateState}
                onChange={e => setPlateState(e.target.value)}
                style={{
                  width: 72, padding: '10px 6px',
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700,
                  color: C.text2, outline: 'none', cursor: 'pointer',
                }}
              >
                {US_STATES.map(s => (
                  <option key={s.code} value={s.code}>{s.code}</option>
                ))}
              </select>

              <input
                type="text"
                value={plateNumber}
                onChange={e => setPlateNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="PLATE #"
                maxLength={8}
                style={{
                  flex: 1, padding: '10px 14px',
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600,
                  letterSpacing: '0.12em', color: C.text1, outline: 'none',
                  textTransform: 'uppercase',
                }}
                onFocus={e => (e.target.style.borderColor = C.borderHover)}
                onBlur={e => (e.target.style.borderColor = C.border)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && plateNumber.trim()) {
                    handlePlateSearch(plateState, plateNumber);
                  }
                }}
              />

              <button
                onClick={() => {
                  if (plateNumber.trim()) {
                    handlePlateSearch(plateState, plateNumber);
                  }
                }}
                disabled={!plateNumber.trim()}
                style={{
                  padding: '10px 16px',
                  background: plateNumber.trim() ? C.accent : 'rgba(249,115,22,0.3)',
                  border: 'none', borderRadius: 8,
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase', color: '#000',
                  cursor: plateNumber.trim() ? 'pointer' : 'not-allowed',
                  opacity: plateNumber.trim() ? 1 : 0.5,
                }}
              >
                Search
              </button>
            </div>

            {/* Camera button */}
            <button
              onClick={() => setShowCameraModal(true)}
              style={{
                width: '100%', padding: '9px',
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 8,
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text3,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                marginBottom: 12,
              }}
            >
              <Camera style={{ width: 14, height: 14 }} />
              Scan Plate
            </button>

            {/* General search bar */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none', color: query.startsWith('@') ? C.accent : C.text3,
              }}>
                {query.startsWith('@')
                  ? <User style={{ width: 14, height: 14 }} />
                  : <Search style={{ width: 14, height: 14 }} />
                }
              </div>

              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search vehicles, @users..."
                style={{
                  width: '100%',
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: '10px 36px 10px 36px',
                  fontFamily: query && !query.startsWith('@') ? 'JetBrains Mono, monospace' : 'Barlow, sans-serif',
                  fontSize: 13, color: C.text1, outline: 'none',
                  letterSpacing: !query.startsWith('@') && query ? '0.06em' : 'normal',
                  textTransform: !query.startsWith('@') && query ? 'uppercase' : 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = C.borderHover)}
                onBlur={e => (e.target.style.borderColor = C.border)}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />

              {query && (
                <button
                  onClick={() => { setQuery(''); setUsers([]); setVehicles([]); setHasSearched(false); }}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: C.text3, padding: 2,
                  }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* PLATE LOADING STATE                                             */}
        {/* ================================================================ */}
        {plateViewState === 'loading' && (
          <div style={{ padding: '48px 16px', textAlign: 'center' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '2px solid rgba(249,115,22,0.2)',
              borderTopColor: C.accent,
              animation: 'spin 0.7s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ fontSize: 13, color: C.text3, fontFamily: 'Barlow, sans-serif', margin: 0 }}>
              Searching{' '}
              <span style={{ fontWeight: 600, color: C.text1, letterSpacing: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                {plateStateCode || plateState} {plateNumber}
              </span>
            </p>
          </div>
        )}

        {/* ================================================================ */}
        {/* SECTION 3A: NOT FOUND                                           */}
        {/* ================================================================ */}
        {plateViewState === 'not-found' && (
          <div>
            {/* Void hero — no vehicle found */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: 'linear-gradient(160deg, #0a0a0c, #030508)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to bottom, transparent 0%, #030508 100%)' }} />
              <div style={{ opacity: 0.08 }}>
                <Car style={{ width: 80, height: 80, color: '#fff' }} />
              </div>
              {/* Plate overlaid at bottom */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 16px' }}>
                <div style={{ marginBottom: 8 }}>
                  <LicensePlate plateNumber={plateNumber} plateState={plateStateCode} size="md" />
                </div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#4B5563', lineHeight: 1 }}>
                  No vehicle found
                </div>
                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 1.4 }}>
                  Be the first to log this plate on MotoRate.
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ background: '#030508', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(249,115,22,0.12)' }}>
              <button
                onClick={handleSpotNewVehicle}
                style={{
                  width: '100%', padding: '12px',
                  background: C.accent, border: 'none', borderRadius: 2,
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
                  letterSpacing: '1.2px', textTransform: 'uppercase', color: '#000',
                  cursor: 'pointer',
                }}
              >
                Spot This Vehicle
              </button>
              <button
                onClick={handleClearPlateResult}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600,
                  letterSpacing: '.5px', color: '#4B5563', padding: '4px 0', textAlign: 'center',
                }}
              >
                Search Again
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* SECTION 3B: FOUND UNCLAIMED                                     */}
        {/* ================================================================ */}
        {plateViewState === 'unclaimed' && plateVehicle && renderVehicleResult(plateVehicle)}

        {/* ================================================================ */}
        {/* SECTION 3C: FOUND CLAIMED                                       */}
        {/* ================================================================ */}
        {plateViewState === 'claimed' && plateVehicle && renderVehicleResult(plateVehicle)}

        {/* ================================================================ */}
        {/* GENERAL SEARCH: Loading                                         */}
        {/* ================================================================ */}
        {loading && plateViewState === 'idle' && (
          <div style={{ padding: '32px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              border: '2px solid rgba(249,115,22,0.2)',
              borderTopColor: C.accent,
              animation: 'spin 0.7s linear infinite',
            }} />
          </div>
        )}

        {/* ================================================================ */}
        {/* GENERAL SEARCH: Results                                         */}
        {/* ================================================================ */}
        {showGeneralResults && plateViewState === 'idle' && (
          <>
            {vehicles.length > 0 && (
              <>
                <ResultSection label="Vehicles" count={vehicles.length} />
                {vehicles.map(v => {
                  const name = vehicleName(v);
                  const plate = [v.plate_state, v.plate_number].filter(Boolean).join(' \u00B7 ');
                  return (
                    <div
                      key={v.id}
                      onClick={() => handleViewVehicle(v.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 16px',
                        borderBottom: `1px solid rgba(255,255,255,0.03)`,
                        cursor: 'pointer',
                      }}
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
                          color: C.text1, lineHeight: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {name}
                        </div>
                        {plate && (
                          <div style={{
                            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                            color: C.text3, marginTop: 3, letterSpacing: '0.1em',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {plate}
                          </div>
                        )}
                      </div>

                      <div style={{
                        fontFamily: 'Barlow Condensed, sans-serif', fontSize: 8, fontWeight: 700,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        padding: '3px 8px', borderRadius: 4, flexShrink: 0,
                        ...(v.is_claimed
                          ? { color: '#20c060', background: 'rgba(32,192,96,0.1)', border: '1px solid rgba(32,192,96,0.25)' }
                          : { color: C.text3, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
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
                        color: C.text1,
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
                <Search style={{ width: 32, height: 32, color: C.text3, margin: '0 auto 14px', display: 'block' }} strokeWidth={1} />
                <div style={{
                  fontFamily: 'Rajdhani, sans-serif', fontSize: 18, fontWeight: 700,
                  color: C.text1, marginBottom: 6,
                }}>No results</div>
                <div style={{
                  fontFamily: 'Barlow, sans-serif', fontSize: 12, color: C.text3, lineHeight: 1.5,
                }}>
                  Try a different name, plate number, or start with @ to search users
                </div>
              </div>
            )}
          </>
        )}

        {/* ================================================================ */}
        {/* SECTION 2: RECENT SEARCHES (idle state, no general query)       */}
        {/* ================================================================ */}
        {plateViewState === 'idle' && !query.trim() && !hasSearched && recentSearches.length > 0 && (
          <div style={{ padding: '0 16px' }}>
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.24em', textTransform: 'uppercase', color: C.text3,
              padding: '14px 0 8px',
            }}>
              Recent Searches
            </div>
            {recentSearches.map((entry, i) => (
              <button
                key={`${entry.plateState}-${entry.plateNumber}-${i}`}
                onClick={() => handleRecentSearchTap(entry)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: i < recentSearches.length - 1 ? `1px solid ${C.border}` : 'none',
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: 44, height: 32, borderRadius: 5, overflow: 'hidden',
                  background: C.surface, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {entry.imageUrl ? (
                    <img src={entry.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Car style={{ width: 18, height: 18, color: C.text3 }} />
                  )}
                </div>

                {/* Plate + vehicle info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600,
                    color: C.text1, letterSpacing: '0.1em',
                  }}>
                    {entry.plateState} {entry.plateNumber}
                  </div>
                  {entry.make && (
                    <div style={{
                      fontFamily: 'Barlow, sans-serif', fontSize: 11, color: C.text3,
                      marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {[entry.year, entry.make, entry.model].filter(Boolean).join(' ')}
                    </div>
                  )}
                </div>

                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {showCameraModal && (
        <CameraModal
          onClose={() => setShowCameraModal(false)}
          onPlateDetected={(detected) => {
            setShowCameraModal(false);
            const cleaned = detected.toUpperCase().replace(/[^A-Z0-9]/g, '');
            setPlateNumber(cleaned);
            if (cleaned.length >= 2) {
              handlePlateSearch(plateState, cleaned);
            }
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
            handlePlateSearch(plateStateCode, plateNumber);
          }}
          onSuccess={() => {
            setShowClaimModal(false);
            showToast('Your ride is now verified!', 'success');
            handlePlateSearch(plateStateCode, plateNumber);
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
