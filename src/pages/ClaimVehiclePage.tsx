import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Shield, Check, Loader2, Upload, Camera, X } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { decodeVin, isValidVinFormat, type VinResult } from '../lib/vinDecoder';
import { uploadImage } from '../lib/storage';
import { LicensePlate } from '../components/LicensePlate';
import type { OnNavigate } from '../types/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClaimVehiclePageProps {
  onNavigate: OnNavigate;
  claimData: {
    vehicleId: string;
    plateNumber?: string;
    plateState?: string;
    make?: string | null;
    model?: string | null;
    year?: number | null;
  };
}

type Step = 'intro' | 'handle' | 'vin' | 'vin-fail' | 'proof' | 'success';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const C = {
  bg: '#030508',
  surface: '#0d1117',
  accent: '#F97316',
  green: '#20c060',
  red: '#ef4444',
  text1: '#eef4f8',
  text2: '#7a8e9e',
  text3: '#5a6e7e',
  border: 'rgba(255,255,255,0.06)',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.18em', color: C.text2, marginBottom: 8,
};

const primaryBtn: React.CSSProperties = {
  width: '100%', padding: '14px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.18em',
  background: C.accent, color: '#030508',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};

const secondaryBtn: React.CSSProperties = {
  width: '100%', padding: '12px 0', borderRadius: 8, cursor: 'pointer',
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.14em',
  background: 'transparent', color: C.text3,
  border: `1px solid ${C.border}`,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClaimVehiclePage({ onNavigate, claimData }: ClaimVehiclePageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('intro');

  // Handle state
  const [vehicleHandle, setVehicleHandle] = useState('');
  const [handleError, setHandleError] = useState('');
  const [handleAvailable, setHandleAvailable] = useState(false);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const handleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // VIN state
  const [vin, setVin] = useState('');
  const [vinError, setVinError] = useState('');
  const [decoding, setDecoding] = useState(false);
  const [vinResult, setVinResult] = useState<VinResult | null>(null);

  // Proof state
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);

  // Claiming state
  const [claiming, setClaiming] = useState(false);
  const [confirmedHandle, setConfirmedHandle] = useState('');

  const vehicleName = [claimData.year, claimData.make, claimData.model].filter(Boolean).join(' ') || 'Vehicle';

  // ---------------------------------------------------------------------------
  // Handle uniqueness check (debounced)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const cleaned = vehicleHandle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleaned.length < 3) {
      setHandleAvailable(false);
      setHandleError(cleaned.length > 0 ? 'At least 3 characters' : '');
      return;
    }

    setCheckingHandle(true);
    setHandleError('');
    setHandleAvailable(false);

    if (handleDebounceRef.current) clearTimeout(handleDebounceRef.current);
    handleDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('vehicles')
          .select('id')
          .eq('vehicle_handle', cleaned)
          .maybeSingle();

        if (data) {
          setHandleError('That handle is taken');
          setHandleAvailable(false);
        } else {
          setHandleAvailable(true);
          setHandleError('');
        }
      } catch {
        setHandleError('Check failed — try again');
      } finally {
        setCheckingHandle(false);
      }
    }, 400);

    return () => { if (handleDebounceRef.current) clearTimeout(handleDebounceRef.current); };
  }, [vehicleHandle]);

  // ---------------------------------------------------------------------------
  // VIN decode + claim
  // ---------------------------------------------------------------------------

  const handleVinDecode = async () => {
    const cleaned = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    if (!isValidVinFormat(cleaned)) {
      setVinError('VIN must be exactly 17 characters (no I, O, or Q)');
      return;
    }

    setDecoding(true);
    setVinError('');

    try {
      const result = await decodeVin(cleaned);
      setVinResult(result);
      // VIN decoded successfully — proceed to claim
      await executeClaim(result);
    } catch (err: unknown) {
      setVinError(err instanceof Error ? err.message : 'Failed to decode VIN');
      setStep('vin-fail');
    } finally {
      setDecoding(false);
    }
  };

  const executeClaim = async (result: VinResult) => {
    if (!user) return;

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
          vin: result.vin,
          vin_year: result.year || null,
          vin_make: result.make || null,
          vin_model: result.model || null,
          vin_trim: result.trim || null,
          vin_body_class: result.bodyClass || null,
          vin_drive_type: result.driveType || null,
          vin_fuel_type: result.fuelType || null,
          vin_engine_cylinders: result.engineCylinders || null,
          vin_engine_displacement: result.engineDisplacement || null,
          vin_horsepower: result.horsepower || null,
          vin_transmission: result.transmission || null,
          vin_doors: result.doors || null,
          vin_plant_country: result.plantCountry || null,
          vin_decoded_at: new Date().toISOString(),
          vin_raw_data: result.rawData,
        })
        .eq('id', claimData.vehicleId)
        .is('owner_id', null)
        .select('id');

      if (updateError) throw updateError;
      if (!updated || updated.length === 0) throw new Error('Vehicle may already be claimed by someone else.');

      setStep('success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Claim failed', 'error');
      setStep('vin-fail');
    } finally {
      setClaiming(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Proof upload
  // ---------------------------------------------------------------------------

  const handleProofSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = ev => setProofPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleProofSubmit = async () => {
    if (!user || !proofFile) return;

    setUploadingProof(true);
    try {
      const proofUrl = await uploadImage(proofFile, 'vehicles');

      // Insert into verification_claims
      const { error: insertError } = await supabase
        .from('verification_claims')
        .insert({
          vehicle_id: claimData.vehicleId,
          user_id: user.id,
          document_urls: [proofUrl],
          document_types: ['registration'],
          notes: null,
          status: 'pending',
        });

      if (insertError) throw insertError;

      // Set handle on vehicle even for pending claims
      await supabase
        .from('vehicles')
        .update({ vehicle_handle: confirmedHandle })
        .eq('id', claimData.vehicleId);

      setStep('success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploadingProof(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '52px 16px 120px', minHeight: '100vh' }}>

        {/* Back button (all steps except success) */}
        {step !== 'success' && (
          <button
            onClick={() => {
              if (step === 'intro') onNavigate('vehicle-detail', { vehicleId: claimData.vehicleId });
              else if (step === 'handle') setStep('intro');
              else if (step === 'vin') setStep('handle');
              else if (step === 'vin-fail') setStep('vin');
              else if (step === 'proof') setStep('vin-fail');
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: C.text3,
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}

        {/* ================================================================ */}
        {/* STEP 1: INTRO                                                   */}
        {/* ================================================================ */}
        {step === 'intro' && (
          <div>
            {/* Vehicle card */}
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: 20, marginBottom: 24, textAlign: 'center',
            }}>
              {claimData.plateNumber && (
                <div style={{ marginBottom: 12 }}>
                  <LicensePlate plateNumber={claimData.plateNumber} plateState={claimData.plateState || ''} size="md" />
                </div>
              )}
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: C.text1, textTransform: 'uppercase' }}>
                {vehicleName}
              </div>
            </div>

            <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700, color: C.text1, margin: '0 0 10px', lineHeight: 1.1 }}>
              Is this your vehicle?
            </h1>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: C.text2, lineHeight: 1.6, margin: '0 0 28px' }}>
              Claiming lets you manage your vehicle's page, upload photos, and respond to spots.
            </p>

            <button onClick={() => setStep('handle')} style={primaryBtn}>
              Start Claim
            </button>
            <button
              onClick={() => onNavigate('vehicle-detail', { vehicleId: claimData.vehicleId })}
              style={{ ...secondaryBtn, marginTop: 10 }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 2: HANDLE PICKER                                           */}
        {/* ================================================================ */}
        {step === 'handle' && (
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent, marginBottom: 6 }}>
              Step 1 of 2
            </div>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: C.text1, margin: '0 0 6px' }}>
              Choose a Vehicle Handle
            </h2>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: C.text3, margin: '0 0 20px', lineHeight: 1.5 }}>
              This is your vehicle's permanent identity on MotoRate.
            </p>

            <label style={labelStyle}>Vehicle Handle</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <span style={{
                position: 'absolute', left: 14,
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700,
                color: C.accent, pointerEvents: 'none',
              }}>@</span>
              <input
                type="text"
                value={vehicleHandle}
                onChange={(e) => setVehicleHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24))}
                placeholder="blackwidow"
                maxLength={24}
                autoFocus
                style={{
                  width: '100%', padding: '12px 40px 12px 30px', borderRadius: 8,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 16, letterSpacing: '1px',
                  background: '#070a0f',
                  border: `1px solid ${handleError ? C.red : handleAvailable ? C.green : C.border}`,
                  color: C.text1, outline: 'none', boxSizing: 'border-box',
                }}
              />
              {/* Status indicator */}
              {vehicleHandle.length >= 3 && (
                <div style={{ position: 'absolute', right: 14 }}>
                  {checkingHandle ? (
                    <Loader2 size={16} style={{ color: C.text3, animation: 'spin 1s linear infinite' }} />
                  ) : handleAvailable ? (
                    <Check size={16} style={{ color: C.green }} />
                  ) : handleError ? (
                    <X size={16} style={{ color: C.red }} />
                  ) : null}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: handleError ? C.red : handleAvailable ? C.green : C.text3 }}>
                {handleError || (handleAvailable ? 'Available' : 'Letters, numbers, and underscores only')}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: vehicleHandle.length >= 3 ? C.green : C.text3 }}>
                {vehicleHandle.length}/24
              </span>
            </div>

            <button
              onClick={() => { setConfirmedHandle(vehicleHandle.trim().toLowerCase()); setStep('vin'); }}
              disabled={!handleAvailable || checkingHandle}
              style={{
                ...primaryBtn,
                opacity: (!handleAvailable || checkingHandle) ? 0.4 : 1,
                cursor: (!handleAvailable || checkingHandle) ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 3: VIN ENTRY                                               */}
        {/* ================================================================ */}
        {step === 'vin' && (
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent, marginBottom: 6 }}>
              Step 2 of 2
            </div>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: C.text1, margin: '0 0 6px' }}>
              Enter Your VIN
            </h2>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: C.text3, margin: '0 0 20px', lineHeight: 1.5 }}>
              Your 17-character VIN instantly verifies ownership. Found on the driver-side door jamb or dashboard.
            </p>

            <label style={labelStyle}>Vehicle Identification Number</label>
            <input
              type="text"
              value={vin}
              onChange={(e) => {
                setVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17));
                setVinError('');
              }}
              placeholder="1HGCM82633A004352"
              maxLength={17}
              autoFocus
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 8,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 15,
                letterSpacing: '2px', textTransform: 'uppercase',
                background: '#070a0f',
                border: `1px solid ${vinError ? C.red : C.border}`,
                color: C.text1, outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 24 }}>
              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: vinError ? C.red : C.text3 }}>
                {vinError || 'No I, O, or Q characters'}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: vin.length === 17 ? C.green : C.text3 }}>
                {vin.length}/17
              </span>
            </div>

            <button
              onClick={handleVinDecode}
              disabled={vin.length !== 17 || decoding || claiming}
              style={{
                ...primaryBtn,
                opacity: (vin.length !== 17 || decoding || claiming) ? 0.4 : 1,
                cursor: (vin.length !== 17 || decoding || claiming) ? 'not-allowed' : 'pointer',
              }}
            >
              {decoding || claiming ? (
                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Verifying...</>
              ) : (
                'Verify & Claim'
              )}
            </button>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 4b: VIN FAIL                                               */}
        {/* ================================================================ */}
        {step === 'vin-fail' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={28} style={{ color: C.red }} />
            </div>

            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: C.text1, margin: '0 0 8px' }}>
              VIN didn't match our records
            </h2>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: C.text3, lineHeight: 1.5, margin: '0 0 28px' }}>
              Double-check the VIN on your door jamb or windshield, or upload proof of ownership instead.
            </p>

            <button onClick={() => { setVin(''); setVinError(''); setStep('vin'); }} style={primaryBtn}>
              Try Again
            </button>
            <button onClick={() => setStep('proof')} style={{ ...secondaryBtn, marginTop: 10 }}>
              Upload Proof Instead
            </button>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 4c: PROOF UPLOAD                                           */}
        {/* ================================================================ */}
        {step === 'proof' && (
          <div>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: C.text1, margin: '0 0 6px' }}>
              Upload Proof of Ownership
            </h2>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: C.text3, margin: '0 0 20px', lineHeight: 1.5 }}>
              Upload a photo of your registration, title, or insurance card. An admin will review within 24-48 hours.
            </p>

            <input ref={proofInputRef} type="file" accept="image/*" onChange={handleProofSelect} style={{ display: 'none' }} />

            {proofPreview ? (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 20, border: `1px solid ${C.border}` }}>
                <img src={proofPreview} alt="Proof" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                <button
                  onClick={() => { setProofFile(null); setProofPreview(null); }}
                  style={{
                    position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={14} color="#fff" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => proofInputRef.current?.click()}
                style={{
                  width: '100%', padding: '32px 16px', marginBottom: 20,
                  background: 'rgba(255,255,255,0.02)', border: `2px dashed ${C.border}`, borderRadius: 10,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer',
                }}
              >
                <Camera size={24} style={{ color: C.text3 }} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text3 }}>
                  Tap to upload document
                </span>
              </button>
            )}

            <button
              onClick={handleProofSubmit}
              disabled={!proofFile || uploadingProof}
              style={{
                ...primaryBtn,
                opacity: (!proofFile || uploadingProof) ? 0.4 : 1,
                cursor: (!proofFile || uploadingProof) ? 'not-allowed' : 'pointer',
              }}
            >
              {uploadingProof ? (
                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</>
              ) : (
                'Submit for Review'
              )}
            </button>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 5: SUCCESS                                                 */}
        {/* ================================================================ */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', paddingTop: 32 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
              border: `3px solid ${C.green}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={32} color={C.green} strokeWidth={2.5} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 7, fontWeight: 600,
                letterSpacing: 2, textTransform: 'uppercase', color: C.green, marginTop: 4,
              }}>Verified</span>
            </div>

            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: C.text1, margin: '0 0 6px' }}>
              You're now the owner of @{confirmedHandle}
            </h2>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: C.text2, margin: '0 0 32px' }}>
              Your vehicle page is live.
            </p>

            <button
              onClick={() => onNavigate('vehicle-detail', { vehicleId: claimData.vehicleId })}
              style={primaryBtn}
            >
              Go to My Vehicle
            </button>
            <button
              onClick={() => {
                onNavigate('vehicle-detail', { vehicleId: claimData.vehicleId });
                // Trigger photo upload after navigation — the vehicle detail page will handle it
              }}
              style={{ ...secondaryBtn, marginTop: 10 }}
            >
              Upload Photos
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}
