import { useState, useRef } from 'react';
import { ArrowLeft, Star, Heart, ThumbsDown, Zap, ChevronRight, Camera, X, Image } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { hashPlate } from '../lib/hash';
import { calculateAndAwardReputation } from '../lib/reputation';
import { uploadImage } from '../lib/storage';
import { type OnNavigate } from '../types/navigation';
import type { SpotWizardData } from '../types/spot';
import { LicensePlateDisplay } from '../components/LicensePlateDisplay';
import { StickerSelector } from '../components/StickerSelector';
import { giveSticker } from '../lib/stickerService';

interface QuickSpotReviewPageProps {
  onNavigate: OnNavigate;
  wizardData: SpotWizardData;
}

function StarRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center justify-between py-4 border-b border-surfacehighlight last:border-0">
      <span className="font-heading font-bold uppercase tracking-tight text-sm text-secondary w-24">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-1 transition-transform active:scale-90"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= (hovered || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-surfacehighlight text-surfacehighlight'
              }`}
            />
          </button>
        ))}
      </div>
      <span className={`text-lg font-bold w-8 text-right ${value ? 'text-primary' : 'text-neutral-600'}`}>
        {value ? `${value}.0` : '—'}
      </span>
    </div>
  );
}

export function QuickSpotReviewPage({ onNavigate, wizardData }: QuickSpotReviewPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [driverRating, setDriverRating] = useState(0);
  const [drivingRating, setDrivingRating] = useState(0);
  const [vehicleRating, setVehicleRating] = useState(0);
  const [sentiment, setSentiment] = useState<'love' | 'hate' | null>(null);
  const [comment, setComment] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [selectedStickerIds, setSelectedStickerIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ratingsComplete = driverRating > 0 && drivingRating > 0 && vehicleRating > 0;
  const canSubmit = ratingsComplete && sentiment !== null;

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const ensureVehicleExists = async (): Promise<string> => {
    if (wizardData.vehicleId) return wizardData.vehicleId;

    const plateHash = wizardData.plateHash || await hashPlate(wizardData.plateState, wizardData.plateNumber);

    const { data: existing } = await supabase
      .from('vehicles')
      .select('id')
      .eq('plate_hash', plateHash)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: newVehicle, error } = await supabase
      .from('vehicles')
      .insert({
        plate_hash: plateHash,
        plate_state: wizardData.plateState,
        plate_number: wizardData.plateNumber,
        make: wizardData.make,
        model: wizardData.model,
        color: wizardData.color,
        year: wizardData.year ? parseInt(wizardData.year) : null,
        trim: wizardData.trim || null,
        is_claimed: false,
        created_by_user_id: user?.id,
      })
      .select('id')
      .single();

    if (error) throw new Error('Failed to create vehicle: ' + error.message);
    return newVehicle.id;
  };

  const handleSubmitQuick = async () => {
    if (!user || !canSubmit || submitting) return;

    setSubmitting(true);
    try {
      const vehicleId = await ensureVehicleExists();

      let photoUrl: string | null = null;
      if (photoFile) {
        setUploadingPhoto(true);
        try {
          photoUrl = await uploadImage(photoFile, 'reviews');
        } catch {
          // photo upload failure is non-blocking
        } finally {
          setUploadingPhoto(false);
        }
      }

      // STEP 1: Record the spot in spot_history
      const spotPayload: Record<string, unknown> = {
        spotter_id: user.id,
        vehicle_id: vehicleId,
        spot_type: 'quick',
        reputation_earned: 15,
      };
      if (photoUrl) spotPayload.photo_url = photoUrl;

      const { data: spotData, error: spotError } = await supabase
        .from('spot_history')
        .insert(spotPayload)
        .select('id')
        .single();

      if (spotError) {
        console.error('Spot insert error:', spotError);
        throw new Error('Failed to record spot: ' + spotError.message);
      }

      // STEP 2: Record the review in reviews table
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          vehicle_id: vehicleId,
          author_id: user.id,
          rating_driver: driverRating,
          rating_driving: drivingRating,
          rating_vehicle: vehicleRating,
          sentiment,
          comment: comment.trim() || null,
          spot_type: 'quick',
          spot_history_id: spotData.id,
        })
        .select('id')
        .single();

      if (reviewError) {
        console.error('Review insert error:', reviewError);
        throw new Error('Failed to record review: ' + reviewError.message);
      }

      // STEP 3: Create feed post so the spot appears in the feed
      await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          vehicle_id: vehicleId,
          post_type: 'spot',
          spot_type: 'quick',
          caption: comment.trim() || `Spotted this ride!`,
          image_url: photoUrl,
          spot_history_id: spotData.id,
          review_id: reviewData.id,
          rating_driver: driverRating,
          rating_driving: drivingRating,
          rating_vehicle: vehicleRating,
          sentiment,
          moderation_status: 'approved',
          privacy_level: 'public',
        });

      // STEP 4: Award reputation
      await calculateAndAwardReputation({
        userId: user.id,
        action: 'SPOT_QUICK_REVIEW',
        referenceType: 'review',
        referenceId: reviewData.id,
      });

      // STEP 5: Check for badge awards (counts from spot_history and reviews)
      try {
        await supabase.rpc('check_and_award_badges', {
          p_user_id: user.id,
          p_action: 'spot'
        });
        await supabase.rpc('check_and_award_badges', {
          p_user_id: user.id,
          p_action: 'review'
        });
      } catch (autoAwardError) {
        console.error('Auto-award badge error:', autoAwardError);
      }

      // Save bumper stickers
      if (selectedStickerIds.length > 0 && user) {
        for (const stickerId of selectedStickerIds) {
          await giveSticker(vehicleId, stickerId, user.id);
        }
      }

      // STEP 6: Notify vehicle owner (if claimed)
      try {
        const { data: vehicleData } = await supabase
          .from('vehicles')
          .select('owner_id, profiles!vehicles_owner_id_fkey(handle)')
          .eq('id', vehicleId)
          .maybeSingle();

        if (vehicleData?.owner_id && vehicleData.owner_id !== user.id) {
          const { data: spotterProfile } = await supabase
            .from('profiles')
            .select('handle')
            .eq('id', user.id)
            .maybeSingle();

          await supabase.from('notifications').insert({
            user_id: vehicleData.owner_id,
            type: 'spot',
            title: 'Your vehicle was spotted!',
            body: `@${spotterProfile?.handle || 'Someone'} spotted your vehicle`,
            reference_type: 'spot_history',
            reference_id: spotData.id,
          });
        }
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }

      // Store data for upgrade prompt
      setReviewId(reviewData.id);
      setVehicleId(vehicleId);

      // Show upgrade prompt instead of navigating away
      setShowUpgradePrompt(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit spot', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoDetailed = () => {
    if (!canSubmit) {
      showToast('Please complete all ratings and select Love It or Hate It first', 'error');
      return;
    }
    onNavigate('detailed-review', {
      wizardData,
      driverRating,
      drivingRating,
      vehicleRating,
      sentiment,
      comment,
      photoFile: photoFile || undefined,
    });
  };

  const vehicleName = [wizardData.year, wizardData.make, wizardData.model].filter(Boolean).join(' ');

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => onNavigate('scan')}
            className="flex items-center gap-2 text-secondary hover:text-primary transition-colors mb-5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all w-8"
                  style={{ background: 'linear-gradient(90deg, #f97316, #f59e0b)' }}
                />
              ))}
            </div>
            <span className="text-xs text-secondary">Step 3 of 3 — 100%</span>
          </div>

          <h1 className="text-2xl font-heading font-black uppercase tracking-tight text-primary mb-1">
            Quick Spot
          </h1>
          <p className="text-secondary text-sm">{vehicleName || 'Rate the vehicle'}</p>
        </div>

        {/* Vehicle Identity Card */}
        <div className="bg-surface border border-surfacehighlight rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-4">
            <LicensePlateDisplay
              stateCode={wizardData.plateState}
              plateNumber={wizardData.plateNumber}
              className="scale-75 origin-left"
            />
            <div className="min-w-0">
              <p className="font-heading font-bold text-lg text-primary truncate">
                {vehicleName || 'Unknown Vehicle'}
              </p>
              {wizardData.color && (
                <p className="text-sm text-secondary capitalize">{wizardData.color}{wizardData.trim ? ` • ${wizardData.trim}` : ''}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-surface border border-surfacehighlight rounded-2xl p-5 mb-4">
          <StarRow label="Driver" value={driverRating} onChange={setDriverRating} />
          <StarRow label="Driving" value={drivingRating} onChange={setDrivingRating} />
          <StarRow label="Vehicle" value={vehicleRating} onChange={setVehicleRating} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setSentiment('love')}
            className={`flex items-center justify-center gap-2 py-4 rounded-xl font-heading font-bold uppercase tracking-tight text-base transition-all active:scale-95 border-2 ${
              sentiment === 'love'
                ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                : 'bg-surface border-surfacehighlight text-secondary hover:border-rose-500/50'
            }`}
          >
            <Heart className={`w-5 h-5 ${sentiment === 'love' ? 'fill-rose-400' : ''}`} />
            Love It
          </button>
          <button
            onClick={() => setSentiment('hate')}
            className={`flex items-center justify-center gap-2 py-4 rounded-xl font-heading font-bold uppercase tracking-tight text-base transition-all active:scale-95 border-2 ${
              sentiment === 'hate'
                ? 'bg-neutral-700/50 border-neutral-400 text-neutral-300'
                : 'bg-surface border-surfacehighlight text-secondary hover:border-neutral-500/50'
            }`}
          >
            <ThumbsDown className={`w-5 h-5 ${sentiment === 'hate' ? 'fill-neutral-300' : ''}`} />
            Hate It
          </button>
        </div>

        <div className="mb-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What caught your eye? How was the driver?"
            rows={3}
            className="w-full bg-surface border border-surfacehighlight rounded-xl px-4 py-3 text-primary placeholder-neutral-600 focus:outline-none focus:border-orange transition-colors resize-none text-sm"
          />
        </div>

        <div className="mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelect}
            className="hidden"
          />
          {photoPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-surfacehighlight">
              <img
                src={photoPreview}
                alt="Spot photo"
                className="w-full h-40 object-cover"
              />
              <button
                onClick={clearPhoto}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded-lg">
                <span className="text-xs text-white font-medium">Photo attached</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-surface border border-dashed border-surfacehighlight hover:border-[rgba(249,115,22,0.5)] rounded-xl text-secondary hover:text-accent-2 text-sm font-medium transition-colors"
            >
              <Camera className="w-4 h-4" />
              Add a Photo <span className="text-neutral-600">(optional)</span>
              <Image className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>

        {/* Bumper Stickers */}
        <div className="mb-5">
          <StickerSelector
            selectedStickers={selectedStickerIds}
            onToggleSticker={(id) => {
              setSelectedStickerIds(prev =>
                prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
              );
            }}
          />
        </div>

        <button
          onClick={handleSubmitQuick}
          disabled={!canSubmit || submitting || uploadingPhoto}
          className="w-full py-3.5 rounded-xl text-white text-[15px] font-bold font-heading tracking-wide flex items-center justify-center gap-2 mb-3 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
        >
          {(submitting || uploadingPhoto) ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : null}
          {uploadingPhoto ? 'Uploading photo...' : 'Submit Quick Spot (+15 pts)'}
        </button>

        <button
          onClick={handleGoDetailed}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-[#F97316] to-[#fb923c] hover:from-[#F97316] hover:to-[#fb923c] disabled:from-surfacehighlight disabled:to-surfacehighlight disabled:text-secondary rounded-xl font-heading font-bold uppercase tracking-tight text-base transition-all active:scale-95 disabled:cursor-not-allowed shadow-lg disabled:shadow-none"
        >
          <Zap className="w-5 h-5" />
          +20 PTS: Add Year, Make & Model
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {showUpgradePrompt && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowUpgradePrompt(false);
            onNavigate('completed-review', {
              vehicleId,
              reviewId,
              spotType: 'quick',
              wizardData: { ...wizardData, vehicleId },
              driverRating,
              drivingRating,
              vehicleRating,
              sentiment,
              comment,
              reputationEarned: 15,
            });
          }}
        >
          <div
            className="bg-surface border border-surfacehighlight rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-heading font-black uppercase tracking-tight text-primary mb-3">
              Want to leave a Full Spot for +20 bonus RP?
            </h2>
            <p className="text-sm text-secondary mb-6">
              Add detailed ratings (Looks, Sound, Condition) to earn extra reputation points
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowUpgradePrompt(false);
                  onNavigate('completed-review', {
                    vehicleId,
                    reviewId,
                    spotType: 'quick',
                    wizardData: { ...wizardData, vehicleId },
                    driverRating,
                    drivingRating,
                    vehicleRating,
                    sentiment,
                    comment,
                    reputationEarned: 15,
                  });
                }}
                className="py-3 bg-surface border border-surfacehighlight rounded-xl font-heading font-bold uppercase tracking-tight text-sm text-secondary hover:text-primary hover:border-primary transition-all"
              >
                No, I'm Done
              </button>
              <button
                onClick={() => {
                  setShowUpgradePrompt(false);
                  onNavigate('detailed-review', {
                    wizardData: { ...wizardData, vehicleId },
                    driverRating,
                    drivingRating,
                    vehicleRating,
                    sentiment,
                    comment,
                    upgradeFromQuickSpot: true,
                    existingReviewId: reviewId,
                  });
                }}
                className="py-3 rounded-xl font-heading font-bold uppercase tracking-tight text-sm text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
              >
                Yes, Upgrade to Full Spot
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
