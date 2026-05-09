import { useState } from 'react';
import { X, Shield, Check, Loader2 } from 'lucide-react';
import { decodeVin, isValidVinFormat, type VinResult } from '../lib/vinDecoder';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useRewardEvents } from '../contexts/RewardEventContext';

interface VinClaimModalProps {
  vehicleId: string;
  vehicleInfo: {
    year?: number | null;
    make?: string | null;
    model?: string | null;
    color?: string | null;
    plateState?: string;
    plateNumber?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
  onViewVehicle?: (vehicleId: string) => void;
}

type Step = 'enter' | 'review' | 'handle' | 'done';

async function createClaimFeedPost(userId: string, vehicleId: string, handle: string) {
  const { error } = await supabase
    .from('posts')
    .insert({
      author_id: userId,
      vehicle_id: vehicleId,
      post_type: 'claim',
      content_type: 'image',
      caption: `Claimed @${handle}`,
      privacy_level: 'public',
      moderation_status: 'approved',
      published_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[VinClaimModal] claim feed post failed:', error);
  }
}

export function VinClaimModal({
  vehicleId,
  vehicleInfo,
  onClose,
  onSuccess,
  onViewVehicle,
}: VinClaimModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { celebrateReward } = useRewardEvents();
  const [step, setStep] = useState<Step>('enter');
  const [vin, setVin] = useState('');
  const [vinResult, setVinResult] = useState<VinResult | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [vehicleHandle, setVehicleHandle] = useState('');
  const [handleError, setHandleError] = useState('');
  const [checkingHandle, setCheckingHandle] = useState(false);

  const handleDecode = async () => {
    const cleaned = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    if (!isValidVinFormat(cleaned)) {
      setError('VIN must be exactly 17 characters (no I, O, or Q)');
      return;
    }

    setDecoding(true);
    setError('');

    try {
      const result = await decodeVin(cleaned);
      setVinResult(result);
      setStep('review');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to decode VIN');
    } finally {
      setDecoding(false);
    }
  };

  const handleClaim = async (confirmedHandle: string) => {
    if (!user || !vinResult) return;

    setClaiming(true);
    try {
      const { data: updated, error: updateError } = await supabase
        .from('vehicles')
        .update({
          owner_id: user.id,
          is_claimed: true,
          claimed_at: new Date().toISOString(),
          verification_tier: 'vin_verified',
          vehicle_handle: confirmedHandle,
          vin: vinResult.vin,
          vin_year: vinResult.year || null,
          vin_make: vinResult.make || null,
          vin_model: vinResult.model || null,
          vin_trim: vinResult.trim || null,
          vin_body_class: vinResult.bodyClass || null,
          vin_drive_type: vinResult.driveType || null,
          vin_fuel_type: vinResult.fuelType || null,
          vin_engine_cylinders: vinResult.engineCylinders || null,
          vin_engine_displacement: vinResult.engineDisplacement || null,
          vin_horsepower: vinResult.horsepower || null,
          vin_transmission: vinResult.transmission || null,
          vin_doors: vinResult.doors || null,
          vin_plant_country: vinResult.plantCountry || null,
          vin_decoded_at: new Date().toISOString(),
          vin_raw_data: vinResult.rawData,
        })
        .eq('id', vehicleId)
        .is('owner_id', null)
        .select('id');

      if (updateError) throw updateError;
      if (!updated || updated.length === 0) throw new Error('Could not claim vehicle. It may already be claimed by someone else.');

      await createClaimFeedPost(user.id, vehicleId, confirmedHandle);

      showToast('Your ride is now verified!', 'success');
      celebrateReward({
        type: 'claim',
        title: 'Ride Verified',
        message: 'Owner tools and factory specs are unlocked.',
      });
      setStep('done');
      onSuccess();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Claim failed', 'error');
    } finally {
      setClaiming(false);
    }
  };

  const handleCheckAndProceed = async () => {
    const cleaned = vehicleHandle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleaned.length < 3) {
      setHandleError('Handle must be at least 3 characters');
      return;
    }
    if (cleaned.length > 24) {
      setHandleError('Handle must be 24 characters or less');
      return;
    }

    setCheckingHandle(true);
    setHandleError('');

    try {
      const { data } = await supabase
        .from('vehicles')
        .select('id')
        .eq('vehicle_handle', cleaned)
        .maybeSingle();

      if (data) {
        setHandleError('That handle is already taken. Try another.');
        return;
      }

      setVehicleHandle(cleaned);
      await handleClaim(cleaned);
    } catch {
      setHandleError('Failed to check handle. Try again.');
    } finally {
      setCheckingHandle(false);
    }
  };

  const vehicleName = [vehicleInfo.year, vehicleInfo.make, vehicleInfo.model]
    .filter(Boolean)
    .join(' ') || 'This Vehicle';

  const specRows = vinResult
    ? [
        { label: 'Year', value: vinResult.year },
        { label: 'Make', value: vinResult.make },
        { label: 'Model', value: vinResult.model },
        { label: 'Trim', value: vinResult.trim },
        { label: 'Body', value: vinResult.bodyClass },
        { label: 'Drivetrain', value: vinResult.driveType },
        { label: 'Fuel', value: vinResult.fuelType },
        { label: 'Engine', value: vinResult.engineFormatted },
        { label: 'HP', value: vinResult.horsepower },
        { label: 'Trans', value: vinResult.transmission },
        { label: 'Doors', value: vinResult.doors },
        { label: 'Origin', value: vinResult.plantCountry },
      ].filter(r => r.value)
    : [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 440,
          overflow: 'hidden',
          boxShadow: '0 0 40px rgba(249,115,22,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 20,
          borderBottom: '1px solid rgba(255,255,255,0.10)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield style={{ width: 20, height: 20, color: '#F97316' }} strokeWidth={1.5} />
            <div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.18em',
                color: '#F97316',
                marginBottom: 2,
              }}>
                Ownership Verification
              </div>
              <h3 style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: '#eef4f8',
                margin: 0,
                lineHeight: 1,
              }}>
                {step === 'done' ? 'Verified!' : step === 'handle' ? 'Your Username' : 'Claim via VIN'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: 16, height: 16, color: '#7a8e9e' }} />
          </button>
        </div>

        {/* STEP 1: Enter VIN */}
        {step === 'enter' && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
            <div>
              <p style={{
                fontFamily: "'Barlow', sans-serif",
                fontSize: 13,
                color: '#a8bcc8',
                fontWeight: 300,
                margin: '0 0 4px 0',
              }}>
                Claiming <span style={{ color: '#eef4f8', fontWeight: 500 }}>{vehicleName}</span>
              </p>
              <p style={{
                fontFamily: "'Barlow', sans-serif",
                fontSize: 11,
                color: '#5a6e7e',
                margin: 0,
              }}>
                Enter your 17-character VIN to instantly verify ownership.
              </p>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.18em',
                color: '#7a8e9e',
                marginBottom: 8,
              }}>
                Vehicle Identification Number
              </label>
              <input
                type="text"
                value={vin}
                onChange={(e) => {
                  setVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17));
                  setError('');
                }}
                placeholder="1HGCM82633A004352"
                maxLength={17}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 8,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14,
                  letterSpacing: '2px',
                  textTransform: 'uppercase' as const,
                  background: '#070a0f',
                  border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.08)'}`,
                  color: '#eef4f8',
                  outline: 'none',
                  boxSizing: 'border-box' as const,
                }}
                autoFocus
              />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 6,
              }}>
                <span style={{
                  fontFamily: "'Barlow', sans-serif",
                  fontSize: 10,
                  color: error ? '#ef4444' : '#5a6e7e',
                }}>
                  {error || 'Found on driver-side door jamb or dashboard'}
                </span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: vin.length === 17 ? '#20c060' : '#5a6e7e',
                }}>
                  {vin.length}/17
                </span>
              </div>
            </div>

            <button
              onClick={handleDecode}
              disabled={vin.length !== 17 || decoding}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 8,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.18em',
                background: vin.length === 17 ? '#F97316' : 'rgba(255,255,255,0.06)',
                color: vin.length === 17 ? '#030508' : '#5a6e7e',
                border: 'none',
                cursor: vin.length !== 17 || decoding ? 'not-allowed' : 'pointer',
                opacity: vin.length !== 17 || decoding ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {decoding ? (
                <>
                  <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                  Decoding...
                </>
              ) : (
                'Decode & Verify'
              )}
            </button>
          </div>
        )}

        {/* STEP 2: Review specs */}
        {step === 'review' && vinResult && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(249,115,22,0.06)',
              border: '1px solid rgba(249,115,22,0.18)',
            }}>
              <Check style={{ width: 16, height: 16, flexShrink: 0, color: '#20c060' }} />
              <span style={{
                fontFamily: "'Barlow', sans-serif",
                fontSize: 12,
                fontWeight: 500,
                color: '#F97316',
              }}>VIN decoded successfully</span>
            </div>

            <div style={{
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {specRows.map((row, i) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    background: i % 2 === 0 ? '#0a0d14' : '#0e1320',
                    borderBottom: i < specRows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}
                >
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.18em',
                    color: '#7a8e9e',
                  }}>
                    {row.label}
                  </span>
                  <span style={{
                    fontFamily: "'Barlow', sans-serif",
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#eef4f8',
                  }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setStep('enter'); setVinResult(null); setVin(''); }}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 8,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.18em',
                  background: 'transparent',
                  color: '#7a8e9e',
                  border: '1px solid rgba(255,255,255,0.10)',
                  cursor: 'pointer',
                }}
              >
                Re-enter
              </button>
              <button
                onClick={() => setStep('handle')}
                style={{
                  flex: 2,
                  padding: '12px 0',
                  borderRadius: 8,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.18em',
                  background: '#F97316',
                  color: '#030508',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Choose Handle →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Choose handle */}
        {step === 'handle' && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
            <div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', marginBottom: 4 }}>
                Choose a Username
              </div>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7a8e9e', margin: 0, lineHeight: 1.5 }}>
                This is your vehicle's permanent username on MotoRate. It can't be changed after claiming.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.18em', color: '#7a8e9e', marginBottom: 8 }}>
                Vehicle Username
              </label>
              <div style={{ position: 'relative' as const, display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute' as const, left: 14, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, color: '#F97316', pointerEvents: 'none' as const }}>@</span>
                <input
                  type="text"
                  value={vehicleHandle}
                  onChange={(e) => {
                    setVehicleHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24));
                    setHandleError('');
                  }}
                  placeholder="blackwidow"
                  maxLength={24}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 30px',
                    borderRadius: 8,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 16,
                    letterSpacing: '1px',
                    background: '#070a0f',
                    border: `1px solid ${handleError ? '#ef4444' : 'rgba(255,255,255,0.08)'}`,
                    color: '#eef4f8',
                    outline: 'none',
                    boxSizing: 'border-box' as const,
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: handleError ? '#ef4444' : '#5a6e7e' }}>
                  {handleError || 'Letters, numbers, and underscores only'}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: vehicleHandle.length >= 3 ? '#20c060' : '#5a6e7e' }}>
                  {vehicleHandle.length}/24
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setStep('review')}
                style={{ flex: 1, padding: '12px 0', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.18em', background: 'transparent', color: '#7a8e9e', border: '1px solid rgba(255,255,255,0.10)', cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                onClick={handleCheckAndProceed}
                disabled={vehicleHandle.length < 3 || checkingHandle || claiming}
                style={{ flex: 2, padding: '12px 0', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.18em', background: vehicleHandle.length >= 3 ? '#F97316' : 'rgba(255,255,255,0.06)', color: vehicleHandle.length >= 3 ? '#030508' : '#5a6e7e', border: 'none', cursor: vehicleHandle.length < 3 || checkingHandle || claiming ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {checkingHandle || claiming ? (
                  <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> {claiming ? 'Claiming...' : 'Checking...'}</>
                ) : (
                  'Claim & Verify →'
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Done */}
        {step === 'done' && (
          <div style={{ padding: 32, textAlign: 'center' as const, position: 'relative', overflow: 'hidden', minHeight: 220 }}>
            {/* Expanding rings */}
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                border: '2px solid #20c060', borderRadius: '50%',
                animation: `c-ring 0.7s cubic-bezier(.25,.46,.45,.94) forwards`,
                animationDelay: `${i * 0.12}s`,
                width: 0, height: 0, opacity: 0,
                pointerEvents: 'none',
              }} />
            ))}

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 16 }}>
              {/* Seal */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column' as const,
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 100, height: 100, border: '3px solid #20c060', borderRadius: '50%',
                  animation: 'stamp-slam 0.5s cubic-bezier(.25,.46,.45,.94) forwards',
                  animationDelay: '0.15s', opacity: 0,
                }}
              >
                <Check size={32} color="#20c060" strokeWidth={2.5} />
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8, fontWeight: 600, letterSpacing: 3,
                  textTransform: 'uppercase' as const, color: '#20c060', marginTop: 6,
                }}>Verified</span>
              </div>

              <div>
                <p style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#eef4f8',
                  margin: 0,
                }}>Vehicle Verified!</p>
                <p style={{
                  fontFamily: "'Barlow', sans-serif",
                  fontSize: 12,
                  color: '#7a8e9e',
                  margin: '4px 0 0 0',
                }}>
                  Your plate is now VIN-verified. Factory specs have been saved.
                </p>
              </div>

              {onViewVehicle && (
                <button
                  onClick={() => { onClose(); onViewVehicle(vehicleId); }}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    borderRadius: 8,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.18em',
                    background: '#F97316',
                    color: '#030508',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  View Vehicle Profile
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
