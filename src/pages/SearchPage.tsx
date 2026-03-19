import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { hashPlate } from '../lib/hash';
import { Search, User, Car, Camera, Target, Upload, X, Info, Award, Star, Hash } from 'lucide-react';
import { Layout } from '../components/Layout';
import { FollowButton } from '../components/FollowButton';
import { VinClaimModal } from '../components/VinClaimModal';
import { createWorker } from 'tesseract.js';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { US_STATES } from '../data/vehicleData';

interface Profile {
  id: string;
  handle: string;
  avatar_url: string | null;
  car_image_url: string | null;
  reputation_score: number;
}

interface Vehicle {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  stock_image_url: string | null;
  license_plate: string;
  state: string | null;
  owner_id: string;
}

interface SearchPageProps {
  onNavigate: (page: any, data?: any) => void;
}

export default function SearchPage({ onNavigate }: SearchPageProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [plateState, setPlateState] = useState('IL');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [claimableVehicle, setClaimableVehicle] = useState<Vehicle | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUserSearch = searchQuery.trim().startsWith('@');
  const searchTerm = isUserSearch ? searchQuery.trim().slice(1) : searchQuery.trim().toUpperCase();

  useEffect(() => {
    const savedState = sessionStorage.getItem('searchPageState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.searchQuery) {
          setSearchQuery(state.searchQuery);
        }
        if (state.plateState) {
          setPlateState(state.plateState);
        }
      } catch (e) {
        console.error('Failed to restore search state:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (searchQuery || plateState !== 'IL') {
      sessionStorage.setItem('searchPageState', JSON.stringify({
        searchQuery,
        plateState
      }));
    }
  }, [searchQuery, plateState]);

  useEffect(() => {
    if (isUserSearch && searchTerm) {
      performUserSearch();
    } else if (!isUserSearch) {
      setUsers([]);
      setHasSearched(false);
    }
  }, [searchQuery]);

  async function performUserSearch() {
    if (!searchTerm) {
      setUsers([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, handle, avatar_url')
        .ilike('handle', `%${searchTerm}%`)
        .limit(20);

      if (error) {
        console.error('Search error:', error);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Search exception:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setShowCamera(true);
    } catch (err) {
      showToast('Unable to access camera. Please check permissions.', 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        stopCamera();
        processOCR(imageData);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setCapturedImage(imageData);
        processOCR(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const processOCR = async (imageData: string) => {
    setOcrProcessing(true);

    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(imageData);
      await worker.terminate();

      const cleanText = text.replace(/[^A-Z0-9]/g, '').toUpperCase();
      const plateMatch = cleanText.match(/[A-Z0-9]{4,8}/);

      if (plateMatch) {
        setSearchQuery(plateMatch[0]);
        showToast('Plate detected successfully!', 'success');
      } else {
        showToast('Could not detect plate number. Please enter manually.', 'error');
      }
    } catch (err) {
      showToast('OCR processing failed. Please enter plate manually.', 'error');
    } finally {
      setOcrProcessing(false);
    }
  };

  async function handlePlateSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchTerm || isUserSearch) return;

    setLoading(true);
    setClaimableVehicle(null);

    try {
      const plateHash = await hashPlate(plateState, searchTerm);
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select('id, plate_hash, year, make, model, trim, color, stock_image_url, profile_image_url, reputation_score, is_claimed, verification_tier, owner_id, plate_state, plate_number')
        .eq('plate_hash', plateHash)
        .maybeSingle();

      if (error) throw error;

      if (vehicle) {
        setClaimableVehicle(vehicle);
        if (!vehicle.owner_id || vehicle.owner_id === '') {
          showToast('Unclaimed vehicle found! You can claim ownership.', 'success');
        } else {
          showToast('Vehicle found! This vehicle has been claimed.', 'success');
        }
      } else {
        onNavigate('scan', {
          plateState,
          plateNumber: searchTerm,
          vehicleImage: capturedImage
        });
      }
    } catch (error) {
      console.error('Plate search error:', error);
      showToast('Failed to search plate', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleClaimSuccess() {
    setShowClaimModal(false);
    if (claimableVehicle) {
      showToast('Claim submitted successfully! We\'ll review it within 24-48 hours.', 'success');
      onNavigate('vehicle-detail', claimableVehicle.id);
    }
  }

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px' }}>Spot & Search</h1>
          <p className="text-secondary text-sm">Find vehicles by plate or users by handle</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }} className="rounded-lg p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-accent-primary flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="text-secondary mb-0.5">
              <span className="font-bold">User Search:</span> Start with <span className="font-mono px-1 rounded" style={{ background: 'rgba(255,255,255,0.06)' }}>@</span> (e.g., @username)
            </p>
            <p className="text-secondary">
              <span className="font-bold">Plate Search:</span> Enter plate number without @
            </p>
          </div>
        </div>

        <div className="bg-surface border border-surfacehighlight rounded-xl p-4 space-y-3 transition-all duration-300">
          <div className="bg-surfacehighlight/50 rounded-xl p-3 mb-3 flex items-center gap-2 text-sm">
            {isUserSearch ? (
              <>
                <User size={16} className="text-accent-primary" />
                <span className="text-secondary">
                  Searching by <span className="text-primary font-semibold">Username</span>
                </span>
              </>
            ) : (
              <>
                <Hash size={16} className="text-accent-primary" />
                <span className="text-secondary">
                  Searching by <span className="text-primary font-semibold">License Plate</span>
                </span>
              </>
            )}
            <button
              onClick={() => {
                if (isUserSearch) {
                  setSearchQuery('');
                } else {
                  setSearchQuery('@');
                }
              }}
              className="ml-auto text-accent-primary text-sm hover:underline font-semibold transition-all"
            >
              Switch to {isUserSearch ? 'Plate' : 'Username'}
            </button>
          </div>
          <div className="relative">
            <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-secondary w-5 h-5 transition-all duration-300 ${isUserSearch ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
              <User className="w-5 h-5" />
            </div>
            <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-secondary w-5 h-5 transition-all duration-300 ${!isUserSearch ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
              <Car className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plate, make, model, city…"
              style={{
                background: 'var(--carbon-2)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                color: 'var(--white)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              className={`w-full rounded-xl pl-10 pr-4 py-3 focus:outline-none placeholder:text-[var(--light)] transition-all duration-300 ${
                !isUserSearch ? 'font-mono tracking-widest uppercase' : ''
              }`}
            />
          </div>

          {!isUserSearch && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                  State
                </label>
                <select
                  value={plateState}
                  onChange={(e) => setPlateState(e.target.value)}
                  className="w-full bg-surfacehighlight border border-surfacehighlight rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent-primary"
                >
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name} ({state.code})
                    </option>
                  ))}
                </select>
              </div>

              {capturedImage && !ocrProcessing && (
                <div className="relative rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                  <img src={capturedImage} alt="Captured plate" className="w-full max-h-32 object-cover" />
                  <button
                    onClick={() => setCapturedImage(null)}
                    className="absolute top-1 right-1 p-1.5 bg-surface/90 backdrop-blur-sm rounded-lg hover:bg-surfacehighlight transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {ocrProcessing && (
                <div className="bg-accent-primary/10 border border-accent-primary/50 rounded-lg p-3 text-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-primary mx-auto mb-2"></div>
                  <p className="text-xs font-semibold">Processing image...</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="bg-accent-primary hover:bg-accent-hover rounded-lg px-3 py-2 font-bold uppercase tracking-wider text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-lg px-3 py-2 font-bold uppercase tracking-wider text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  Upload Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}
        </div>

        {!isUserSearch && searchTerm && (
          <form onSubmit={handlePlateSearch} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button
              type="submit"
              disabled={loading || ocrProcessing}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-hover hover:shadow-lg hover:shadow-accent-primary/20 rounded-xl font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Target className="w-5 h-5" />
              {loading ? 'Searching...' : 'Search Plate'}
            </button>
          </form>
        )}

        {claimableVehicle && (
          <div className="bg-gradient-to-br from-green-500/10 to-orange-500/10 border border-green-500/50 rounded-xl p-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Award className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700 }} className="text-green-300">
                  {claimableVehicle.year} {claimableVehicle.make} {claimableVehicle.model}
                </h3>
                <p style={{ fontFamily: 'var(--font-cond)', fontSize: '10px', color: 'var(--dim)' }}>
                  {claimableVehicle.color} • {claimableVehicle.state || plateState} • {claimableVehicle.owner_id ? 'Claimed' : 'Unclaimed'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onNavigate('vehicle-detail', { vehicleId: claimableVehicle.id, scrollTo: 'reviews' });
                }}
                className="bg-surface border border-surfacehighlight hover:border-accent-primary/50 rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all active:scale-95"
              >
                Reviews
              </button>
              <button
                onClick={() => {
                  onNavigate('vehicle-detail', { vehicleId: claimableVehicle.id, openReviewModal: true });
                }}
                className="bg-gradient-to-r from-accent-primary to-accent-hover hover:shadow-lg rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1"
              >
                <Star className="w-4 h-4" />
                <span style={{ fontFamily: 'var(--font-cond)' }}>Spot This Plate</span>
              </button>
              {claimableVehicle.owner_id ? (
                <>
                  <button
                    onClick={() => onNavigate('vehicle-detail', { vehicleId: claimableVehicle.id })}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all active:scale-95"
                  >
                    Full Profile
                  </button>
                  <button
                    onClick={() => onNavigate('user-profile', claimableVehicle.owner_id)}
                    className="bg-surface border border-surfacehighlight hover:border-accent-primary/50 rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1"
                  >
                    <User className="w-4 h-4" />
                    Owner
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowClaimModal(true)}
                  className="col-span-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1"
                >
                  <Award className="w-4 h-4" />
                  Claim This Vehicle
                </button>
              )}
            </div>
          </div>
        )}

        {isUserSearch && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-primary mx-auto mb-2"></div>
                <p className="text-secondary text-sm">Searching users...</p>
              </div>
            )}

            {!loading && hasSearched && (
              <div className="space-y-2">
                {users.length === 0 ? (
                  <div className="bg-surface border border-surfacehighlight rounded-xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                    <User className="w-10 h-10 text-secondary mx-auto mb-2 animate-in fade-in zoom-in-50 duration-500" />
                    <p className="text-secondary">No users found</p>
                    <p className="text-xs text-secondary mt-1">Try a different search term</p>
                  </div>
                ) : (
                  users.map((user, index) => (
                    <button
                      key={user.id}
                      onClick={() => onNavigate('user-profile', user.id)}
                      className="w-full bg-surface border border-surfacehighlight rounded-xl p-3 flex items-center gap-3 hover:border-accent-primary/30 hover:scale-[1.01] transition-all duration-200 text-left animate-in fade-in slide-in-from-left-4"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.handle || 'User'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-surfacehighlight flex items-center justify-center">
                          <User className="w-5 h-5 text-secondary" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px' }}>@{user.handle || 'anonymous'}</div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <FollowButton targetUserId={user.id} />
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-300">
          <div className="flex items-center justify-between p-4 bg-surface animate-in slide-in-from-top-4 duration-500">
            <h3 className="text-lg font-bold">Capture License Plate</h3>
            <button
              onClick={stopCamera}
              className="p-2 hover:bg-surfacehighlight rounded-lg transition-all duration-200 hover:rotate-90 hover:scale-110"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 relative animate-in zoom-in-95 duration-500">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-48 border-4 border-accent-primary rounded-2xl animate-pulse"></div>
            </div>
          </div>
          <div className="p-6 bg-surface animate-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={capturePhoto}
              className="w-full bg-accent-primary hover:bg-accent-hover rounded-xl px-6 py-4 font-bold uppercase tracking-wider transition-all active:scale-95 hover:scale-105 flex items-center justify-center gap-2"
            >
              <Camera className="w-6 h-6" />
              Capture Photo
            </button>
          </div>
        </div>
      )}

      {showClaimModal && claimableVehicle && user && (
        <VinClaimModal
          vehicleId={claimableVehicle.id}
          vehicleInfo={{
            year: claimableVehicle.year,
            make: claimableVehicle.make,
            model: claimableVehicle.model,
            plateState: claimableVehicle.state || plateState,
          }}
          onClose={() => setShowClaimModal(false)}
          onSuccess={handleClaimSuccess}
        />
      )}

    </Layout>
  );
}
