import { useState } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { type OnNavigate } from '../types/navigation';
import { ArrowLeft, Camera, Shield, Zap } from 'lucide-react';
import { getVehicleImageUrl } from '../lib/carImageryApi';
import { supabase } from '../lib/supabase';
import { VEHICLE_PLATE_VISIBLE_COLUMNS } from '../lib/vehicles';
import { hashPlate } from '../lib/hash';
import { US_STATES } from '../lib/constants';
import { PlateSearch } from '../components/PlateSearch';
import { PlateNotFound, type CreateVehicleData } from '../components/PlateNotFound';
import { CameraModal } from '../components/spot/CameraModal';
import type { SpotWizardData } from '../types/spot';
import { executeLookup } from '../lib/plateToVinApi';
import { trackSpotEvent, getLookupCredits, consumeLookupCredit } from '../lib/spotAnalytics';
import { type VerificationTier } from '../components/TierBadge';

interface SpotPageProps { onNavigate: OnNavigate; }

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
}

type ViewState =
  | 'choice'
  | 'quick-plate'
  | 'quick-not-found'
  | 'quick-found'
  | 'verified-plate'
  | 'verified-balance-gate'
  | 'verified-no-balance'
  | 'loading';

export function SpotPage({ onNavigate }: SpotPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [viewState, setViewState] = useState<ViewState>('choice');
  const [state, setState] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [plateHash, setPlateHash] = useState('');
  const [foundVehicle, setFoundVehicle] = useState<VehicleResult | null>(null);
  const [lookupCredits, setLookupCredits] = useState(0);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [verifiedLoading, setVerifiedLoading] = useState(false);

  const handleBack = () => {
    setViewState('choice');
    setFoundVehicle(null);
    setState('');
    setStateCode('');
    setPlateNumber('');
    setPlateHash('');
  };

  const resolveCode = (s: string): string => {
    const obj = US_STATES.find(x => x.name.toLowerCase() === s.toLowerCase());
    return obj?.code || s;
  };

  // ── QUICK SPOT ─────────────────────────────────────────────────────────────

  const handleQuickSearch = async (searchState: string, searchPlate: string) => {
    if (!searchPlate.trim()) return;
    const normalized = searchPlate.trim().toUpperCase().replace(/[\s-]/g, '');
    setState(searchState);
    setPlateNumber(normalized);
    setViewState('loading');
    trackSpotEvent('quick_spot_started', user?.id, { plate: normalized });

    try {
      const code = resolveCode(searchState);
      setStateCode(code);
      const hash = await hashPlate(code, normalized);
      setPlateHash(hash);

      const { data, error } = await supabase
        .from('vehicles')
        .select(VEHICLE_PLATE_VISIBLE_COLUMNS)
        .eq('plate_hash', hash)
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (data) {
        setFoundVehicle(data as unknown as VehicleResult);
        setViewState('quick-found');
        trackSpotEvent('cache_hit', user?.id, { plate: normalized });
      } else {
        setFoundVehicle(null);
        setViewState('quick-not-found');
        trackSpotEvent('cache_miss', user?.id, { plate: normalized });
      }
    } catch {
      showToast('Search failed. Please try again.', 'error');
      setViewState('quick-plate');
    }
  };

  // Vehicle found in DB — user can continue Quick Spot or upgrade to Verified
  const handleQuickContinue = () => {
    if (!foundVehicle) return;
    if (!user) { showToast('Please log in to spot vehicles', 'error'); return; }
    const wizardData: SpotWizardData = {
      plateState: stateCode, plateNumber, plateHash,
      vehicleId: foundVehicle.id,
      make: foundVehicle.make || '', model: foundVehicle.model || '',
      color: foundVehicle.color || '',
      year: foundVehicle.year ? String(foundVehicle.year) : undefined,
      trim: foundVehicle.trim || undefined,
      stockImageUrl: foundVehicle.stock_image_url || undefined,
    };
    onNavigate('quick-spot-review', { wizardData });
  };

  // "Verify Now" from pre-submit CTA — vehicle is already in DB, direct to verified-confirm
  const handleVerifyNowFromQuick = () => {
    if (!foundVehicle) return;
    trackSpotEvent('verify_clicked_pre_submit', user?.id);
    trackSpotEvent('quick_to_verified_conversion', user?.id);
    const wizardData: SpotWizardData = {
      plateState: stateCode, plateNumber, plateHash,
      vehicleId: foundVehicle.id,
      make: foundVehicle.make || '', model: foundVehicle.model || '',
      color: foundVehicle.color || '',
      year: foundVehicle.year ? String(foundVehicle.year) : undefined,
      trim: foundVehicle.trim || undefined,
      stockImageUrl: foundVehicle.stock_image_url || undefined,
    };
    onNavigate('verified-confirm', { wizardData });
  };

  // Plate not in DB — manual entry
  const handleCreateVehicle = async (vehicleData: CreateVehicleData) => {
    if (!user) { showToast('Please log in', 'error'); return; }
    setQuickLoading(true);
    try {
      const stockImageUrl = await getVehicleImageUrl(
        vehicleData.make, vehicleData.model,
        vehicleData.year ?? undefined, vehicleData.color || undefined
      );
      const wizardData: SpotWizardData = {
        plateState: stateCode, plateNumber: plateNumber.trim().toUpperCase(), plateHash,
        make: vehicleData.make, model: vehicleData.model,
        color: vehicleData.color || '',
        year: vehicleData.year ? String(vehicleData.year) : undefined,
        trim: vehicleData.trim || undefined,
        stockImageUrl: stockImageUrl || undefined,
      };
      onNavigate('confirm-vehicle', { wizardData });
    } catch {
      showToast('Failed to prepare vehicle.', 'error');
    } finally {
      setQuickLoading(false);
    }
  };

  // ── VERIFIED SPOT ──────────────────────────────────────────────────────────

  const handleVerifiedSearch = async (searchState: string, searchPlate: string) => {
    if (!searchPlate.trim()) return;
    const normalized = searchPlate.trim().toUpperCase().replace(/[\s-]/g, '');
    setState(searchState);
    setPlateNumber(normalized);
    setViewState('loading');
    trackSpotEvent('verified_spot_started', user?.id, { plate: normalized });

    try {
      const code = resolveCode(searchState);
      setStateCode(code);
      const hash = await hashPlate(code, normalized);
      setPlateHash(hash);

      // Cache-first: internal DB only
      const { data: cached } = await supabase
        .from('vehicles')
        .select(VEHICLE_PLATE_VISIBLE_COLUMNS)
        .eq('plate_hash', hash)
        .not('make', 'is', null)
        .maybeSingle();

      if (cached && (cached as any).make && (cached as any).model) {
        trackSpotEvent('cache_hit', user?.id, { plate: normalized });
        const wizardData: SpotWizardData = {
          plateState: code, plateNumber: normalized, plateHash: hash,
          vehicleId: (cached as any).id,
          make: (cached as any).make || '', model: (cached as any).model || '',
          color: (cached as any).color || '',
          year: (cached as any).year ? String((cached as any).year) : undefined,
          trim: (cached as any).trim || undefined,
          stockImageUrl: (cached as any).stock_image_url || undefined,
        };
        onNavigate('verified-confirm', { wizardData });
        return;
      }

      // Cache miss — check lookup credits
      trackSpotEvent('cache_miss', user?.id, { plate: normalized });

      if (!user) {
        showToast('Log in to use Verified Spot', 'error');
        setViewState('verified-plate');
        return;
      }

      const credits = await getLookupCredits(user.id);
      setLookupCredits(credits);

      if (credits <= 0) {
        trackSpotEvent('lookup_blocked_zero_balance', user.id);
        setViewState('verified-no-balance');
      } else {
        setViewState('verified-balance-gate');
      }
    } catch {
      showToast('Search failed. Please try again.', 'error');
      setViewState('verified-plate');
    }
  };

  const handleExecuteLookup = async () => {
    if (!user) return;
    setVerifiedLoading(true);
    try {
      const consumed = await consumeLookupCredit(user.id);
      if (!consumed) { showToast('Could not consume lookup credit.', 'error'); return; }
      trackSpotEvent('lookup_confirmed', user.id, { plate: plateNumber });

      const result = await executeLookup(plateNumber, stateCode, user.id);
      if (result && result.make && result.model) {
        const stockImageUrl = await getVehicleImageUrl(
          result.make, result.model,
          result.year ? parseInt(result.year) : undefined,
          result.color || undefined
        );
        const wizardData: SpotWizardData = {
          plateState: stateCode, plateNumber, plateHash,
          make: result.make, model: result.model,
          color: result.color || '',
          year: result.year || undefined,
          trim: result.trim || undefined,
          stockImageUrl: stockImageUrl || undefined,
          verifiedSpecs: {
            engine: result.engine || null,
            bodyStyle: result.bodyStyle || null,
            transmission: result.transmission || null,
            driveType: result.driveType || null,
          },
        };
        onNavigate('verified-confirm', { wizardData });
      } else {
        showToast('Lookup returned no results. Try Quick Spot instead.', 'error');
        setViewState('verified-plate');
      }
    } catch {
      showToast('Lookup failed. Please try again.', 'error');
    } finally {
      setVerifiedLoading(false);
    }
  };

  // ── SHARED UI HELPERS ──────────────────────────────────────────────────────

  const pageHeader = (title: string, subtitle: string, step: string, onBackFn: () => void) => (
    <div style={{ padding: '52px 16px 20px', background: '#0a0d14', borderBottom: '1px solid rgba(249,115,22,0.10)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={onBackFn} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(3,5,8,0.7)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowLeft size={14} color="#eef4f8" strokeWidth={2} />
        </button>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316' }}>{step}</span>
      </div>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', lineHeight: 1, marginBottom: 4 }}>{title}</div>
      <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e' }}>{subtitle}</div>
    </div>
  );

  const plateForm = (onSearch: (s: string, p: string) => void) => (
    <div style={{ padding: 16 }}>
      <PlateSearch initialPlate={plateNumber} onSearch={onSearch} onCameraScan={() => setShowCameraModal(true)} onNavigateToVehicle={(id) => onNavigate('vehicle-detail', id)} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#3a4e60' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
      </div>
      <button onClick={() => setShowCameraModal(true)} style={{ padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', cursor: 'pointer', width: '100%' }}>
        <Camera size={18} color="#5a6e7e" />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7a8e9e' }}>Scan plate with camera</span>
      </button>
    </div>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>

      {/* ── CHOICE SCREEN ── */}
      {viewState === 'choice' && (
        <div>
          <div style={{ padding: '52px 16px 20px', background: '#0a0d14', borderBottom: '1px solid rgba(249,115,22,0.10)' }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#eef4f8', lineHeight: 1, marginBottom: 4 }}>Log a Spot</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e' }}>How do you want to spot this vehicle?</div>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            <button onClick={() => setViewState('quick-plate')} style={{ width: '100%', padding: '20px 16px', background: '#F97316', border: 'none', borderRadius: 10, cursor: 'pointer', textAlign: 'left' as const }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Zap size={18} color="#030508" />
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#030508', lineHeight: 1 }}>Quick Spot</div>
              </div>
              <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: 'rgba(3,5,8,0.65)' }}>Enter the plate. Free. No lookup credit used.</div>
            </button>
            <button onClick={() => setViewState('verified-plate')} style={{ width: '100%', padding: '20px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, cursor: 'pointer', textAlign: 'left' as const }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Shield size={18} color="#F97316" />
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>Verified Spot</div>
              </div>
              <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e' }}>Pulls factory specs from the plate. Uses 1 lookup credit.</div>
            </button>
          </div>
        </div>
      )}

      {/* ── QUICK — PLATE ENTRY ── */}
      {viewState === 'quick-plate' && (
        <div>
          {pageHeader('Enter the Plate', 'Free — checks our database only', 'Quick Spot \u00b7 Step 1 of 3', handleBack)}
          {plateForm(handleQuickSearch)}
        </div>
      )}

      {/* ── QUICK — PLATE FOUND IN DB ── */}
      {viewState === 'quick-found' && foundVehicle && (
        <div>
          <div style={{ padding: '52px 16px 16px', background: '#0a0d14', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <button onClick={() => setViewState('quick-plate')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, color: '#5a6e7e', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
              <ArrowLeft style={{ width: 14, height: 14 }} /> Back
            </button>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#20c060', marginBottom: 4 }}>Vehicle Found</div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
              {[foundVehicle.year, foundVehicle.make, foundVehicle.model].filter(Boolean).join(' ')}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#F97316', letterSpacing: '0.12em', marginTop: 4 }}>
              {stateCode} \u00b7 {plateNumber}
            </div>
          </div>

          {/* Pre-submit CTA — mandatory */}
          <div style={{ margin: '14px 16px 0', padding: '16px', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.22)', borderRadius: 10 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#F97316', marginBottom: 4 }}>This vehicle is not verified</div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#eef4f8', marginBottom: 3 }}>Verify to boost ranking and visibility</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7a8e9e', marginBottom: 12, lineHeight: 1.5 }}>Verified vehicles rank higher and appear more often in the feed.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleVerifyNowFromQuick}
                style={{ flex: 1, padding: '11px', background: '#F97316', border: 'none', borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer' }}
              >
                Verify Now
              </button>
              <button
                onClick={handleQuickContinue}
                style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#5a6e7e', cursor: 'pointer' }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK — NOT FOUND ── */}
      {viewState === 'quick-not-found' && (
        <PlateNotFound
          state={state}
          plateNumber={plateNumber}
          onCancel={() => setViewState('quick-plate')}
          onCreate={handleCreateVehicle}
          loading={quickLoading}
        />
      )}

      {/* ── VERIFIED — PLATE ENTRY ── */}
      {viewState === 'verified-plate' && (
        <div>
          {pageHeader('Enter the Plate', 'Factory specs from the plate \u00b7 uses 1 lookup credit', 'Verified Spot \u00b7 Step 1 of 3', handleBack)}
          {plateForm(handleVerifiedSearch)}
        </div>
      )}

      {/* ── LOADING ── */}
      {viewState === 'loading' && (
        <div style={{ padding: '40px 16px', textAlign: 'center' as const }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(249,115,22,0.2)', borderTopColor: '#f97316', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#8a9aaa' }}>
            Searching {state} — <span style={{ fontWeight: 600, color: '#eef4f8', letterSpacing: 2 }}>{plateNumber}</span>
          </p>
        </div>
      )}

      {/* ── VERIFIED — BALANCE GATE ── */}
      {viewState === 'verified-balance-gate' && (
        <div style={{ padding: 24 }}>
          <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, color: '#5a6e7e', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
            <ArrowLeft style={{ width: 16, height: 16 }} /> Back
          </button>
          <div style={{ background: '#0d1117', border: '1px solid rgba(249,115,22,0.20)', borderRadius: 12, padding: '20px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Shield size={20} color="#F97316" />
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8' }}>Verify this vehicle?</div>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, color: '#F97316', letterSpacing: '0.15em', marginBottom: 10 }}>{plateNumber}</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7a8e9e', lineHeight: 1.5, marginBottom: 14 }}>
              This plate isn't in our system yet. A lookup will pull factory specs and add this vehicle to MotoRate.
            </div>
            <div style={{ background: '#070a0f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>Cost</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#eef4f8' }}>1 Lookup Credit</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>Remaining Lookups</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#F97316' }}>{lookupCredits}</span>
              </div>
            </div>
          </div>
          <button onClick={handleExecuteLookup} disabled={verifiedLoading} style={{ width: '100%', padding: '14px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#030508', cursor: verifiedLoading ? 'not-allowed' : 'pointer', opacity: verifiedLoading ? 0.6 : 1, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {verifiedLoading && <div style={{ width: 14, height: 14, border: '2px solid #030508', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
            {verifiedLoading ? 'Looking up...' : 'Confirm \u2014 Use 1 Lookup Credit'}
          </button>
          <button onClick={handleBack} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#5a6e7e', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {/* ── VERIFIED — NO BALANCE ── */}
      {viewState === 'verified-no-balance' && (
        <div style={{ padding: 24 }}>
          <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, color: '#5a6e7e', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
            <ArrowLeft style={{ width: 16, height: 16 }} /> Back
          </button>
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '28px 16px', textAlign: 'center' as const }}>
            <Shield size={32} color="#3a4e60" style={{ margin: '0 auto 14px', display: 'block' }} />
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', marginBottom: 6 }}>You're out of lookups</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#F97316', marginBottom: 12 }}>0 Remaining Lookups</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7a8e9e', lineHeight: 1.5, marginBottom: 20 }}>
              Get more lookups to continue with Verified Spot, or use Quick Spot — it's free.
            </div>
            <button onClick={() => onNavigate('premium')} style={{ width: '100%', padding: '13px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer', marginBottom: 10 }}>
              Get More Lookups
            </button>
            <button onClick={() => setViewState('quick-plate')} style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#5a6e7e', cursor: 'pointer' }}>
              Use Quick Spot Instead
            </button>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {showCameraModal && (
        <CameraModal
          onClose={() => setShowCameraModal(false)}
          onPlateDetected={(detected) => { setShowCameraModal(false); setPlateNumber(detected.toUpperCase()); }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
