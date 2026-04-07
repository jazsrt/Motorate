import { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { type OnNavigate } from '../types/navigation';
import { ArrowLeft, Camera, Car, Check, Star, Heart, ThumbsDown, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { hashPlate } from '../lib/hash';
import { US_STATES } from '../lib/constants';
import { CameraModal } from '../components/spot/CameraModal';
import { StickerSelector } from '../components/StickerSelector';
import { giveSticker } from '../lib/stickerService';
import { calculateAndAwardReputation } from '../lib/reputation';
import { uploadImage } from '../lib/storage';
import { sounds } from '../lib/sounds';
import { haptics } from '../lib/haptics';
import { trackSpotEvent } from '../lib/spotAnalytics';
import { searchPlate, type VehicleResult } from '../lib/plateSearch';
import type { SpotWizardData } from '../types/spot';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpotPageProps { onNavigate: OnNavigate; }

type SpotViewState = 'plate-entry' | 'loading' | 'found' | 'not-found' | 'review' | 'success' | 'error';

interface RecentSpot {
  plateState: string;
  plateNumber: string;
  make?: string | null;
  model?: string | null;
  ts: number;
}

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const C = {
  bg: '#030508',
  surface: '#0d1117',
  accent: '#F97316',
  green: '#20c060',
  text1: '#eef4f8',
  text2: '#7a8e9e',
  text3: '#5a6e7e',
  border: 'rgba(255,255,255,0.06)',
};

// ---------------------------------------------------------------------------
// Recent spots helpers (localStorage)
// ---------------------------------------------------------------------------

function recentSpotsKey(userId: string) { return `motorate_recent_spots_${userId}`; }

function loadRecentSpots(userId: string): RecentSpot[] {
  try {
    const raw = localStorage.getItem(recentSpotsKey(userId));
    return raw ? (JSON.parse(raw) as RecentSpot[]).slice(0, 3) : [];
  } catch { return []; }
}

function saveRecentSpot(userId: string, entry: RecentSpot) {
  const existing = loadRecentSpots(userId);
  const filtered = existing.filter(e => !(e.plateState === entry.plateState && e.plateNumber === entry.plateNumber));
  localStorage.setItem(recentSpotsKey(userId), JSON.stringify([entry, ...filtered].slice(0, 3)));
}

// ---------------------------------------------------------------------------
// Star Row component
// ---------------------------------------------------------------------------

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.text2 }}>{label}</span>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} onClick={() => onChange(star)} onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <Star style={{ width: 14, height: 14, fill: star <= (hovered || value) ? '#f0a030' : 'none', color: star <= (hovered || value) ? '#f0a030' : '#3a4e60' }} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggested stickers based on vehicle specs
// ---------------------------------------------------------------------------

