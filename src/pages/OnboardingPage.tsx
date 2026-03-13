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
      showToast('Welcome to Reputation!', 'success');
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
        showToast('Ownership verified! Welcome to Reputation!', 'success');
      } else {
        showToast('Vehicle added! Welcome to Reputation!', 'success');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      setError('Failed to complete onboarding. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="flex justify-end mb-4">
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Car className="w-12 h-12 text-orange-500" />
            <h1 className="text-4xl font-bold text-white">Welcome to Reputation</h1>
          </div>
          <p className="text-slate-400">Let's get you set up</p>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          {step === 'handle_setup' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Choose Your Handle</h2>
                <p className="text-slate-400">Pick a unique handle for your Reputation profile</p>
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
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
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  maxLength={30}
                />
                <p className="text-xs text-slate-500 mt-2">
                  This will be your unique identifier on Reputation
                </p>
              </div>

              <button
                onClick={handleHandleSubmit}
                disabled={isProcessing || !handle.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                <h2 className="text-2xl font-bold text-white mb-2">Add Your Vehicle (Optional)</h2>
                <p className="text-slate-400">
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
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Year *
                    </label>
                    <div className="relative">
                      <select
                        value={vehicleData.year}
                        onChange={(e) => handleVehicleInputChange('year', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none pr-10"
                      >
                        <option value="">Select Year</option>
                        {VEHICLE_YEARS.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Make *
                    </label>
                    <div className="relative">
                      <select
                        value={vehicleData.make}
                        onChange={(e) => handleVehicleInputChange('make', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none pr-10"
                      >
                        <option value="">Select Make</option>
                        {VEHICLE_MAKES.map((make) => (
                          <option key={make} value={make}>{make}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Model *
                  </label>
                  <div className="relative">
                    <select
                      value={vehicleData.model}
                      onChange={(e) => handleVehicleInputChange('model', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none pr-10"
                      disabled={!vehicleData.make}
                    >
                      <option value="">{vehicleData.make ? 'Select Model' : 'Select Make First'}</option>
                      {availableModels.map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Trim (Optional)
                  </label>
                  <input
                    type="text"
                    value={vehicleData.trim}
                    onChange={(e) => handleVehicleInputChange('trim', e.target.value)}
                    placeholder="e.g., Sport, Limited, EX"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Color
                  </label>
                  <div className="relative">
                    <select
                      value={vehicleData.color}
                      onChange={(e) => handleVehicleInputChange('color', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none pr-10"
                    >
                      <option value="">Select Color</option>
                      {VEHICLE_COLORS.map((color) => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      State *
                    </label>
                    <div className="relative">
                      <select
                        value={vehicleData.plateState}
                        onChange={(e) => handleVehicleInputChange('plateState', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none pr-10"
                      >
                        <option value="">Select State</option>
                        {US_STATES.map((state) => (
                          <option key={state.code} value={state.code}>
                            {state.code} - {state.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      License Plate *
                    </label>
                    <input
                      type="text"
                      value={vehicleData.plateNumber}
                      onChange={(e) => handleVehicleInputChange('plateNumber', e.target.value.toUpperCase())}
                      placeholder="ABC1234"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Upload Vehicle Registration (Optional)</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Upload a clear photo or scan of your vehicle registration document to verify ownership and get the Verified Owner badge.
                  </p>

                    <div className="bg-orange-900/20 border border-orange-700/50 rounded-lg p-4 mb-4">
                      <p className="text-xs text-orange-300">
                        <span className="font-bold">Privacy Notice:</span> Your registration will be verified by AI and immediately deleted. We only store verification status, not documents or personal information.
                      </p>
                    </div>

                    {!registrationFile ? (
                      <label className="block cursor-pointer">
                        <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-orange-500 transition-all">
                          <FileText className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                          <p className="text-slate-400">Click to upload registration</p>
                          <p className="text-xs text-slate-500 mt-2">PDF, JPG, or PNG</p>
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
                            className="w-full rounded-lg max-h-64 object-contain bg-slate-950"
                          />
                        )}
                        <div className="bg-slate-800 rounded-lg p-4 flex items-center gap-3">
                          <FileText className="w-8 h-8 text-orange-500" />
                          <div className="flex-1">
                            <p className="text-white font-medium">{registrationFile.name}</p>
                            <p className="text-xs text-slate-400">
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
                          className="text-sm text-orange-400 hover:text-orange-300"
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
                  className="px-6 py-3 bg-slate-700 text-slate-300 rounded-lg font-semibold hover:bg-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleVehicleSubmit}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        <p className="text-center text-slate-500 text-sm mt-6">
          By continuing, you agree to Reputation's Terms of Service
        </p>
      </div>
    </div>
  );
}
