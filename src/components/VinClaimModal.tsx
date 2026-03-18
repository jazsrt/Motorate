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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--modal-overlay)', backdropFilter: `blur(var(--modal-blur))` }}
      onClick={onClose}
    >
      <div
        className="card-v3 w-full max-w-md overflow-hidden"
        style={{ boxShadow: '0 0 40px rgba(249,115,22,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-2)' }}>
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5" style={{ color: 'var(--orange)' }} strokeWidth={1.5} />
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--t1)' }}>
              {step === 'done' ? 'Verified!' : 'Claim via VIN'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'var(--s2)' }}
          >
            <X className="w-4 h-4" style={{ color: 'var(--t3)' }} />
          </button>
        </div>

        {/* STEP 1: Enter VIN */}
        {step === 'enter' && (
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[13px] mb-1" style={{ color: 'var(--t2)', fontWeight: 300 }}>
                Claiming <span style={{ color: 'var(--t1)', fontWeight: 500 }}>{vehicleName}</span>
              </p>
              <p className="text-[11px]" style={{ color: 'var(--t4)' }}>
                Enter your 17-character VIN to instantly verify ownership.
              </p>
            </div>

            <div>
              <label className="block text-[9px] font-medium uppercase tracking-[2px] mb-2" style={{ color: 'var(--t3)' }}>
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
                className="w-full px-4 py-3 rounded-xl text-[14px] font-mono tracking-[2px] focus:outline-none transition-colors"
                style={{
                  background: 'var(--s2)',
                  border: `1px solid ${error ? 'var(--red)' : 'var(--border-2)'}`,
                  color: 'var(--t1)',
                }}
                autoFocus
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px]" style={{ color: error ? 'var(--red)' : 'var(--t4)' }}>
                  {error || 'Found on driver-side door jamb or dashboard'}
                </span>
                <span className="text-[10px] font-mono" style={{ color: vin.length === 17 ? 'var(--green)' : 'var(--t4)' }}>
                  {vin.length}/17
                </span>
              </div>
            </div>

            <button
              onClick={handleDecode}
              disabled={vin.length !== 17 || decoding}
              className="w-full py-3.5 rounded-xl text-[11px] font-semibold uppercase tracking-[2px] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: vin.length === 17 ? 'var(--orange)' : 'var(--s3)',
                color: vin.length === 17 ? '#fff' : 'var(--t4)',
              }}
            >
              {decoding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Decoding…
                </>
              ) : (
                'Decode & Verify'
              )}
            </button>
          </div>
        )}

        {/* STEP 2: Review specs */}
        {step === 'review' && vinResult && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(90,170,122,0.1)', border: '1px solid rgba(90,170,122,0.2)' }}>
              <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--green)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--green)' }}>VIN decoded successfully</span>
            </div>

            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-2)' }}>
              {specRows.map((row, i) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{
                    background: i % 2 === 0 ? 'var(--s1)' : 'var(--s2)',
                    borderBottom: i < specRows.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <span className="text-[10px] font-medium uppercase tracking-[1.5px]" style={{ color: 'var(--t3)' }}>
                    {row.label}
                  </span>
                  <span className="text-[12px] font-medium" style={{ color: 'var(--t1)' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('enter'); setVinResult(null); setVin(''); }}
                className="flex-1 py-3 rounded-xl text-[11px] font-semibold uppercase tracking-[2px] transition-all active:scale-[0.98]"
                style={{ background: 'var(--s2)', color: 'var(--t3)', border: '1px solid var(--border-2)' }}
              >
                Re-enter
              </button>
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="flex-[2] py-3 rounded-xl text-[11px] font-semibold uppercase tracking-[2px] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: 'var(--orange)', color: '#fff' }}
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Claiming…
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
          <div className="p-8 text-center" style={{ position: 'relative', overflow: 'hidden', minHeight: 220 }}>
            {/* Expanding rings */}
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                border: '2px solid #5aaa7a', borderRadius: '50%',
                animation: `c-ring 0.7s cubic-bezier(.25,.46,.45,.94) forwards`,
                animationDelay: `${i * 0.12}s`,
                width: 0, height: 0, opacity: 0,
                pointerEvents: 'none',
              }} />
            ))}

            <div style={{ position: 'relative', zIndex: 1 }} className="space-y-4">
              {/* Seal */}
              <div
                className="mx-auto flex flex-col items-center justify-center"
                style={{
                  width: 100, height: 100, border: '3px solid #5aaa7a', borderRadius: '50%',
                  animation: 'stamp-slam 0.5s cubic-bezier(.25,.46,.45,.94) forwards',
                  animationDelay: '0.15s', opacity: 0,
                }}
              >
                <Check size={32} color="#5aaa7a" strokeWidth={2.5} />
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8, fontWeight: 600, letterSpacing: 3,
                  textTransform: 'uppercase', color: '#5aaa7a', marginTop: 6,
                }}>Verified</span>
              </div>

              <div>
                <p className="text-[16px] font-semibold" style={{ color: 'var(--t1)' }}>Vehicle Verified!</p>
                <p className="text-[12px] mt-1" style={{ color: 'var(--t3)' }}>
                  Your plate is now VIN-verified. Factory specs have been saved.
                </p>
              </div>

              {onViewVehicle && (
                <button
                  onClick={() => { onClose(); onViewVehicle(vehicleId); }}
                  className="w-full py-3.5 rounded-xl text-[11px] font-semibold uppercase tracking-[2px] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{ background: 'var(--orange)', color: '#fff', marginTop: 8 }}
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