function getSuggestedStickerTags(vehicle: VehicleResult): string[] {
  const suggestions: string[] = [];
  const cylinders = parseInt(vehicle.cylinders ?? '0');
  const bodyType = (vehicle.bodyStyle ?? '').toLowerCase();
  const engineSize = parseFloat((vehicle.engine ?? '').match(/(\d+\.?\d*)\s*L/i)?.[1] ?? '0');
  const fuelType = (vehicle.fuel ?? '').toLowerCase();

  if (bodyType.includes('sedan') || bodyType.includes('hatchback')) suggestions.push('daily-driver');
  if (bodyType.includes('truck') || bodyType.includes('suv')) suggestions.push('built');
  if (bodyType.includes('coupe') || bodyType.includes('convertible')) suggestions.push('head-turner');

  if (cylinders >= 8 || engineSize >= 5.0) suggestions.push('loud');
  if (cylinders >= 6 || engineSize >= 3.5) suggestions.push('fast');
  if (cylinders <= 4 && engineSize > 0 && engineSize <= 2.0) suggestions.push('daily-driver');

  if (fuelType === 'electric') suggestions.push('silent-storm');
  if (fuelType === 'gasoline' && engineSize >= 3.0) suggestions.push('gas-guzzler');
  if (fuelType === 'gasoline' && engineSize > 0 && engineSize < 2.5) suggestions.push('city-car');

  return [...new Set(suggestions)].slice(0, 4);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SpotPage({ onNavigate }: SpotPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  // State machine
  const [viewState, setViewState] = useState<SpotViewState>('plate-entry');

  // Plate entry
  const [plateState, setPlateState] = useState('IL');
  const [plateNumber, setPlateNumber] = useState('');
  const [plateHash, setPlateHash] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [recentSpots, setRecentSpots] = useState<RecentSpot[]>([]);

  // Found vehicle
  const [foundVehicle, setFoundVehicle] = useState<VehicleResult | null>(null);
  const [spotCount, setSpotCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [noCredits, setNoCredits] = useState(false);

  // Review (4 required vehicle ratings — driver/driving removed)
  const [vehicleRating, setVehicleRating] = useState(0);
  const [looksRating, setLooksRating] = useState(0);
  const [soundRating, setSoundRating] = useState(0);
  const [conditionRating, setConditionRating] = useState(0);
  const [sentiment, setSentiment] = useState<'love' | 'neutral' | 'hate' | null>(null);
  const [comment, setComment] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedStickerIds, setSelectedStickerIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [existingSpotId, setExistingSpotId] = useState<string | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Success
  const [successVehicleId, setSuccessVehicleId] = useState<string | null>(null);

  // Error
  const [errorMessage, setErrorMessage] = useState('');

  // Load recent spots
  useEffect(() => {
    if (user?.id) setRecentSpots(loadRecentSpots(user.id));
  }, [user?.id]);

  // ---------------------------------------------------------------------------
  // Plate search
  // ---------------------------------------------------------------------------

  const handlePlateSearch = async (searchStateCode: string, searchPlateNumber: string) => {
    const normalized = searchPlateNumber.trim().toUpperCase().replace(/[\s-]/g, '');
    if (!normalized || normalized.length < 2 || normalized.length > 8) {
      showToast('Enter a valid plate (2-8 characters)', 'error');
      return;
    }

    setPlateNumber(normalized);
    setStateCode(searchStateCode);
    setViewState('loading');
    setFoundVehicle(null);
    setNoCredits(false);

    console.log('[SpotPage] searchPlate called with:', searchStateCode, normalized);
    const result = await searchPlate(searchStateCode, normalized, user?.id);
    console.log('[SpotPage] searchPlate result:', result.status, result);

    if (result.plateHash) setPlateHash(result.plateHash);

    if (result.status === 'found' && result.vehicle) {
      setFoundVehicle(result.vehicle);

      // Fetch spot + follower counts if we have a vehicle ID
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
        saveRecentSpot(user.id, { plateState: searchStateCode, plateNumber: normalized, make: result.vehicle.make, model: result.vehicle.model, ts: Date.now() });
        setRecentSpots(loadRecentSpots(user.id));
      }

      setViewState('found');
    } else if (result.status === 'not-found') {
      setNoCredits(!!result.noCredits);
      setViewState('not-found');
    } else {
      setErrorMessage(result.error || 'Search failed');
      setViewState('error');
    }
  };

  // ---------------------------------------------------------------------------
  // Submit spot
  // ---------------------------------------------------------------------------

  const ratingsComplete = vehicleRating > 0 && looksRating > 0 && soundRating > 0 && conditionRating > 0;
  const canSubmit = ratingsComplete && sentiment !== null;

  const handleSubmitSpot = async () => {
    if (!user || !canSubmit || submitting) return;

    setSubmitting(true);
    try {
      // Ensure vehicle exists in DB
      let vehicleId = foundVehicle?.id;

      if (!vehicleId) {
        // Create vehicle from API/manual data
        const hash = plateHash || await hashPlate(stateCode, plateNumber);
        const { data: existing } = await supabase.from('vehicles').select('id').eq('plate_hash', hash).maybeSingle();
        if (existing) {
          vehicleId = existing.id;
        } else {
          const { data: newVehicle, error: createErr } = await supabase
            .from('vehicles')
            .insert({
              plate_hash: hash,
              plate_state: stateCode,
              plate_number: plateNumber,
              make: foundVehicle?.make || null,
              model: foundVehicle?.model || null,
              color: foundVehicle?.color || null,
              year: foundVehicle?.year || null,
              trim: foundVehicle?.trim || null,
              stock_image_url: foundVehicle?.stock_image_url || null,
              is_claimed: false,
              verification_tier: 'shadow',
              created_by_user_id: user.id,
            })
            .select('id')
            .single();
          if (createErr) throw new Error('Failed to create vehicle');
          vehicleId = newVehicle.id;
        }
      }

      // Duplicate check
      if (!existingSpotId) {
        const { data: existingSpot } = await supabase
          .from('spot_history')
          .select('id')
          .eq('spotter_id', user.id)
          .eq('vehicle_id', vehicleId)
          .maybeSingle();

        if (existingSpot) {
          setExistingSpotId(existingSpot.id);
          setShowDuplicateWarning(true);
          setSubmitting(false);
          return;
        }
      }

      // Upload photo
      let photoUrl: string | null = null;
      if (photoFile) {
        try { photoUrl = await uploadImage(photoFile, 'reviews'); } catch { /* non-blocking */ }
      }

      // Spot history: insert or update
      let spotId: string;
      if (existingSpotId) {
        await supabase.from('spot_history').update({ spot_type: 'quick', ...(photoUrl ? { photo_url: photoUrl } : {}) }).eq('id', existingSpotId);
        spotId = existingSpotId;
      } else {
        const payload: Record<string, unknown> = { spotter_id: user.id, vehicle_id: vehicleId, spot_type: 'quick', reputation_earned: 10 };
        if (photoUrl) payload.photo_url = photoUrl;
        const { data: spotData, error: spotErr } = await supabase.from('spot_history').insert(payload).select('id').single();
        if (spotErr) throw new Error('Failed to record spot');
        spotId = spotData.id;
      }

      try { sounds.revEngine(); haptics.medium(); } catch { /* intentionally empty */ }

      // Review
      const { data: reviewData, error: reviewErr } = await supabase
        .from('reviews')
        .insert({
          vehicle_id: vehicleId, author_id: user.id,
          rating_vehicle: vehicleRating,
          looks_rating: looksRating, sound_rating: soundRating, condition_rating: conditionRating,
          sentiment, comment: comment.trim() || null, spot_type: 'quick', spot_history_id: spotId,
        })
        .select('id')
        .single();

      if (reviewErr) throw new Error('Failed to record review');

      // Feed post (only if image available)
      let feedImage = photoUrl;
      if (!feedImage) {
        const { data: vImg } = await supabase.from('vehicles').select('profile_image_url, stock_image_url').eq('id', vehicleId).maybeSingle();
        feedImage = vImg?.profile_image_url || vImg?.stock_image_url || null;
      }
      if (feedImage) {
        await supabase.from('posts').insert({
          author_id: user.id, vehicle_id: vehicleId, post_type: 'spot', spot_type: 'quick',
          caption: comment.trim() || null, image_url: feedImage, spot_history_id: spotId, review_id: reviewData.id,
          rating_vehicle: vehicleRating,
          looks_rating: looksRating, sound_rating: soundRating, condition_rating: conditionRating,
          sentiment, moderation_status: 'approved', privacy_level: 'public',
        });
      }

      // Reputation
      if (!existingSpotId) {
        await calculateAndAwardReputation({ userId: user.id, action: 'SPOT_QUICK_REVIEW', referenceType: 'review', referenceId: reviewData.id });
      }

      trackSpotEvent('spot_created', user.id, { vehicleId, plate: plateNumber });

      // Badges
      try {
        await supabase.rpc('check_and_award_badges', { p_user_id: user.id, p_action: 'spot' });
        await supabase.rpc('check_and_award_badges', { p_user_id: user.id, p_action: 'review' });
      } catch { /* intentionally empty */ }

      // Stickers
      for (const stickerId of selectedStickerIds) {
        await giveSticker(vehicleId, stickerId, user.id);
      }

      // Notify owner
      try {
        const { data: vehicleData } = await supabase.from('vehicles').select('owner_id').eq('id', vehicleId).maybeSingle();
        if (vehicleData?.owner_id && vehicleData.owner_id !== user.id) {
          const { data: spotter } = await supabase.from('profiles').select('handle').eq('id', user.id).maybeSingle();
          await supabase.from('notifications').insert({
            user_id: vehicleData.owner_id, type: 'spot', title: 'Your vehicle was spotted!',
            body: `@${spotter?.handle || 'Someone'} spotted your vehicle`,
            reference_type: 'spot_history', reference_id: spotId,
          });
        }
      } catch { /* intentionally empty */ }

      setSuccessVehicleId(vehicleId);
      setViewState('success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Photo helpers
  // ---------------------------------------------------------------------------

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    setPhotoFile(null); setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  const resetToPlateEntry = () => {
    setViewState('plate-entry');
    setFoundVehicle(null);
    setPlateNumber('');
    setPlateHash('');
    setSpotCount(0);
    setFollowerCount(0);
    setNoCredits(false);
    setErrorMessage('');
    setExistingSpotId(null);
    setShowDuplicateWarning(false);
    setVehicleRating(0);
    setLooksRating(0); setSoundRating(0); setConditionRating(0);
    setSentiment(null); setComment(''); clearPhoto();
    setSelectedStickerIds([]);
  };

  const vehicleName = foundVehicle ? [foundVehicle.year, foundVehicle.make, foundVehicle.model].filter(Boolean).join(' ') : '';
  const heroImage = foundVehicle?.profile_image_url || foundVehicle?.stock_image_url || null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>

      {/* ================================================================ */}
      {/* SCREEN 1 — PLATE ENTRY                                          */}
      {/* ================================================================ */}
      {viewState === 'plate-entry' && (
        <div style={{ minHeight: '100vh', paddingBottom: 100 }}>
          <div style={{ padding: '52px 16px 20px', background: '#0a0d14', borderBottom: '1px solid rgba(249,115,22,0.10)' }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: C.text1, lineHeight: 1 }}>
              Spot a Vehicle
            </div>
          </div>

          {/* Plate input */}
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <select
                value={plateState}
                onChange={e => setPlateState(e.target.value)}
                style={{ width: 72, padding: '10px 6px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, color: C.text2, outline: 'none', cursor: 'pointer' }}
              >
                {US_STATES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
              </select>
              <input
                type="text"
                value={plateNumber}
                onChange={e => setPlateNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="PLATE #"
                maxLength={8}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && plateNumber.trim()) handlePlateSearch(plateState, plateNumber); }}
                style={{ flex: 1, padding: '10px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600, letterSpacing: '0.12em', color: C.text1, outline: 'none', textTransform: 'uppercase' }}
              />
            </div>

            {/* Find Vehicle — primary */}
            <button
              onClick={() => plateNumber.trim() && handlePlateSearch(plateState, plateNumber)}
              disabled={!plateNumber.trim()}
              style={{ width: '100%', minHeight: 44, padding: '12px', background: plateNumber.trim() ? C.accent : 'rgba(249,115,22,0.3)', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#030508', cursor: plateNumber.trim() ? 'pointer' : 'not-allowed', opacity: plateNumber.trim() ? 1 : 0.4, marginBottom: 8 }}
            >
              Find Vehicle
            </button>

            {/* Scan Plate — secondary ghost */}
            <button
              onClick={() => setShowCameraModal(true)}
              style={{ width: '100%', minHeight: 44, padding: '10px', background: 'transparent', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Camera size={14} /> Scan Plate
            </button>
          </div>

          {/* Recent spots */}
          {recentSpots.length > 0 && (
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.text3, marginBottom: 8 }}>
                Recent
              </div>
              {recentSpots.map((s, i) => (
                <button
                  key={`${s.plateState}-${s.plateNumber}-${i}`}
                  onClick={() => { setPlateState(s.plateState); handlePlateSearch(s.plateState, s.plateNumber); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < recentSpots.length - 1 ? `1px solid ${C.border}` : 'none', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: C.text1, letterSpacing: '0.08em' }}>{s.plateState} {s.plateNumber}</span>
                    {s.make && <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: C.text3, marginLeft: 8 }}>{s.make} {s.model}</span>}
                  </div>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, color: C.text3, flexShrink: 0 }}>
                    {new Date(s.ts).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* SCREEN 2 — LOADING                                              */}
      {/* ================================================================ */}
      {viewState === 'loading' && (
        <div style={{ padding: '80px 16px', textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(249,115,22,0.2)', borderTopColor: C.accent, animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, color: C.text1, letterSpacing: '0.1em', marginBottom: 4 }}>
            {stateCode || plateState} {plateNumber}
          </div>
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: C.text3 }}>Looking up vehicle...</div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SCREEN 3 — FOUND                                                */}
      {/* ================================================================ */}
      {viewState === 'found' && foundVehicle && (
        <div style={{ paddingBottom: 100 }}>
          {/* Vehicle image hero */}
          <div style={{ position: 'relative', width: '100%', height: 220, overflow: 'hidden' }}>
            {heroImage ? (
              <img src={heroImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#111720', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Car style={{ width: 48, height: 48, color: '#2c3a50' }} />
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.95) 0%, transparent 50%)' }} />
            <button onClick={resetToPlateEntry} style={{ position: 'absolute', top: 14, left: 14, width: 32, height: 32, borderRadius: 8, background: 'rgba(3,5,8,0.7)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
              <ArrowLeft size={14} color={C.text1} strokeWidth={2} />
            </button>
            <div style={{ position: 'absolute', bottom: 14, left: 16, zIndex: 2 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: C.accent }}>{foundVehicle.make || 'Unknown'}</div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: C.text1, lineHeight: 1 }}>{foundVehicle.model || 'Vehicle'}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.accent, letterSpacing: '0.1em', marginTop: 3 }}>{stateCode} {plateNumber}</div>
            </div>
          </div>

          {/* Stats + claimed chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: C.text3 }}>{spotCount} spots · {followerCount} followers</span>
            {foundVehicle.is_claimed && (
              <span style={{ marginLeft: 'auto', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.green, background: 'rgba(32,192,96,0.1)', border: '1px solid rgba(32,192,96,0.25)', borderRadius: 4, padding: '2px 7px' }}>
                Claimed
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => setViewState('review')} style={{ width: '100%', minHeight: 44, background: C.accent, border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#030508', cursor: 'pointer' }}>
              Leave a Spot
            </button>
            <button
              onClick={() => foundVehicle.id ? onNavigate('vehicle-detail', { vehicleId: foundVehicle.id }) : null}
              style={{ width: '100%', minHeight: 44, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text3, cursor: 'pointer' }}
            >
              View Vehicle Page
            </button>
            {!foundVehicle.is_claimed && foundVehicle.id && (
              <button
                onClick={() => onNavigate('claim-vehicle', { vehicleId: foundVehicle.id, plateNumber, plateState: stateCode, make: foundVehicle.make, model: foundVehicle.model, year: foundVehicle.year })}
                style={{ width: '100%', minHeight: 44, background: 'transparent', border: '1px solid rgba(32,192,96,0.25)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.green, cursor: 'pointer' }}
              >
                Claim This Vehicle
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SCREEN 4 — NOT FOUND                                            */}
      {/* ================================================================ */}
      {viewState === 'not-found' && (
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: C.accent, letterSpacing: '0.12em', marginBottom: 16 }}>
            {stateCode} {plateNumber}
          </div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: C.text1, marginBottom: 6 }}>
            No vehicle found for {stateCode} {plateNumber}
          </div>
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 6 }}>
            Be the first to log this vehicle on MotoRate.
          </div>
          {noCredits && (
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: C.text3, marginBottom: 16 }}>
              Get more lookups with <span style={{ color: C.accent, cursor: 'pointer' }} onClick={() => onNavigate('premium')}>Pro</span>
            </div>
          )}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => setViewState('review')} style={{ width: '100%', minHeight: 44, background: C.accent, border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#030508', cursor: 'pointer' }}>
              Spot This Vehicle
            </button>
            <button onClick={resetToPlateEntry} style={{ width: '100%', minHeight: 44, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text3, cursor: 'pointer' }}>
              Search Again
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SCREEN 5 — REVIEW                                               */}
      {/* ================================================================ */}
      {viewState === 'review' && (
        <div style={{ paddingBottom: 120 }}>
          {/* Hero */}
          <div style={{ position: 'relative', width: '100%', height: 180, overflow: 'hidden', background: '#111720' }}>
            {heroImage ? (
              <>
                <img src={heroImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.85) 0%, transparent 60%)' }} />
              </>
            ) : null}
            <button onClick={() => foundVehicle?.id ? setViewState('found') : resetToPlateEntry} style={{ position: 'absolute', top: 14, left: 14, width: 32, height: 32, borderRadius: 8, background: 'rgba(3,5,8,0.7)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
              <ArrowLeft size={14} color={C.text1} strokeWidth={2} />
            </button>
            <div style={{ position: 'absolute', bottom: 12, left: 16, zIndex: 2 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: C.accent }}>{foundVehicle?.make || ''}</div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: C.text1, lineHeight: 1 }}>{foundVehicle?.model || 'Vehicle'}</div>
            </div>
          </div>

          {/* API specs strip — only for API-sourced vehicles (no DB id yet) */}
          {!foundVehicle?.id && foundVehicle && (() => {
            const specs: { value: string; label: string }[] = [];
            if (foundVehicle.engine) specs.push({ value: foundVehicle.engine, label: 'ENGINE' });
            if (foundVehicle.cylinders) specs.push({ value: foundVehicle.cylinders, label: 'CONFIG' });
            if (foundVehicle.driveType) {
              const dt = foundVehicle.driveType;
              const abbr = dt.toLowerCase().includes('front') ? 'FWD' : dt.toLowerCase().includes('rear') ? 'RWD' : dt.toLowerCase().includes('all') ? 'AWD' : dt.toLowerCase().includes('4') ? '4WD' : dt;
              specs.push({ value: abbr, label: 'DRIVE' });
            }
            if (foundVehicle.fuel) specs.push({ value: foundVehicle.fuel, label: 'FUEL' });
            if (foundVehicle.msrp) specs.push({ value: foundVehicle.msrp.replace(' USD', ''), label: 'MSRP' });
            if (specs.length === 0) return null;
            return (
              <>
                <div style={{ display: 'flex', overflowX: 'auto', background: '#0d1117', borderTop: '1px solid rgba(249,115,22,0.10)', borderBottom: '1px solid rgba(249,115,22,0.10)', scrollbarWidth: 'none' }}>
                  {specs.map((s, i) => (
                    <div key={i} style={{ flexShrink: 0, padding: '10px 16px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#eef4f8', display: 'block', fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5a6e7e', display: 'block', marginTop: 2 }}>{s.label}</span>
                    </div>
                  ))}
                </div>
                {foundVehicle.vin && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', background: '#070a0f', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#3a4e60', letterSpacing: '0.06em' }}>VIN {foundVehicle.vin}</span>
                  </div>
                )}
              </>
            );
          })()}

          {/* Ratings — all 4 required */}
          <StarRow label="Vehicle" value={vehicleRating} onChange={setVehicleRating} />
          <StarRow label="Looks" value={looksRating} onChange={setLooksRating} />
          <StarRow label="Sound" value={soundRating} onChange={setSoundRating} />
          <StarRow label="Condition" value={conditionRating} onChange={setConditionRating} />

          {/* Sentiment — 3 buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '12px 16px' }}>
            {([
              { value: 'love' as const, label: 'Love It', icon: <Heart style={{ width: 14, height: 14, fill: sentiment === 'love' ? C.accent : 'none' }} />, ac: C.accent, bg: 'rgba(249,115,22,0.1)', bd: 'rgba(249,115,22,0.4)' },
              { value: 'neutral' as const, label: "It's OK", icon: null, ac: C.text2, bg: 'rgba(255,255,255,0.06)', bd: 'rgba(255,255,255,0.2)' },
              { value: 'hate' as const, label: 'Not For Me', icon: <ThumbsDown style={{ width: 14, height: 14, fill: sentiment === 'hate' ? '#ef4444' : 'none' }} />, ac: '#ef4444', bg: 'rgba(239,68,68,0.08)', bd: 'rgba(239,68,68,0.3)' },
            ]).map(opt => {
              const active = sentiment === opt.value;
              return (
                <button key={opt.value} onClick={() => setSentiment(opt.value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, padding: '10px 4px', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', ...(active ? { background: opt.bg, border: `1px solid ${opt.bd}`, color: opt.ac } : { background: 'transparent', border: `1px solid ${C.border}`, color: C.text3 }) }}>
                  {opt.icon} {opt.label}
                </button>
              );
            })}
          </div>

          {/* Stickers — with suggestions */}
          <div style={{ padding: '0 16px 10px' }}>
            {foundVehicle && !foundVehicle.id && (() => {
              const suggestedTags = getSuggestedStickerTags(foundVehicle);
              if (suggestedTags.length === 0) return null;
              return (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3a4e60', marginBottom: 4 }}>Suggested</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {suggestedTags.map(tag => {
                      const isSelected = selectedStickerIds.includes(tag);
                      return (
                        <button key={tag} onClick={() => setSelectedStickerIds(prev => prev.includes(tag) ? prev.filter(s => s !== tag) : [...prev, tag])}
                          style={{ padding: '4px 10px', borderRadius: 12, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', border: isSelected ? '1px solid rgba(249,115,22,0.40)' : '1px solid rgba(249,115,22,0.30)', background: isSelected ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.10)', color: isSelected ? '#F97316' : '#7a8e9e' }}>
                          {tag.replace(/-/g, ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            <StickerSelector selectedStickers={selectedStickerIds} onToggleSticker={(id) => setSelectedStickerIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])} />
          </div>

          {/* Caption */}
          <div style={{ margin: '0 16px 10px' }}>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a caption..." rows={2}
              style={{ width: '100%', padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "'Barlow', sans-serif", fontSize: 12, color: C.text1, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Photo */}
          <div style={{ padding: '0 16px 12px' }}>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} style={{ display: 'none' }} />
            {photoPreview ? (
              <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                <img src={photoPreview} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                <button onClick={clearPhoto} style={{ position: 'absolute', top: 6, right: 6, padding: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X style={{ width: 14, height: 14, color: '#fff' }} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'transparent', border: `1px dashed ${C.border}`, borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.text3, cursor: 'pointer' }}>
                <Camera style={{ width: 14, height: 14 }} /> Add a Photo (optional)
              </button>
            )}
          </div>

          {/* Duplicate warning */}
          {showDuplicateWarning && (
            <div style={{ position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 61, background: C.surface, border: `1px solid rgba(249,115,22,0.3)`, borderRadius: 10, padding: 14 }}>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: C.text1, margin: '0 0 10px' }}>You've spotted this vehicle before.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowDuplicateWarning(false); handleSubmitSpot(); }} style={{ flex: 1, minHeight: 44, background: C.accent, border: 'none', borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#030508', cursor: 'pointer' }}>Update My Spot</button>
                <button onClick={() => { setShowDuplicateWarning(false); setExistingSpotId(null); }} style={{ flex: 1, minHeight: 44, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text3, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Fixed submit */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60, padding: '12px 16px 20px', background: 'rgba(3,5,8,0.95)', backdropFilter: 'blur(8px)', borderTop: `1px solid ${C.border}` }}>
            <button onClick={handleSubmitSpot} disabled={!canSubmit || submitting} style={{ width: '100%', minHeight: 44, background: C.accent, border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#030508', cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed', opacity: canSubmit && !submitting ? 1 : 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {submitting ? <div style={{ width: 16, height: 16, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : null}
              {submitting ? 'Submitting...' : existingSpotId ? 'Update Spot' : 'Submit Spot'}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SCREEN 6 — SUCCESS                                              */}
      {/* ================================================================ */}
      {viewState === 'success' && (
        <div style={{ padding: '64px 20px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', border: `3px solid ${C.green}`, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={28} color={C.green} strokeWidth={2.5} />
          </div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: C.text1, marginBottom: 4 }}>Spot Submitted</div>
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: C.text2, marginBottom: 6 }}>{vehicleName}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.accent, letterSpacing: '0.1em', marginBottom: 28 }}>{stateCode} {plateNumber}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {successVehicleId && (
              <button onClick={() => onNavigate('vehicle-detail', { vehicleId: successVehicleId })} style={{ width: '100%', minHeight: 44, background: C.accent, border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#030508', cursor: 'pointer' }}>
                View Vehicle Page
              </button>
            )}
            <button onClick={resetToPlateEntry} style={{ width: '100%', minHeight: 44, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text3, cursor: 'pointer' }}>
              Spot Another
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SCREEN 7 — ERROR                                                */}
      {/* ================================================================ */}
      {viewState === 'error' && (
        <div style={{ padding: '64px 20px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: C.text1, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: C.text3, marginBottom: 24 }}>{errorMessage}</div>
          <button onClick={resetToPlateEntry} style={{ width: '100%', minHeight: 44, background: C.accent, border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#030508', cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      )}

      {/* Camera Modal */}
      {showCameraModal && (
        <CameraModal
          onClose={() => setShowCameraModal(false)}
          onPlateDetected={(detected) => {
            setShowCameraModal(false);
            const cleaned = detected.toUpperCase().replace(/[^A-Z0-9]/g, '');
            setPlateNumber(cleaned);
            if (cleaned.length >= 2) handlePlateSearch(plateState, cleaned);
          }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
