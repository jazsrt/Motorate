import { useState } from 'react';
import { X, Shield, Check, Loader2 } from 'lucide-react';
import { decodeVin, isValidVinFormat, type VinResult } from '../lib/vinDecoder';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

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

type Step = 'enter' | 'review' | 'done';

export function VinClaimModal({
  vehicleId,
  vehicleInfo,
  onClose,
  onSuccess,
  onViewVehicle,
}: VinClaimModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>('enter');
  const [vin, setVin] = useState('');
  const [vinResult, setVinResult] = useState<VinResult | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');

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
    } catch (err: any) {
      setError(err.message || 'Failed to decode VIN');
    } finally {
      setDecoding(false);
    }
  };

  const handleClaim = async () => {
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

      showToast('Your ride is now verified!', 'success');
      setStep('done');
      onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Claim failed', 'error');
    } finally {
      setClaiming(false);
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
                {step === 'done' ? 'Verified!' : 'Claim via VIN'}
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
                onClick={handleClaim}
                disabled={claiming}
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
                  cursor: claiming ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {claiming ? (
                  <>
                    <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                    Claiming...
                  </>
                ) : (
                  'Claim & Verify'
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Done */}
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
