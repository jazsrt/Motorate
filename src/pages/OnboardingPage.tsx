import { useState } from 'react';
import { ArrowRight, Loader, AlertCircle, ChevronDown, LogOut, LayoutGrid, Activity, Home, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { hashPlate } from '../lib/hash';
import {
  VEHICLE_YEARS,
  VEHICLE_MAKES,
  VEHICLE_MODELS,
  VEHICLE_COLORS,
  US_STATES,
} from '../data/vehicleData';

type Step = 'welcome' | 'handle' | 'vehicle';

interface VehicleData {
  year: string;
  make: string;
  model: string;
  trim: string;
  color: string;
  plateState: string;
  plateNumber: string;
}

const labelStyle: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a8e9e', marginBottom: 6, display: 'block' };
const inputStyle: React.CSSProperties = { width: '100%', background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '12px 14px', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#eef4f8', outline: 'none' };
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none' as const, paddingRight: 36 };
const primaryBtnStyle: React.CSSProperties = { width: '100%', padding: '14px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
const ghostBtnStyle: React.CSSProperties = { padding: '12px 20px', background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a8e9e', cursor: 'pointer' };

const HOW_IT_WORKS = [
  {
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#F97316' : '#7a8e9e'} strokeWidth="2">
        <circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
      </svg>
    ),
    title: 'Spot',
    desc: 'See a car you like? Scan the plate. Rate it. Earn RP.',
  },
  {
    icon: (_: boolean) => <Home size={22} strokeWidth={2} />,
    title: 'Garage',
    desc: 'Claim your vehicle. Build its reputation over time.',
  },
  {
    icon: (_: boolean) => <Activity size={22} strokeWidth={2} />,
    title: 'Rankings',
    desc: 'Vehicles ranked by community reputation, not followers.',
  },
  {
    icon: (_: boolean) => <Award size={22} strokeWidth={2} />,
    title: 'Badges',
    desc: 'Hit milestones. Unlock badges. Level up your tier.',
  },
];

export default function OnboardingPage() {
  const { user, refreshProfile, signOut } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('welcome');
  const [handle, setHandle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const [vehicleData, setVehicleData] = useState<VehicleData>({
    year: '', make: '', model: '', trim: '', color: '', plateState: '', plateNumber: ''
  });

  const availableModels = vehicleData.make && VEHICLE_MODELS[vehicleData.make]
    ? VEHICLE_MODELS[vehicleData.make] : [];

  // ── Handle submit ──
  const handleHandleSubmit = async () => {
    if (!handle.trim()) { setError('Please enter a username'); return; }
    if (handle.trim().length < 3) { setError('Username must be at least 3 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(handle.trim())) { setError('Letters, numbers, and underscores only'); return; }

    setIsProcessing(true);
    setError('');
    try {
      const { data: existing } = await supabase.from('profiles').select('id').eq('handle', handle.trim().toLowerCase()).maybeSingle();
      if (existing) { setError('This username is already taken'); setIsProcessing(false); return; }

      const { error: profileError } = await supabase.from('profiles')
        .update({ handle: handle.trim().toLowerCase() })
        .eq('id', user!.id);
      if (profileError) throw profileError;

      await refreshProfile();
      setStep('vehicle');
    } catch (err: any) {
      setError(err.message || 'Failed to save username');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Skip vehicle ──
  const handleSkipVehicle = async () => {
    setIsProcessing(true);
    try {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user!.id);
      await refreshProfile();
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Vehicle submit ──
  const handleVehicleSubmit = async () => {
    if (!vehicleData.year || !vehicleData.make || !vehicleData.model || !vehicleData.plateState || !vehicleData.plateNumber) {
      setError('Fill in all required fields'); return;
    }
    setIsProcessing(true);
    setError('');
    try {
      const plateHash = await hashPlate(vehicleData.plateState, vehicleData.plateNumber.trim().toUpperCase());
      const { error: vErr } = await supabase.from('vehicles').insert({
        plate_hash: plateHash,
        plate_state: vehicleData.plateState,
        plate_number: vehicleData.plateNumber.trim().toUpperCase(),
        owner_id: user!.id,
        year: parseInt(vehicleData.year),
        make: vehicleData.make,
        model: vehicleData.model,
        trim: vehicleData.trim || null,
        color: vehicleData.color || null,
        is_claimed: true,
        verification_tier: 'unverified',
        claimed_at: new Date().toISOString(),
      });
      if (vErr) throw vErr;

      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user!.id);
      await refreshProfile();
      showToast('Vehicle added to your garage', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to add vehicle');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVehicleChange = (field: keyof VehicleData, value: string) => {
    setVehicleData(prev => ({ ...prev, [field]: value }));
    if (field === 'make') setVehicleData(prev => ({ ...prev, model: '' }));
  };

  // ── Progress indicator ──
  const steps: Step[] = ['welcome', 'handle', 'vehicle'];
  const stepIdx = steps.indexOf(step);

  return (
    <div style={{ minHeight: '100vh', background: '#030508', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ maxWidth: 440, width: '100%' }}>

        {/* Sign out */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button onClick={signOut} style={{ ...ghostBtnStyle, padding: '6px 12px', fontSize: 9, display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogOut size={12} /> Sign Out
          </button>
        </div>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#eef4f8' }}>
            MOTO<em style={{ fontStyle: 'normal', color: '#F97316' }}>R</em>ATE
          </span>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ width: i <= stepIdx ? 24 : 8, height: 4, borderRadius: 2, background: i <= stepIdx ? '#F97316' : 'rgba(255,255,255,0.08)', transition: 'all 0.3s' }} />
          ))}
        </div>

        {/* ════════════════════════════════════════
           STEP 1 — WELCOME / HOW IT WORKS
        ════════════════════════════════════════ */}
        {step === 'welcome' && (
          <div>
            <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#eef4f8', textAlign: 'center', margin: '0 0 4px' }}>
              How MotoRate Works
            </h1>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e', textAlign: 'center', margin: '0 0 28px' }}>
              Vehicles build reputation. You make it happen.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {HOW_IT_WORKS.map((item, i) => (
                <div key={item.title} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#F97316' }}>
                    {item.icon(true)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#eef4f8', lineHeight: 1, marginBottom: 3 }}>
                      {item.title}
                    </div>
                    <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7a8e9e', lineHeight: 1.4 }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setStep('handle')} style={primaryBtnStyle}>
              Got It <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════
           STEP 2 — HANDLE SETUP
        ════════════════════════════════════════ */}
        {step === 'handle' && (
          <div>
            <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#eef4f8', textAlign: 'center', margin: '0 0 4px' }}>
              Choose Your Username
            </h1>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e', textAlign: 'center', margin: '0 0 24px' }}>
              This is how other users will find you
            </p>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#ef4444' }}>{error}</span>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Username</label>
              <input
                type="text" value={handle}
                onChange={e => { setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setError(''); }}
                placeholder="yourhandle"
                maxLength={24}
                autoCapitalize="off" autoComplete="username"
                style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(249,115,22,0.45)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
              />
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#3a4e60', marginTop: 6 }}>
                Letters, numbers, underscores. 3-24 characters.
              </p>
            </div>

            <button onClick={handleHandleSubmit} disabled={isProcessing || !handle.trim()} style={{ ...primaryBtnStyle, opacity: (isProcessing || !handle.trim()) ? 0.4 : 1 }}>
              {isProcessing ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <>Continue <ArrowRight size={16} /></>}
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════
           STEP 3 — VEHICLE (OPTIONAL)
        ════════════════════════════════════════ */}
        {step === 'vehicle' && (
          <div>
            <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#eef4f8', textAlign: 'center', margin: '0 0 4px' }}>
              Claim Your Ride
            </h1>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e', textAlign: 'center', margin: '0 0 24px' }}>
              Optional. You can always do this later from your garage.
            </p>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#ef4444' }}>{error}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Year *</label>
                <div style={{ position: 'relative' }}>
                  <select value={vehicleData.year} onChange={e => handleVehicleChange('year', e.target.value)} style={selectStyle}>
                    <option value="">Year</option>
                    {VEHICLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#5a6e7e', pointerEvents: 'none' }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Make *</label>
                <div style={{ position: 'relative' }}>
                  <select value={vehicleData.make} onChange={e => handleVehicleChange('make', e.target.value)} style={selectStyle}>
                    <option value="">Make</option>
                    {VEHICLE_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#5a6e7e', pointerEvents: 'none' }} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Model *</label>
              <div style={{ position: 'relative' }}>
                <select value={vehicleData.model} onChange={e => handleVehicleChange('model', e.target.value)} disabled={!vehicleData.make} style={{ ...selectStyle, opacity: vehicleData.make ? 1 : 0.5 }}>
                  <option value="">{vehicleData.make ? 'Model' : 'Select make first'}</option>
                  {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#5a6e7e', pointerEvents: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Color</label>
                <div style={{ position: 'relative' }}>
                  <select value={vehicleData.color} onChange={e => handleVehicleChange('color', e.target.value)} style={selectStyle}>
                    <option value="">Color</option>
                    {VEHICLE_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#5a6e7e', pointerEvents: 'none' }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Trim</label>
                <input type="text" value={vehicleData.trim} onChange={e => handleVehicleChange('trim', e.target.value)} placeholder="e.g. Sport, SRT" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>State *</label>
                <div style={{ position: 'relative' }}>
                  <select value={vehicleData.plateState} onChange={e => handleVehicleChange('plateState', e.target.value)} style={selectStyle}>
                    <option value="">State</option>
                    {US_STATES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#5a6e7e', pointerEvents: 'none' }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Plate *</label>
                <input type="text" value={vehicleData.plateNumber} onChange={e => handleVehicleChange('plateNumber', e.target.value.toUpperCase())} placeholder="ABC1234" maxLength={8} style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleSkipVehicle} disabled={isProcessing} style={ghostBtnStyle}>
                Skip
              </button>
              <button onClick={handleVehicleSubmit} disabled={isProcessing} style={{ ...primaryBtnStyle, flex: 1, opacity: isProcessing ? 0.4 : 1 }}>
                {isProcessing ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Adding...</> : <>Claim Vehicle <ArrowRight size={16} /></>}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
