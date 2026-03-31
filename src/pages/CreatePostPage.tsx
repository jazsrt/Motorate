import { useState, useRef, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { fuzzCoordinates, calculateDistance } from '../lib/locationPrivacy';
import { Camera, X, Globe, Users, Lock, AlertCircle, MapPin, ChevronLeft } from 'lucide-react';
import { useRateLimit } from '../hooks/useRateLimit';
import RateLimitError from '../components/RateLimitError';
import { useToast } from '../contexts/ToastContext';
import { validateVideoFile, getVideoMetadata } from '../utils/videoHelpers';
import { calculateAndAwardReputation, getDailyPostCount } from '../lib/reputation';

const inputStyle: React.CSSProperties = { width: '100%', background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '11px 14px', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#eef4f8', outline: 'none' };
const labelStyle: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#7a8e9e', marginBottom: 6, display: 'block' };
const primaryBtnStyle: React.CSSProperties = { width: '100%', padding: '13px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer' };

interface CreatePostPageProps {
  onNavigate: OnNavigate;
}

type PrivacyLevel = 'public' | 'friends' | 'private';

export function CreatePostPage({ onNavigate }: CreatePostPageProps) {
  const { user, profile } = useAuth();
  const { isAllowed, checkAndConsume, remainingTime } = useRateLimit('post');
  const { showToast, showRateLimitToast } = useToast();
  const [image, setImage] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>('public');
  const [locationLabel, setLocationLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showSpectatorModal, setShowSpectatorModal] = useState(false);
  const [upgradereRequested, setUpgradeRequested] = useState(false);
  const [ownerVehicles, setOwnerVehicles] = useState<Array<{
    id: string;
    make: string | null;
    model: string | null;
    year: number | null;
    plate_number: string | null;
    plate_state: string | null;
    stock_image_url: string | null;
    profile_image_url?: string | null;
  }>>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.role === 'spectator') {
      setShowSpectatorModal(true);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('vehicles')
      .select('id, make, model, year, plate_number, plate_state, stock_image_url, profile_image_url')
      .eq('owner_id', user.id)
      .eq('is_claimed', true)
      .then(({ data }) => {
        if (data) setOwnerVehicles(data);
      });
  }, [user]);

  const handleCancel = () => {
    const hasUnsavedChanges = caption.trim() !== '' || image !== null;

    if (hasUnsavedChanges) {
      if (confirm('Discard post? Your changes will be lost.')) {
        onNavigate('feed');
      }
    } else {
      onNavigate('feed');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      setError('Please upload an image or video file');
      return;
    }

    // Validate video files
    if (isVideo) {
      setLoading(true);
      setError('Validating video...');

      try {
        const validationError = await validateVideoFile(file);

        if (validationError) {
          setError(validationError);
          setLoading(false);
          // Clear the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }

        // Get and log video metadata
        const _metadata = await getVideoMetadata(file);
        showToast('Video validated successfully', 'success');
      } catch (err) {
        console.error('[Upload] Video validation error:', err);
        setError('Error validating video. Please try a different file.');
        setLoading(false);
        return;
      } finally {
        setLoading(false);
        setError('');
      }
    }

    // Validate image file size
    if (isImage && file.size > 10485760) {
      setError('Image file size must be less than 10MB');
      return;
    }

    setMediaFile(file);
    setContentType(isVideo ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const detectLocation = async () => {
    setDetectingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      setCoordinates({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (_err) {
      // Location detection skipped or denied
    } finally {
      setDetectingLocation(false);
    }
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const handleUpgradeRequest = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'upgrade_request',
          message: 'User has requested upgrade from spectator to user role',
          data: { role: 'spectator', requested_role: 'user' }
        });

      if (error) throw error;

      setUpgradeRequested(true);
      showToast('Upgrade request submitted! An admin will review it soon.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to submit upgrade request', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!image && !caption) {
      setError('Please add a photo or caption');
      return;
    }

    if (!checkAndConsume()) {
      const minutes = Math.ceil(remainingTime / 60000);
      showRateLimitToast('post', minutes);
      setError('Rate limit exceeded. Please wait before creating another post.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let finalImageUrl = image || null;

      if (mediaFile && image) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, mediaFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrl;
      }

      let fuzzedLat = null;
      let fuzzedLng = null;
      if (coordinates) {
        const fuzzed = fuzzCoordinates(coordinates.latitude, coordinates.longitude);
        fuzzedLat = fuzzed.latitude;
        fuzzedLng = fuzzed.longitude;
      }

      const { data: rateLimitCheck, error: rateLimitError } = await supabase
        .rpc('check_rate_limit', {
          p_user_id: user.id,
          p_action_type: 'post',
          p_max_actions: 3,
          p_window_minutes: 10
        });

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
      }

      if (rateLimitCheck === false) {
        throw new Error('Rate limit exceeded. Please wait a few minutes before posting again.');
      }

      const { data: post, error: postError} = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          vehicle_id: selectedVehicleId,
          post_type: 'photo',
          image_url: contentType === 'video' ? null : finalImageUrl,
          video_url: contentType === 'video' ? finalImageUrl : null,
          content_type: contentType,
          caption: caption || null,
          privacy_level: privacyLevel,
          location_label: locationLabel || null,
          location_lat: fuzzedLat,
          location_lng: fuzzedLng,
          moderation_status: 'approved',
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (postError || !post) throw postError || new Error('Failed to create post');

      await supabase.rpc('record_rate_limit_action', {
        p_user_id: user.id,
        p_action_type: 'post'
      });

      // REPUTATION: Award points for post creation
      try {
        const dailyCount = await getDailyPostCount(user.id);
        await calculateAndAwardReputation({
          userId: user.id,
          action: 'POST_CREATED',
          referenceType: 'post',
          referenceId: post.id,
          metadata: { dailyPostCount: dailyCount }
        });
      } catch (repError) {
        console.error('Reputation award error:', repError);
      }

      // GAMIFICATION: Award first post badge
      try {
        const { data: userPosts } = await supabase
          .from('posts')
          .select('id')
          .eq('author_id', user.id);

        if (userPosts && userPosts.length === 1) {
          const { data: firstPostBadge } = await supabase
            .from('badges')
            .select('id')
            .eq('slug', 'first-post')
            .maybeSingle();

          if (firstPostBadge) {
            await supabase
              .from('user_badges')
              .insert({
                user_id: user.id,
                badge_id: firstPostBadge.id
              });
            showToast('Badge Unlocked: First Post!', 'success');
          }
        }
      } catch (badgeError) {
        console.error('Badge award error:', badgeError);
      }

      // AUTO-AWARD: Check for tiered post badges
      try {
        const { data: _awardedBadges } = await supabase
          .rpc('check_and_award_badges', {
            p_user_id: user.id,
            p_action: 'post'
          });

        // Badges auto-awarded if applicable
      } catch (autoAwardError) {
        console.error('Auto-award badge error:', autoAwardError);
      }

      // Admin notifications and moderation handled by database triggers

      if (coordinates) {
        const { data: challenges } = await supabase
          .from('location_challenges')
          .select('*')
          .eq('is_active', true);

        if (challenges) {
          for (const challenge of challenges) {
            const distance = calculateDistance(
              coordinates.latitude,
              coordinates.longitude,
              challenge.lat,
              challenge.lng
            );

            if (distance <= challenge.radius_meters) {
              const { data: existing } = await supabase
                .from('challenge_completions')
                .select('id')
                .eq('user_id', user.id)
                .eq('challenge_id', challenge.id)
                .maybeSingle();

              if (!existing) {
                await supabase.from('challenge_completions').insert({
                  user_id: user.id,
                  challenge_id: challenge.id,
                  post_id: post.id,
                });
                // Points system handled separately
              }
            }
          }
        }
      }

      // Badge awards are now handled automatically by database triggers
      // BadgeContext will display notifications via Realtime

      showToast('Post created successfully!', 'success');

      onNavigate('feed');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const privacyOptions = [
    { value: 'public' as PrivacyLevel, icon: Globe, label: 'Public', desc: 'Everyone can see' },
    { value: 'friends' as PrivacyLevel, icon: Users, label: 'Friends', desc: 'Followers only' },
    { value: 'private' as PrivacyLevel, icon: Lock, label: 'Private', desc: 'Only you' },
  ];

  const isSpectator = profile?.role === 'spectator';

  return (
    <Layout currentPage="feed" onNavigate={onNavigate}>
      {showSpectatorModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, maxWidth: 400, width: '100%', padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <div style={{ width: 56, height: 56, background: 'rgba(249,115,22,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle style={{ width: 28, height: 28, color: '#F97316' }} />
              </div>
            </div>

            {upgradereRequested ? (
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#4ade80', marginBottom: 8 }}>Request Submitted!</h3>
                <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7a8e9e', lineHeight: 1.55 }}>
                  An admin will review your upgrade request soon. You'll receive a notification once it's been processed.
                </p>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                  <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#eef4f8', marginBottom: 8 }}>Upgrade Required</h3>
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7a8e9e', lineHeight: 1.55 }}>
                    Spectator accounts can browse and engage, but creating posts requires a User account.
                  </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14, marginBottom: 18 }}>
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 700, color: '#eef4f8', marginBottom: 8 }}>To create content, you can:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {['Request upgrade to User account (quick & free)', 'Claim your vehicle to get full access', 'Browse community content as spectator'].map(item => (
                      <span key={item} style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7a8e9e', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#F97316', flexShrink: 0 }} />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              {!upgradereRequested && (
                <>
                  <button
                    onClick={handleUpgradeRequest}
                    style={{ ...primaryBtnStyle, borderRadius: 10 }}
                  >
                    Request Upgrade
                  </button>
                  <button
                    onClick={() => {
                      setShowSpectatorModal(false);
                      onNavigate('profile');
                    }}
                    style={{ width: '100%', padding: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#eef4f8', cursor: 'pointer' }}
                  >
                    Claim Vehicle
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowSpectatorModal(false);
                  onNavigate('feed');
                }}
                style={{ width: '100%', padding: 13, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a8e9e', cursor: 'pointer' }}
              >
                {upgradereRequested ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 90 }}>
        {/* Sticky header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(6,9,14,0.97)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '14px 0 12px', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={handleCancel}
              aria-label="Go back"
              style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <ChevronLeft style={{ width: 16, height: 16, color: '#7a8e9e' }} />
            </button>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', margin: 0 }}>Create Post</h2>
          </div>
        </div>

        {isSpectator && (
          <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)', borderRadius: 12, padding: 18, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <AlertCircle style={{ width: 22, height: 22, color: '#F97316', flexShrink: 0, marginTop: 2 }} strokeWidth={1.5} />
              <div>
                <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#eef4f8', marginBottom: 6 }}>Drivers Only</h3>
                <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7a8e9e', lineHeight: 1.5, marginBottom: 14 }}>
                  Add your car to leave comments and create posts. Complete onboarding to unlock posting features.
                </p>
                <button
                  onClick={() => onNavigate('profile')}
                  style={{ ...primaryBtnStyle, width: 'auto', padding: '10px 22px', borderRadius: 8 }}
                >
                  Go to Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {!isSpectator && (
          <>
            <form onSubmit={handleSubmit}>
              {/* Media upload zone */}
              <div style={{ marginBottom: 18 }}>
                {image ? (
                  <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                    {contentType === 'video' ? (
                      <video src={image || undefined} controls style={{ width: '100%', maxHeight: 500, display: 'block' }} />
                    ) : (
                      <img src={image || undefined} alt="Post preview" style={{ width: '100%', display: 'block', borderRadius: 12 }} />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setImage(null);
                        setMediaFile(null);
                        setContentType('image');
                      }}
                      style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', background: 'rgba(6,9,14,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <X style={{ width: 14, height: 14, color: '#eef4f8' }} strokeWidth={1.5} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/mp4,video/webm,video/ogg"
                      capture="environment"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      id="camera-input"
                    />
                    <label
                      htmlFor="camera-input"
                      style={{ height: 200, borderRadius: 12, background: '#0a0d14', border: '2px dashed rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}
                    >
                      <Camera style={{ width: 28, height: 28, color: '#3a4e60' }} />
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5a6e7e' }}>Add Photo or Video</span>
                      <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#3a4e60' }}>
                        Images: Max 10MB | Videos: MP4, WebM, Ogg - Max 50MB, 5min
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Rate limit error */}
              {!isAllowed && <div style={{ marginBottom: 14 }}><RateLimitError action="post" remainingTime={remainingTime} /></div>}

              {/* Error message */}
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                  <AlertCircle style={{ width: 16, height: 16, color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#fca5a5', margin: 0, lineHeight: 1.45 }}>{error}</p>
                </div>
              )}

              {/* Vehicle Tag */}
              {ownerVehicles.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <label style={labelStyle}>Tag Your Vehicle <span style={{ fontWeight: 400, letterSpacing: '0.04em', textTransform: 'none' }}>(Optional)</span></label>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' as const, paddingBottom: 4 }}>
                    {/* None option */}
                    <button
                      type="button"
                      onClick={() => setSelectedVehicleId(null)}
                      style={{
                        flexShrink: 0, padding: '8px 14px',
                        background: selectedVehicleId === null ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
                        border: selectedVehicleId === null ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 8, cursor: 'pointer',
                        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                        color: selectedVehicleId === null ? '#F97316' : '#7a8e9e',
                      }}
                    >
                      No Tag
                    </button>

                    {ownerVehicles.map(v => {
                      const isSelected = selectedVehicleId === v.id;
                      const label = [v.year, v.make, v.model].filter(Boolean).join(' ');
                      const plate = [v.plate_state, v.plate_number].filter(Boolean).join(' \u00B7 ');
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVehicleId(v.id)}
                          style={{
                            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 12px 6px 6px',
                            background: isSelected ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
                            border: isSelected ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(255,255,255,0.07)',
                            borderRadius: 8, cursor: 'pointer',
                          }}
                        >
                          <div style={{
                            width: 36, height: 26, borderRadius: 5, overflow: 'hidden',
                            background: '#0e1320', flexShrink: 0,
                          }}>
                            {(v.profile_image_url || v.stock_image_url) && (
                              <img src={(v.profile_image_url || v.stock_image_url)!} alt={label}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                          </div>
                          <div style={{ textAlign: 'left' as const }}>
                            <div style={{
                              fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 700,
                              color: isSelected ? '#F97316' : '#eef4f8', lineHeight: 1,
                            }}>
                              {v.model || v.make || 'Vehicle'}
                            </div>
                            {plate && (
                              <div style={{
                                fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                                color: '#5a6e7e', marginTop: 2, letterSpacing: '0.08em',
                                fontVariantNumeric: 'tabular-nums',
                              }}>
                                {plate}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedVehicleId && (
                    <div style={{
                      marginTop: 6, fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
                      textTransform: 'uppercase' as const, color: '#F97316',
                    }}>
                      Reactions on this post will earn RP for the tagged vehicle
                    </div>
                  )}
                </div>
              )}

              {/* Caption */}
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Caption</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.55 }}
                  placeholder="Write a caption..."
                />
              </div>

              {/* Location */}
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Location <span style={{ fontWeight: 400, letterSpacing: '0.04em', textTransform: 'none' }}>(Optional)</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={locationLabel}
                    onChange={(e) => setLocationLabel(e.target.value)}
                    style={{ ...inputStyle, paddingRight: 40 }}
                    placeholder="Chicago, IL"
                  />
                  <button
                    type="button"
                    onClick={detectLocation}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    <MapPin style={{ width: 16, height: 16, color: coordinates ? '#4ade80' : '#3a4e60' }} />
                  </button>
                </div>
                {coordinates && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin style={{ width: 12, height: 12, color: '#4ade80' }} />
                    <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#4ade80' }}>GPS location detected (fuzzed for privacy)</span>
                  </div>
                )}
                {detectingLocation && (
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7a8e9e', display: 'block', marginTop: 6 }}>Detecting GPS location...</span>
                )}
                {!coordinates && !detectingLocation && (
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', display: 'block', marginTop: 6 }}>
                    Enter a city or general area, or allow location access for precise location
                  </span>
                )}
              </div>

              {/* Privacy selector */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Privacy</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {privacyOptions.map(({ value, icon: Icon, label, desc }) => {
                    const active = privacyLevel === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPrivacyLevel(value)}
                        style={{
                          padding: '14px 8px',
                          borderRadius: 10,
                          border: active ? '1px solid rgba(249,115,22,0.35)' : '1px solid rgba(255,255,255,0.05)',
                          background: active ? 'rgba(249,115,22,0.08)' : '#0a0d14',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Icon style={{ width: 18, height: 18, color: active ? '#F97316' : '#5a6e7e' }} />
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: active ? '#F97316' : '#7a8e9e' }}>{label}</span>
                        <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#5a6e7e' }}>{desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>

            {/* Fixed bottom submit */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: 'rgba(6,9,14,0.97)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
              <div style={{ maxWidth: 560, margin: '0 auto' }}>
                <button
                  type="button"
                  onClick={handleSubmit as unknown as React.MouseEventHandler}
                  disabled={loading || !isAllowed || !image}
                  style={{
                    ...primaryBtnStyle,
                    opacity: (loading || !isAllowed || !image) ? 0.35 : 1,
                    cursor: (loading || !isAllowed || !image) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Posting...' : !isAllowed ? 'Rate Limited' : 'Share Post'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
