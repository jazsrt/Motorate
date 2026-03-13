import { useState, useRef, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { fuzzCoordinates, calculateDistance } from '../lib/locationPrivacy';
import { Camera, X, Globe, Users, Lock, AlertCircle, MapPin, ChevronLeft, Car } from 'lucide-react';
import { useRateLimit } from '../hooks/useRateLimit';
import RateLimitError from '../components/RateLimitError';
import { useToast } from '../contexts/ToastContext';
import { validateVideoFile, formatFileSize, formatDuration, getVideoMetadata, VIDEO_CONSTRAINTS } from '../utils/videoHelpers';
import { calculateAndAwardReputation, getDailyPostCount } from '../lib/reputation';

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.role === 'spectator') {
      setShowSpectatorModal(true);
    }
  }, [profile]);

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
        const metadata = await getVideoMetadata(file);
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
    } catch (err) {
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
    } catch (err: any) {
      showToast(err.message || 'Failed to submit upgrade request', 'error');
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
          vehicle_id: null,
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
        const { data: awardedBadges } = await supabase
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
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-surfacehighlight rounded-xl max-w-md w-full p-6 space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
            </div>

            {upgradeRequested ? (
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold uppercase tracking-wider text-green-400">Request Submitted!</h3>
                <p className="text-secondary">
                  An admin will review your upgrade request soon. You'll receive a notification once it's been processed.
                </p>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold uppercase tracking-wider">Upgrade Required</h3>
                  <p className="text-secondary">
                    Spectator accounts can browse and engage, but creating posts requires a User account.
                  </p>
                </div>
                <div className="bg-surfacehighlight rounded-xl p-4 space-y-2 text-sm">
                  <p className="font-bold">To create content, you can:</p>
                  <ul className="space-y-1 text-secondary">
                    <li>✓ Request upgrade to User account (quick & free)</li>
                    <li>✓ Claim your vehicle to get full access</li>
                    <li>✓ Browse community content as spectator</li>
                  </ul>
                </div>
              </>
            )}

            <div className="flex flex-col gap-3">
              {!upgradeRequested && (
                <>
                  <button
                    onClick={handleUpgradeRequest}
                    className="w-full bg-gradient-to-r from-accent-primary to-accent-hover hover:shadow-lg hover:shadow-accent-primary/20 rounded-xl px-4 py-3 font-bold uppercase tracking-wider text-sm transition-all active:scale-95"
                  >
                    Request Upgrade
                  </button>
                  <button
                    onClick={() => {
                      setShowSpectatorModal(false);
                      onNavigate('profile');
                    }}
                    className="w-full bg-surfacehighlight hover:bg-surfacehover rounded-xl px-4 py-3 font-bold uppercase tracking-wider text-sm transition-all"
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
                className="w-full bg-surface hover:bg-surfacehighlight border border-surfacehighlight rounded-xl px-4 py-3 font-bold uppercase tracking-wider text-sm transition-all"
              >
                {upgradeRequested ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-surfacehighlight rounded-lg transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="font-heading font-bold mb-2">Create Post</h2>
            <p className="text-secondary text-sm">Share your car</p>
          </div>
        </div>

        {isSpectator && (
          <div className="card-crisp bg-orange-900/20 border-orange-500">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" strokeWidth={1.5} />
              <div>
                <h3 className="font-heading font-bold text-lg text-white mb-2">Drivers Only</h3>
                <p className="text-slate-300 mb-4 text-sm">
                  Add your car to leave comments and create posts. Complete onboarding to unlock posting features.
                </p>
                <button
                  onClick={() => onNavigate('profile')}
                  className="btn-primary"
                >
                  Go to Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {!isSpectator && (
          <>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card-crisp p-0 overflow-hidden">
            {image ? (
              <div className="relative">
                {contentType === 'video' ? (
                  <video src={image || undefined} controls className="w-full max-h-[500px]" />
                ) : (
                  <img src={image || undefined} alt="Post preview" className="w-full" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setMediaFile(null);
                    setContentType('image');
                  }}
                  className="absolute top-2 right-2 p-2 bg-surface/90 backdrop-blur-sm rounded-xl hover:bg-surfacehighlight transition-all active:scale-95"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <div className="p-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/ogg"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="camera-input"
                />
                <label
                  htmlFor="camera-input"
                  className="w-full bg-accent-primary hover:bg-accent-hover rounded-xl px-6 py-4 font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-6 h-6" />
                  Take Photo / Upload
                </label>
                <p className="text-xs text-neutral-400 text-center mt-3">
                  Images: Max 10MB | Videos: MP4 (H.264), WebM, Ogg - Max 50MB, 5min
                </p>
              </div>
            )}

              <div className="p-6 space-y-4">
                {!isAllowed && <RateLimitError action="post" remainingTime={remainingTime} />}
                {error && (
                  <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2">
                    Caption
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    className="w-full bg-surfacehighlight border border-surfacehighlight rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
                    placeholder="Write a caption..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-3">
                    Privacy
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {privacyOptions.map(({ value, icon: Icon, label, desc }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPrivacyLevel(value)}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          privacyLevel === value
                            ? 'border-accent-primary bg-accent-primary/10'
                            : 'border-surfacehighlight bg-surfacehighlight hover:border-accent-primary/50'
                        }`}
                      >
                        <Icon className="w-5 h-5 mx-auto mb-1" />
                        <div className="text-xs font-bold">{label}</div>
                        <div className="text-[10px] text-secondary">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2">
                    Location <span className="text-xs font-normal normal-case">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={locationLabel}
                    onChange={(e) => setLocationLabel(e.target.value)}
                    className="w-full bg-surfacehighlight border border-surfacehighlight rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    placeholder="Chicago, IL"
                  />
                  {coordinates && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                      <MapPin className="w-4 h-4" />
                      <span>GPS location detected (fuzzed for privacy)</span>
                    </div>
                  )}
                  {detectingLocation && (
                    <div className="mt-2 text-xs text-secondary">Detecting GPS location...</div>
                  )}
                  {!coordinates && !detectingLocation && (
                    <p className="mt-2 text-xs text-secondary">
                      Enter a city or general area, or allow location access for precise location
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !isAllowed}
                  className="w-full bg-gradient-to-r from-accent-primary to-accent-hover hover:shadow-lg hover:shadow-accent-primary/20 disabled:from-surfacehighlight disabled:to-surfacehighlight disabled:cursor-not-allowed rounded-xl px-6 py-4 font-bold uppercase tracking-wider transition-all active:scale-95"
                >
                  {loading ? 'Posting...' : !isAllowed ? 'Rate Limited' : 'Share Post'}
                </button>
              </div>
            </div>
        </form>
        </>
        )}
      </div>
    </Layout>
  );
}
