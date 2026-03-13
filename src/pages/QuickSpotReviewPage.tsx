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
    <div className="flex items-center justify-between py-4 last:border-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span
        className="w-24"
        style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontWeight: 700,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          fontSize: '12px',
          color: 'var(--light,#a8bcc8)',
        }}
      >
        {label}
      </span>
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
              className="w-8 h-8 transition-colors"
              style={{
                fill: star <= (hovered || value) ? 'var(--accent,#F97316)' : 'rgba(255,255,255,0.15)',
                color: star <= (hovered || value) ? 'var(--accent,#F97316)' : 'rgba(255,255,255,0.15)',
              }}
            />
          </button>
        ))}
      </div>
      <span
        className="w-8 text-right"
        style={{
          fontFamily: "'Rajdhani',sans-serif",
          fontWeight: 700,
          fontSize: '18px',
          fontVariantNumeric: 'tabular-nums',
          color: value ? 'var(--white,#eef4f8)' : 'var(--dim,#6a7486)',
        }}
      >
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
        plate_number: (wizardData.plateNumber || '').trim().toUpperCase(),
        make: wizardData.make,
        model: wizardData.model,
        color: wizardData.color,
        year: wizardData.year ? parseInt(wizardData.year) : null,
        trim: wizardData.trim || null,
        stock_image_url: wizardData.stockImageUrl || null,
        is_claimed: false,
        verification_tier: 'shadow',
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

      // STEP 2: Create the post (serves as the review record + feed entry)
      const { data: reviewData, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          vehicle_id: vehicleId,
          post_type: 'spot',
          spot_type: 'quick',
          caption: comment.trim() || `Spotted this ride!`,
          image_url: photoUrl,
          spot_history_id: spotData.id,
          rating_driver: driverRating,
          rating_driving: drivingRating,
          rating_vehicle: vehicleRating,
          sentiment,
          moderation_status: 'approved',
          privacy_level: 'public',
        })
        .select('id')
        .single();

      if (postError) {
        console.error('Post insert error:', postError);
        throw new Error('Failed to record spot: ' + postError.message);
      }

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
    // If a quick spot was already submitted, pass upgrade flags
    if (reviewId) {
      onNavigate('detailed-review', {
        wizardData: { ...wizardData, vehicleId: vehicleId || wizardData.vehicleId },
        driverRating,
        drivingRating,
        vehicleRating,
        sentiment,
        comment,
        photoFile: photoFile || undefined,
        upgradeFromQuickSpot: true,
        existingReviewId: reviewId,
      });
    } else {
      onNavigate('detailed-review', {
        wizardData,
        driverRating,
        drivingRating,
        vehicleRating,
        sentiment,
        comment,
        photoFile: photoFile || undefined,
      });
    }
  };

  const vehicleName = [wizardData.year, wizardData.make, wizardData.model].filter(Boolean).join(' ');

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      <div className="max-w-lg mx-auto px-4 py-6" style={{ background: 'var(--black,#030508)', minHeight: '100%' }}>
        <div className="mb-6">
          <button
            onClick={() => onNavigate('scan')}
            className="flex items-center gap-2 transition-colors mb-5"
            style={{ color: 'var(--dim,#6a7486)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.1em' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all w-8"
                  style={{ background: 'var(--accent,#F97316)' }}
                />
              ))}
            </div>
            <span className="text-xs" style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}>Step 3 of 3 — 100%</span>
          </div>

          <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '24px', color: 'var(--white,#eef4f8)', textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: '4px' }}>
            Quick Spot
          </h1>
          <p className="text-sm" style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}>{vehicleName || 'Rate the vehicle'}</p>
        </div>

        {/* Vehicle Identity Card */}
        <div className="p-4 mb-5" style={{ background: 'var(--carbon-1,#0a0d14)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px' }}>
          <div className="flex items-center gap-4">
            <LicensePlateDisplay
              stateCode={wizardData.plateState}
              plateNumber={wizardData.plateNumber}
              className="scale-75 origin-left"
            />
            <div className="min-w-0">
              <p className="truncate" style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '18px', color: 'var(--white,#eef4f8)' }}>
                {vehicleName || 'Unknown Vehicle'}
              </p>
              {wizardData.color && (
                <p className="text-sm capitalize" style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}>{wizardData.color}{wizardData.trim ? ` • ${wizardData.trim}` : ''}</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 mb-4" style={{ background: 'var(--carbon-1,#0a0d14)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px' }}>
          <StarRow label="Driver" value={driverRating} onChange={setDriverRating} />
          <StarRow label="Driving" value={drivingRating} onChange={setDrivingRating} />
          <StarRow label="Vehicle" value={vehicleRating} onChange={setVehicleRating} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setSentiment('love')}
            className="flex items-center justify-center gap-2 py-4 rounded-xl transition-all active:scale-95"
            style={
              sentiment === 'love'
                ? { background: 'rgba(249,115,22,0.15)', border: '1px solid var(--accent,#F97316)', color: 'var(--accent,#F97316)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }
                : { border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }
            }
          >
            <Heart className="w-5 h-5" style={{ fill: sentiment === 'love' ? 'var(--accent,#F97316)' : 'none' }} />
            Love It
          </button>
          <button
            onClick={() => setSentiment('hate')}
            className="flex items-center justify-center gap-2 py-4 rounded-xl transition-all active:scale-95"
            style={
              sentiment === 'hate'
                ? { background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }
                : { border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }
            }
          >
            <ThumbsDown className="w-5 h-5" style={{ fill: sentiment === 'hate' ? '#ef4444' : 'none' }} />
            Hate It
          </button>
        </div>

        <div className="mb-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What caught your eye? How was the driver?"
            rows={3}
            className="w-full px-4 py-3 rounded-xl focus:outline-none resize-none text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--white,#eef4f8)', fontFamily: "'Barlow',sans-serif" }}
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
            <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
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
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}
            >
              <Camera className="w-4 h-4" />
              Add a Photo <span style={{ color: 'var(--dim,#6a7486)' }}>(optional)</span>
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
          className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 mb-3 disabled:opacity-40 transition-all active:scale-95"
          style={{ background: 'var(--accent,#F97316)', color: '#030508', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '13px', letterSpacing: '0.08em' }}
        >
          {(submitting || uploadingPhoto) ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : null}
          {uploadingPhoto ? 'Uploading photo...' : 'Submit Quick Spot (+15 pts)'}
        </button>

        <button
          onClick={handleGoDetailed}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl transition-all active:scale-95 disabled:cursor-not-allowed"
          style={
            canSubmit
              ? { background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.4)', color: 'var(--accent,#F97316)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--dim,#6a7486)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }
          }
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
            className="p-6 max-w-md w-full"
            style={{ background: 'var(--carbon-1,#0a0d14)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '20px', color: 'var(--white,#eef4f8)', textTransform: 'uppercase', marginBottom: '12px' }}>
              Want to leave a Full Spot for +20 bonus RP?
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}>
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
                className="py-3 rounded-xl transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}
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
                className="py-3 rounded-xl transition-all active:scale-95"
                style={{ background: 'var(--accent,#F97316)', color: '#030508', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}
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
