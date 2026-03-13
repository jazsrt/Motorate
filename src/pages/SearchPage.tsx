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
        .select('*')
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
      <div className="max-w-4xl mx-auto space-y-4" style={{ background: 'var(--black,#030508)' }}>
        <div>
          <h1
            style={{
              fontFamily: "'Rajdhani',sans-serif",
              fontWeight: 700,
              fontSize: '26px',
              color: 'var(--white,#eef4f8)',
              marginBottom: '4px',
            }}
          >
            Spot & Search
          </h1>
          <p
            style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontWeight: 700,
              fontSize: '10px',
              textTransform: 'uppercase',
              color: 'var(--dim,#6a7486)',
              letterSpacing: '0.08em',
            }}
          >
            Find vehicles by plate or users by handle
          </p>
        </div>

        <div
          className="rounded-lg p-3 flex items-start gap-2"
          style={{
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.2)',
          }}
        >
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent,#F97316)' }} />
          <div className="text-xs">
            <p style={{ color: 'var(--light,#a8bcc8)', marginBottom: '2px', fontFamily: "'Barlow',sans-serif" }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700 }}>User Search:</span>{' '}
              Start with{' '}
              <span
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  background: 'rgba(249,115,22,0.1)',
                  padding: '0 4px',
                  borderRadius: '4px',
                }}
              >
                @
              </span>{' '}
              (e.g., @username)
            </p>
            <p style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700 }}>Plate Search:</span>{' '}
              Enter plate number without @
            </p>
          </div>
        </div>

        <div
          className="p-4 space-y-3 transition-all duration-300"
          style={{
            background: 'var(--carbon-1,#0a0d14)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '14px',
          }}
        >
          <div
            className="rounded-xl p-3 mb-3 flex items-center gap-2 text-sm"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            {isUserSearch ? (
              <>
                <User size={16} style={{ color: 'var(--accent,#F97316)' }} />
                <span style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}>
                  Searching by{' '}
                  <span style={{ color: 'var(--white,#eef4f8)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700 }}>
                    Username
                  </span>
                </span>
              </>
            ) : (
              <>
                <Hash size={16} style={{ color: 'var(--accent,#F97316)' }} />
                <span style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}>
                  Searching by{' '}
                  <span style={{ color: 'var(--white,#eef4f8)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700 }}>
                    License Plate
                  </span>
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
              className="ml-auto hover:underline transition-all"
              style={{
                color: 'var(--accent,#F97316)',
                fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              Switch to {isUserSearch ? 'Plate' : 'Username'}
            </button>
          </div>
          <div className="relative">
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-all duration-300 ${isUserSearch ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
              style={{ color: 'var(--light,#a8bcc8)' }}
            >
              <User className="w-5 h-5" />
            </div>
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-all duration-300 ${!isUserSearch ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
              style={{ color: 'var(--light,#a8bcc8)' }}
            >
              <Car className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isUserSearch ? 'Search users (e.g., @johndoe)' : 'Enter plate number (e.g., ABC1234)'}
              className="w-full pl-10 pr-4 py-3 focus:outline-none transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'var(--white,#eef4f8)',
                fontFamily: !isUserSearch ? "'JetBrains Mono',monospace" : "'Barlow',sans-serif",
                letterSpacing: !isUserSearch ? '0.1em' : undefined,
                textTransform: !isUserSearch ? 'uppercase' : undefined,
              }}
            />
          </div>

          {!isUserSearch && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <label
                  className="block mb-1"
                  style={{
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontWeight: 700,
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: 'var(--dim,#6a7486)',
                    letterSpacing: '0.08em',
                  }}
                >
                  State
                </label>
                <select
                  value={plateState}
                  onChange={(e) => setPlateState(e.target.value)}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'var(--white,#eef4f8)',
                    fontFamily: "'Barlow',sans-serif",
                  }}
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
                    className="absolute top-1 right-1 p-1.5 backdrop-blur-sm rounded-lg transition-colors"
                    style={{
                      background: 'rgba(10,13,20,0.9)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'var(--light,#a8bcc8)',
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {ocrProcessing && (
                <div
                  className="rounded-lg p-3 text-center animate-in fade-in zoom-in-95 duration-300"
                  style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}
                >
                  <div
                    className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto mb-2"
                    style={{ borderColor: 'var(--accent,#F97316)' }}
                  />
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--light,#a8bcc8)',
                      fontFamily: "'Barlow',sans-serif",
                    }}
                  >
                    Processing image...
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="rounded-lg px-3 py-2 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  style={{
                    background: 'var(--accent,#F97316)',
                    color: '#030508',
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontWeight: 700,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg px-3 py-2 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  style={{
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'transparent',
                    color: 'var(--light,#a8bcc8)',
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontWeight: 700,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
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
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--accent,#F97316)',
                color: '#030508',
                fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 700,
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              <Target className="w-5 h-5" />
              {loading ? 'Searching...' : 'Search Plate'}
            </button>
          </form>
        )}

        {claimableVehicle && (
          <div
            className="rounded-xl p-4 animate-in fade-in zoom-in-95 duration-300"
            style={{
              background: 'var(--carbon-1,#0a0d14)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '14px',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="p-2 rounded-lg"
                style={{ background: 'rgba(34,197,94,0.12)' }}
              >
                <Award className="w-5 h-5" style={{ color: '#4ade80' }} />
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: "'Rajdhani',sans-serif",
                    fontWeight: 700,
                    color: '#4ade80',
                    fontSize: '16px',
                  }}
                >
                  {claimableVehicle.year} {claimableVehicle.make} {claimableVehicle.model}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--dim,#6a7486)', fontFamily: "'Barlow',sans-serif" }}>
                  {claimableVehicle.color} • {claimableVehicle.state || plateState} •{' '}
                  {claimableVehicle.owner_id ? 'Claimed' : 'Unclaimed'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onNavigate('vehicle-detail', { vehicleId: claimableVehicle.id, scrollTo: 'reviews' });
                }}
                className="rounded-lg px-4 py-2 text-sm transition-all active:scale-95"
                style={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent',
                  color: 'var(--light,#a8bcc8)',
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Spots
              </button>
              <button
                onClick={() => {
                  onNavigate('vehicle-detail', { vehicleId: claimableVehicle.id, openReviewModal: true });
                }}
                className="rounded-lg px-4 py-2 text-sm transition-all active:scale-95 flex items-center justify-center gap-1"
                style={{
                  background: 'var(--accent,#F97316)',
                  color: '#030508',
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <Star className="w-4 h-4" />
                Spot This Plate
              </button>
              {claimableVehicle.owner_id ? (
                <>
                  <button
                    onClick={() => onNavigate('vehicle-detail', { vehicleId: claimableVehicle.id })}
                    className="rounded-lg px-4 py-2 text-sm transition-all active:scale-95"
                    style={{
                      background: 'rgba(34,197,94,0.15)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      color: '#4ade80',
                      fontFamily: "'Barlow Condensed',sans-serif",
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Full Profile
                  </button>
                  <button
                    onClick={() => onNavigate('user-profile', claimableVehicle.owner_id)}
                    className="rounded-lg px-4 py-2 text-sm transition-all active:scale-95 flex items-center justify-center gap-1"
                    style={{
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'transparent',
                      color: 'var(--light,#a8bcc8)',
                      fontFamily: "'Barlow Condensed',sans-serif",
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <User className="w-4 h-4" />
                    Owner
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowClaimModal(true)}
                  className="col-span-2 rounded-lg px-4 py-2 text-sm transition-all active:scale-95 flex items-center justify-center gap-1"
                  style={{
                    background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    color: '#4ade80',
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
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
                <div
                  className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto mb-2"
                  style={{ borderColor: 'var(--accent,#F97316)' }}
                />
                <p style={{ color: 'var(--dim,#6a7486)', fontSize: '14px', fontFamily: "'Barlow',sans-serif" }}>
                  Searching users...
                </p>
              </div>
            )}

            {!loading && hasSearched && (
              <div className="space-y-2">
                {users.length === 0 ? (
                  <div
                    className="p-8 text-center animate-in fade-in zoom-in-95 duration-300"
                    style={{
                      background: 'var(--carbon-1,#0a0d14)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '14px',
                    }}
                  >
                    <User
                      className="w-10 h-10 mx-auto mb-2 animate-in fade-in zoom-in-50 duration-500"
                      style={{ color: 'var(--dim,#6a7486)' }}
                    />
                    <p style={{ color: 'var(--dim,#6a7486)', fontFamily: "'Barlow',sans-serif" }}>No users found</p>
                    <p style={{ fontSize: '12px', color: 'var(--dim,#6a7486)', marginTop: '4px', fontFamily: "'Barlow',sans-serif" }}>
                      Try a different search term
                    </p>
                  </div>
                ) : (
                  users.map((user, index) => (
                    <button
                      key={user.id}
                      onClick={() => onNavigate('user-profile', user.id)}
                      className="w-full p-3 flex items-center gap-3 hover:scale-[1.01] transition-all duration-200 text-left animate-in fade-in slide-in-from-left-4"
                      style={{
                        background: 'var(--carbon-1,#0a0d14)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '14px',
                        animationDelay: `${index * 30}ms`,
                      }}
                    >
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.handle || 'User'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(255,255,255,0.05)' }}
                        >
                          <User className="w-5 h-5" style={{ color: 'var(--dim,#6a7486)' }} />
                        </div>
                      )}
                      <div className="flex-1">
                        <div
                          style={{
                            fontFamily: "'Barlow Condensed',sans-serif",
                            fontWeight: 700,
                            color: 'var(--white,#eef4f8)',
                          }}
                        >
                          @{user.handle || 'anonymous'}
                        </div>
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
        <div className="fixed inset-0 z-50 flex flex-col animate-in fade-in duration-300" style={{ background: '#030508' }}>
          <div
            className="flex items-center justify-between p-4 animate-in slide-in-from-top-4 duration-500"
            style={{ background: 'var(--carbon-1,#0a0d14)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <h3
              style={{
                fontFamily: "'Rajdhani',sans-serif",
                fontWeight: 700,
                fontSize: '18px',
                color: 'var(--white,#eef4f8)',
              }}
            >
              Capture License Plate
            </h3>
            <button
              onClick={stopCamera}
              className="p-2 rounded-lg transition-all duration-200 hover:rotate-90 hover:scale-110"
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--light,#a8bcc8)',
              }}
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
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-48 rounded-2xl animate-pulse"
                style={{ border: '4px solid var(--accent,#F97316)' }}
              />
            </div>
          </div>
          <div
            className="p-6 animate-in slide-in-from-bottom-4 duration-500"
            style={{ background: 'var(--carbon-1,#0a0d14)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <button
              onClick={capturePhoto}
              className="w-full rounded-xl px-6 py-4 transition-all active:scale-95 hover:scale-105 flex items-center justify-center gap-2"
              style={{
                background: 'var(--accent,#F97316)',
                color: '#030508',
                fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 700,
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
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
