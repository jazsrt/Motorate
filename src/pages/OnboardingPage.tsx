import React, { useState } from 'react';
import { Car, FileText, ArrowRight, Loader, AlertCircle, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { hashPlate } from '../lib/hash';
import Tesseract from 'tesseract.js';
import {
  VEHICLE_YEARS,
  VEHICLE_MAKES,
  VEHICLE_MODELS,
  VEHICLE_COLORS,
  US_STATES,
} from '../data/vehicleData';

type Step = 'handle_setup' | 'vehicle_info';

interface VehicleData {
  year: string;
  make: string;
  model: string;
  trim: string;
  color: string;
  plateState: string;
  plateNumber: string;
}

export default function OnboardingPage() {
  const { user, refreshProfile, signOut } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('handle_setup');
  const [handle, setHandle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const [vehicleData, setVehicleData] = useState<VehicleData>({
    year: '',
    make: '',
    model: '',
    trim: '',
    color: '',
    plateState: '',
    plateNumber: ''
  });

  const [registrationFile, setRegistrationFile] = useState<File | null>(null);
  const [registrationPreview, setRegistrationPreview] = useState<string>('');

  const availableModels = vehicleData.make && VEHICLE_MODELS[vehicleData.make]
    ? VEHICLE_MODELS[vehicleData.make]
    : [];

  const handleSkipVehicle = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      showToast('Welcome to MotoRate!', 'success');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      showToast('Failed to complete onboarding', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHandleSubmit = async () => {
    if (!handle.trim()) {
      setError('Please enter a handle');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ handle: handle.trim() })
        .eq('id', user!.id);

      if (profileError) {
        if (profileError.code === '23505') {
          throw new Error('This handle is already taken');
        }
        throw profileError;
      }

      await refreshProfile();
      setStep('vehicle_info');
    } catch (error: any) {
      setError(error.message || 'Failed to save handle');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVehicleInputChange = (field: keyof VehicleData, value: string) => {
    setVehicleData(prev => ({ ...prev, [field]: value }));
    if (field === 'make') {
      setVehicleData(prev => ({ ...prev, model: '' }));
    }
  };

  const handleRegistrationSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRegistrationFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setRegistrationPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const validatePlateInImage = async (imageFile: File, expectedPlate: string): Promise<boolean> => {
    try {
      const { data: { text } } = await Tesseract.recognize(imageFile, 'eng', {
        logger: () => {}
      });

      const normalizedOcrText = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const normalizedPlate = expectedPlate.toUpperCase().replace(/[^A-Z0-9]/g, '');

      return normalizedOcrText.includes(normalizedPlate);
    } catch (error) {
      console.error('OCR Error:', error);
      return false;
    }
  };

  const handleVehicleSubmit = async () => {
    if (!user) return;

    if (!vehicleData.year || !vehicleData.make || !vehicleData.model ||
        !vehicleData.plateState || !vehicleData.plateNumber) {
      setError('Please fill in all required vehicle fields');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const plateHash = await hashPlate(vehicleData.plateState, vehicleData.plateNumber);

      let verificationTier: 'unverified' | 'possession_verified' | 'ownership_verified' = 'unverified';
      let vin: string | null = null;
      let isVerified = false;

      // If registration document is provided, verify ownership
      if (registrationFile) {
        showToast('Verifying registration document...', 'info');

        const fileExt = registrationFile.name.split('.').pop();
        const fileName = `registration-${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `registration-temp/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('vehicles')
          .upload(filePath, registrationFile);

        if (uploadError) throw uploadError;

        try {
          const { data: functionData, error: functionError } = await supabase.functions
            .invoke('verify-document', {
              body: {
                filePath,
                expectedPlate: vehicleData.plateNumber,
                expectedMake: vehicleData.make,
                expectedModel: vehicleData.model
              }
            });

          await supabase.storage
            .from('vehicles')
            .remove([filePath]);

          if (!functionError && functionData?.verified) {
            verificationTier = 'ownership_verified';
            vin = functionData.vin || null;
            isVerified = true;
          }
        } catch (err) {
          console.error('Verification error:', err);
        }
      }

      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          plate_hash: plateHash,
          state: vehicleData.plateState,
          owner_id: user.id,
          year: parseInt(vehicleData.year),
          make: vehicleData.make,
          model: vehicleData.model,
          trim: vehicleData.trim || null,
          color: vehicleData.color || null,
          verification_tier: verificationTier,
          is_claimed: true,
          claimed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (vehicleError) throw vehicleError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_verified: isVerified,
          onboarding_completed: true
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      const { error: albumError } = await supabase
        .from('albums')
        .insert({
          title: 'My Garage',
          description: 'My personal vehicle collection',
          user_id: user.id,
          vehicle_id: vehicle.id,
          privacy_level: 'public'
        });

      if (albumError) console.error('Album creation error:', albumError);

      await refreshProfile();

      if (verificationTier === 'ownership_verified') {
        showToast('Ownership verified! Welcome to MotoRate!', 'success');
      } else {
        showToast('Vehicle added! Welcome to MotoRate!', 'success');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      setError('Failed to complete onboarding. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  /* V11 shared input style */
  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'var(--white,#eef4f8)',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none' as const,
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Barlow Condensed',sans-serif",
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    fontSize: '11px',
    letterSpacing: '0.12em',
    color: 'var(--light,#a8bcc8)',
    display: 'block',
    marginBottom: '8px',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--black,#030508)' }}>
      <div className="max-w-2xl w-full">
        <div className="flex justify-end mb-4">
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Car className="w-12 h-12" style={{ color: 'var(--accent,#F97316)' }} />
            <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '32px', color: 'var(--white,#eef4f8)' }}>
              Welcome to <span style={{ color: 'var(--accent,#F97316)' }}>MotoRate</span>
            </h1>
          </div>
          <p style={{ color: 'var(--dim,#6a7486)', fontFamily: "'Barlow',sans-serif" }}>Let's get you set up</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['handle_setup', 'vehicle_info'] as Step[]).map((s, i) => (
            <div
              key={s}
              className="h-2 rounded-full transition-all"
              style={{
                width: step === s ? '32px' : '8px',
                background: step === s ? 'var(--accent,#F97316)' : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>

        <div style={{ background: 'var(--carbon-1,#0a0d14)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', padding: '32px' }}>
          {step === 'handle_setup' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '22px', color: 'var(--white,#eef4f8)', marginBottom: '8px' }}>Choose Your Handle</h2>
                <p style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}>Pick a unique handle for your MotoRate profile</p>
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-200 text-sm font-semibold mb-1">Error</p>
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>
                  Username *
                </label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => {
                    setHandle(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g., cooldriver, speeddemon"
                  className="w-full px-4 py-3 focus:outline-none placeholder-neutral-500"
                  style={inputStyle}
                  maxLength={30}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--dim,#6a7486)', fontFamily: "'Barlow',sans-serif" }}>
                  This will be your unique identifier on MotoRate
                </p>
              </div>

              <button
                onClick={handleHandleSubmit}
                disabled={isProcessing || !handle.trim()}
                className="w-full py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: 'var(--accent,#F97316)', color: '#030508', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {step === 'vehicle_info' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '22px', color: 'var(--white,#eef4f8)', marginBottom: '8px' }}>Add Your Vehicle (Optional)</h2>
                <p style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}>
                  Add your vehicle to unlock features like creating posts and albums
                </p>
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-200 text-sm font-semibold mb-1">Error</p>
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>
                      Year *
                    </label>
                    <div className="relative">
                      <select
                        value={vehicleData.year}
                        onChange={(e) => handleVehicleInputChange('year', e.target.value)}
                        className="w-full px-4 py-3 focus:outline-none pr-10"
                        style={selectStyle}
                      >
                        <option value="">Select Year</option>
                        {VEHICLE_YEARS.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: 'var(--dim,#6a7486)' }} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Make *
                    </label>
                    <div className="relative">
                      <select
                        value={vehicleData.make}
                        onChange={(e) => handleVehicleInputChange('make', e.target.value)}
                        className="w-full px-4 py-3 focus:outline-none pr-10"
                        style={selectStyle}
                      >
                        <option value="">Select Make</option>
                        {VEHICLE_MAKES.map((make) => (
                          <option key={make} value={make}>{make}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: 'var(--dim,#6a7486)' }} />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    Model *
                  </label>
                  <div className="relative">
                    <select
                      value={vehicleData.model}
                      onChange={(e) => handleVehicleInputChange('model', e.target.value)}
                      className="w-full px-4 py-3 focus:outline-none pr-10"
                      style={{ ...selectStyle, opacity: !vehicleData.make ? 0.5 : 1 }}
                      disabled={!vehicleData.make}
                    >
                      <option value="">{vehicleData.make ? 'Select Model' : 'Select Make First'}</option>
                      {availableModels.map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: 'var(--dim,#6a7486)' }} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    Trim (Optional)
                  </label>
                  <input
                    type="text"
                    value={vehicleData.trim}
                    onChange={(e) => handleVehicleInputChange('trim', e.target.value)}
                    placeholder="e.g., Sport, Limited, EX"
                    className="w-full px-4 py-3 focus:outline-none placeholder-neutral-500"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    Color
                  </label>
                  <div className="relative">
                    <select
                      value={vehicleData.color}
                      onChange={(e) => handleVehicleInputChange('color', e.target.value)}
                      className="w-full px-4 py-3 focus:outline-none pr-10"
                      style={selectStyle}
                    >
                      <option value="">Select Color</option>
                      {VEHICLE_COLORS.map((color) => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: 'var(--dim,#6a7486)' }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>
                      State *
                    </label>
                    <div className="relative">
                      <select
                        value={vehicleData.plateState}
                        onChange={(e) => handleVehicleInputChange('plateState', e.target.value)}
                        className="w-full px-4 py-3 focus:outline-none pr-10"
                        style={selectStyle}
                      >
                        <option value="">Select State</option>
                        {US_STATES.map((state) => (
                          <option key={state.code} value={state.code}>
                            {state.code} - {state.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: 'var(--dim,#6a7486)' }} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      License Plate *
                    </label>
                    <input
                      type="text"
                      value={vehicleData.plateNumber}
                      onChange={(e) => handleVehicleInputChange('plateNumber', e.target.value.toUpperCase())}
                      placeholder="ABC1234"
                      className="w-full px-4 py-3 focus:outline-none placeholder-neutral-500"
                      style={{ ...inputStyle, fontFamily: "'JetBrains Mono',monospace" }}
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' }}>
                  <h3 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '18px', color: 'var(--white,#eef4f8)', marginBottom: '16px' }}>Upload Vehicle Registration (Optional)</h3>
                  <p style={{ fontSize: '14px', color: 'var(--light,#a8bcc8)', marginBottom: '16px', fontFamily: "'Barlow',sans-serif" }}>
                    Upload a clear photo or scan of your vehicle registration document to verify ownership and get the Verified Owner badge.
                  </p>

                    <div className="bg-orange-900/20 border border-orange-700/50 rounded-lg p-4 mb-4">
                      <p className="text-xs text-orange-300">
                        <span className="font-bold">Privacy Notice:</span> Your registration will be verified by AI and immediately deleted. We only store verification status, not documents or personal information.
                      </p>
                    </div>

                    {!registrationFile ? (
                      <label className="block cursor-pointer">
                        <div className="border-2 border-dashed rounded-lg p-8 text-center transition-all" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                          <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--dim,#6a7486)' }} />
                          <p style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}>Click to upload registration</p>
                          <p className="text-xs mt-2" style={{ color: 'var(--dim,#6a7486)', fontFamily: "'Barlow',sans-serif" }}>PDF, JPG, or PNG</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleRegistrationSelect}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="space-y-4">
                        {registrationPreview && registrationFile.type.startsWith('image/') && (
                          <img
                            src={registrationPreview}
                            alt="Registration preview"
                            className="w-full rounded-lg max-h-64 object-contain"
                            style={{ background: 'rgba(0,0,0,0.5)' }}
                          />
                        )}
                        <div className="rounded-lg p-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <FileText className="w-8 h-8" style={{ color: 'var(--accent,#F97316)' }} />
                          <div className="flex-1">
                            <p style={{ color: 'var(--white,#eef4f8)', fontFamily: "'Barlow',sans-serif" }}>{registrationFile.name}</p>
                            <p className="text-xs" style={{ color: 'var(--dim,#6a7486)', fontFamily: "'Barlow',sans-serif" }}>
                              {(registrationFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setRegistrationFile(null);
                            setRegistrationPreview('');
                          }}
                          className="text-sm"
                          style={{ color: 'var(--accent,#F97316)', fontFamily: "'Barlow',sans-serif" }}
                        >
                          Change document
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSkipVehicle}
                  disabled={isProcessing}
                  className="px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}
                >
                  Skip for now
                </button>
                <button
                  onClick={handleVehicleSubmit}
                  disabled={isProcessing}
                  className="flex-1 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: 'var(--accent,#F97316)', color: '#030508', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      {registrationFile ? 'Verifying...' : 'Adding Vehicle...'}
                    </>
                  ) : (
                    <>
                      Add Vehicle
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--dim,#6a7486)', fontFamily: "'Barlow',sans-serif" }}>
          By continuing, you agree to MotoRate's Terms of Service
        </p>
      </div>
    </div>
  );
}
