import { useState, useRef } from 'react';
import { ArrowLeft, Star, Heart, ThumbsDown, Camera, X } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { hashPlate } from '../lib/hash';
import { calculateAndAwardReputation } from '../lib/reputation';
import { uploadImage } from '../lib/storage';
import { type OnNavigate } from '../types/navigation';
import type { SpotWizardData } from '../types/spot';
import { LicensePlate } from '../components/LicensePlate';
import { StickerSelector } from '../components/StickerSelector';
import { giveSticker } from '../lib/stickerService';
import { sounds } from '../lib/sounds';
import { haptics } from '../lib/haptics';
import { trackSpotEvent } from '../lib/spotAnalytics';

const inputStyle: React.CSSProperties = { width: '100%', background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '11px 14px', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#eef4f8', outline: 'none' };
const labelStyle: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#7a8e9e', marginBottom: 6, display: 'block' };
const primaryBtnStyle: React.CSSProperties = { width: '100%', padding: '13px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer' };

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
    <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#7a8e9e' }}>{label}</span>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
          >
            <Star
              style={{ width: 14, height: 14, fill: star <= (hovered || value) ? '#f0a030' : 'none', color: star <= (hovered || value) ? '#f0a030' : '#3a4e60' }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function QuickSpotReviewPage({ onNavigate, wizardData }: QuickSpotReviewPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [driverRating, setDriverRating] = useState(0);
  const [drivingRating, setDrivingRating] = useState(0);
  const [vehicleRating, setVehicleRating] = useState(0);
  const [looksRating, setLooksRating] = useState(0);
  const [soundRating, setSoundRating] = useState(0);
  const [conditionRating, setConditionRating] = useState(0);
  const [sentiment, setSentiment] = useState<'love' | 'neutral' | 'hate' | null>(null);
  const [comment, setComment] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedStickerIds, setSelectedStickerIds] = useState<string[]>([]);
  const [existingSpotId, setExistingSpotId] = useState<string | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
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

  const [isNewPlate, setIsNewPlate] = useState(false);

  const ensureVehicleExists = async (): Promise<string> => {
    if (wizardData.vehicleId) {
      setIsNewPlate(false);
      return wizardData.vehicleId;
    }

    const plateHash = wizardData.plateHash || await hashPlate(wizardData.plateState, wizardData.plateNumber);

    const { data: existing } = await supabase
      .from('vehicles')
      .select('id')
      .eq('plate_hash', plateHash)
      .maybeSingle();

    if (existing) {
      setIsNewPlate(false);
      return existing.id;
    }

    setIsNewPlate(true);

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

    // Weekly spot limit check
    try {
      const { data: spotProfile } = await supabase
        .from('profiles')
        .select('is_pro, weekly_spots_used, weekly_spots_reset_at')
        .eq('id', user.id)
        .maybeSingle();

      if (spotProfile) {
        const resetAt = new Date(spotProfile.weekly_spots_reset_at);
        const now = new Date();
        const daysSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceReset >= 7) {
          await supabase.from('profiles')
            .update({ weekly_spots_used: 0, weekly_spots_reset_at: now.toISOString() })
            .eq('id', user.id);
          spotProfile.weekly_spots_used = 0;
        }

        if (!spotProfile.is_pro && (spotProfile.weekly_spots_used ?? 0) >= 10) {
          setShowUpgradeModal(true);
          return;
        }
      }
    } catch {
      // If limit check fails, allow submission to proceed
    }

    setSubmitting(true);
    try {
      const vehicleId = await ensureVehicleExists();

      // Duplicate spot check
      if (!existingSpotId) {
        const { data: existingSpot } = await supabase
          .from('spot_history')
          .select('id')
          .eq('spotter_id', user.id)
          .eq('vehicle_id', vehicleId)
          .maybeSingle();

        if (existingSpot) {
          setExistingSpotId(existingSpot.id);
          setShowDuplicateWarning(true);
          setSubmitting(false);
          return;
        }
      }

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

      // STEP 1: Record or update the spot in spot_history
      // NOTE: If location (lat/lng) is added to this payload in the future,
      // it MUST go through fuzzCoordinates() from src/lib/locationPrivacy.ts first.
      // Never store raw GPS coordinates.
      let spotData: { id: string };

      if (existingSpotId) {
        // Update existing spot
        const updatePayload: Record<string, unknown> = {
          spot_type: 'quick',
          reputation_earned: 10,
        };
        if (photoUrl) updatePayload.photo_url = photoUrl;

        const { error: updateError } = await supabase
          .from('spot_history')
          .update(updatePayload)
          .eq('id', existingSpotId);

        if (updateError) throw new Error('Failed to update spot: ' + updateError.message);
        spotData = { id: existingSpotId };
      } else {
        const spotPayload: Record<string, unknown> = {
          spotter_id: user.id,
          vehicle_id: vehicleId,
          spot_type: 'quick',
          reputation_earned: 10,
        };
        if (photoUrl) spotPayload.photo_url = photoUrl;

        const { data: newSpotData, error: spotError } = await supabase
          .from('spot_history')
          .insert(spotPayload)
          .select('id')
          .single();

        if (spotError) {
          console.error('Spot insert error:', spotError);
          throw new Error('Failed to record spot: ' + spotError.message);
        }
        spotData = newSpotData;
      }

      try { sounds.revEngine(); haptics.medium(); } catch { /* intentionally empty */ }

      // STEP 2: Record the review in reviews table
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          vehicle_id: vehicleId,
          author_id: user.id,
          rating_driver: driverRating,
          rating_driving: drivingRating,
          rating_vehicle: vehicleRating,
          looks_rating: looksRating || null,
          sound_rating: soundRating || null,
          condition_rating: conditionRating || null,
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

      // STEP 3: Resolve best available image for the feed post
      // Priority: user photo > vehicle profile image > stock image
      let feedImageUrl: string | null = photoUrl;
      if (!feedImageUrl) {
        const { data: vImg } = await supabase
          .from('vehicles')
          .select('profile_image_url, stock_image_url')
          .eq('id', vehicleId)
          .maybeSingle();
        feedImageUrl = vImg?.profile_image_url || vImg?.stock_image_url || null;
      }

      // Only create a feed post if we have a visual anchor — no blank tiles
      if (feedImageUrl) {
        await supabase
          .from('posts')
          .insert({
            author_id: user.id,
            vehicle_id: vehicleId,
            post_type: 'spot',
            spot_type: 'quick',
            caption: comment.trim() || null,
            image_url: feedImageUrl,
            spot_history_id: spotData.id,
            review_id: reviewData.id,
            rating_driver: driverRating,
            rating_driving: drivingRating,
            rating_vehicle: vehicleRating,
            looks_rating: looksRating || null,
            sound_rating: soundRating || null,
            condition_rating: conditionRating || null,
            sentiment,
            moderation_status: 'approved',
            privacy_level: 'public',
          });
      }

      // STEP 4: Award reputation
      await calculateAndAwardReputation({
        userId: user.id,
        action: 'SPOT_QUICK_REVIEW',
        referenceType: 'review',
        referenceId: reviewData.id,
      });

      // New plate bonus (+2 pts)
      if (isNewPlate) {
        await calculateAndAwardReputation({
          userId: user.id,
          action: 'NEW_PLATE_BONUS',
          referenceType: 'vehicle',
          referenceId: vehicleId,
        });
      }

      trackSpotEvent('quick_spot_created', user.id, {
        vehicleId,
        plate: wizardData.plateNumber,
      });

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

      // Increment weekly spot counter
      const { data: counterProfile } = await supabase
        .from('profiles')
        .select('weekly_spots_used')
        .eq('id', user.id)
        .maybeSingle();
      if (counterProfile) {
        await supabase.from('profiles')
          .update({ weekly_spots_used: (counterProfile.weekly_spots_used ?? 0) + 1 })
          .eq('id', user.id);
      }

      // Navigate directly to completed review — no upgrade prompt
      onNavigate('completed-review', {
        vehicleId,
        spotType: 'quick',
        wizardData,
        driverRating,
        drivingRating,
        vehicleRating,
        looksRating: looksRating || undefined,
        soundRating: soundRating || undefined,
        conditionRating: conditionRating || undefined,
        sentiment,
        comment: comment.trim() || undefined,
        selectedTags: selectedStickerIds,
        reputationEarned: existingSpotId ? 0 : 10,
        isFirstSpot: isNewPlate,
      });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to submit spot', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const vehicleName = [wizardData.year, wizardData.make, wizardData.model].filter(Boolean).join(' ');

  const heroImageUrl = photoPreview || wizardData.stockImageUrl || null;

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      {/* Header */}
      <div style={{ padding: '52px 16px 20px', background: '#0a0d14', borderBottom: '1px solid rgba(249,115,22,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button onClick={() => onNavigate('scan')} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(3,5,8,0.7)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={14} color="#eef4f8" strokeWidth={2} />
          </button>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316' }}>Step 3 of 3</span>
        </div>
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', lineHeight: 1, marginBottom: 12 }}>Rate It</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 2, borderRadius: 1, background: '#F97316' }} />
          <div style={{ flex: 1, height: 2, borderRadius: 1, background: '#F97316' }} />
          <div style={{ flex: 1, height: 2, borderRadius: 1, background: '#F97316' }} />
        </div>
      </div>

      {/* Vehicle hero image */}
      <div style={{ position: 'relative', width: '100%', height: 180, overflow: 'hidden', background: '#111720' }}>
        {heroImageUrl ? (
          <>
            <img src={heroImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.85) 0%, transparent 60%)' }} />
            <div style={{ position: 'absolute', bottom: 12, left: 16 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, color: '#F97316' }}>{wizardData.make}</div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>{wizardData.model || 'Vehicle'}</div>
            </div>
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, color: '#F97316', marginBottom: 2 }}>{wizardData.make}</div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>{wizardData.model || 'Vehicle'}</div>
          </div>
        )}
      </div>

      {/* Rating rows */}
      <div>
        <StarRow label="Vehicle" value={vehicleRating} onChange={setVehicleRating} />
        <StarRow label="Driver" value={driverRating} onChange={setDriverRating} />
        <StarRow label="Driving" value={drivingRating} onChange={setDrivingRating} />

        {/* Additional optional ratings */}
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#5a6e7e', padding: '12px 16px 0' }}>
          Additional Ratings · Optional
        </div>
        <StarRow label="Looks" value={looksRating} onChange={setLooksRating} />
        <StarRow label="Sound" value={soundRating} onChange={setSoundRating} />
        <StarRow label="Condition" value={conditionRating} onChange={setConditionRating} />
      </div>

      {/* Sentiment buttons — 3 options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '12px 16px' }}>
        {([
          { value: 'love' as const, label: 'Love It', icon: <Heart style={{ width: 14, height: 14, fill: sentiment === 'love' ? '#F97316' : 'none' }} />, activeColor: '#F97316', activeBg: 'rgba(249,115,22,0.1)', activeBorder: 'rgba(249,115,22,0.4)' },
          { value: 'neutral' as const, label: "It's OK", icon: null, activeColor: '#7a8e9e', activeBg: 'rgba(255,255,255,0.06)', activeBorder: 'rgba(255,255,255,0.2)' },
          { value: 'hate' as const, label: 'Not For Me', icon: <ThumbsDown style={{ width: 14, height: 14, fill: sentiment === 'hate' ? '#ef4444' : 'none' }} />, activeColor: '#ef4444', activeBg: 'rgba(239,68,68,0.08)', activeBorder: 'rgba(239,68,68,0.3)' },
        ]).map(opt => {
          const isActive = sentiment === opt.value;
          return (
            <button key={opt.value} onClick={() => setSentiment(opt.value)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 4px', borderRadius: 8,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, cursor: 'pointer',
              ...(isActive ? { background: opt.activeBg, border: `1px solid ${opt.activeBorder}`, color: opt.activeColor } : { background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: '#5a6e7e' }),
            }}>
              {opt.icon} {opt.label}
            </button>
          );
        })}
      </div>

      {/* Bumper Stickers */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>Bumper Stickers</span>
      </div>
      <div style={{ paddingBottom: 10 }}>
        <StickerSelector
          selectedStickers={selectedStickerIds}
          onToggleSticker={(id) => {
            setSelectedStickerIds(prev =>
              prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
            );
          }}
        />
      </div>

      {/* Caption input */}
      <div style={{ margin: '0 16px 10px' }}>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a caption..."
          rows={2}
          style={{ width: '100%', padding: '10px 12px', background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#eef4f8', outline: 'none', resize: 'none' as const }}
        />
      </div>

      {/* Photo upload */}
      <div style={{ padding: '0 16px 12px' }}>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} style={{ display: 'none' }} />
        {photoPreview ? (
          <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            <img src={photoPreview} alt="Spot photo" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
            <button onClick={clearPhoto} style={{ position: 'absolute', top: 6, right: 6, padding: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: 14, height: 14, color: '#fff' }} />
            </button>
          </div>
        ) : (
          <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5a6e7e', cursor: 'pointer' }}>
            <Camera style={{ width: 14, height: 14 }} /> Add a Photo (optional)
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316', background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 4, padding: '2px 6px', marginLeft: 6 }}>+5 RP</span>
          </button>
        )}
      </div>

      {/* Spacer for fixed submit button */}
      <div style={{ height: 120 }} />

      {/* Duplicate spot warning */}
      {showDuplicateWarning && (
        <div style={{
          position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 61,
          background: '#0d1117', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 10, padding: 14,
        }}>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#eef4f8', margin: '0 0 10px' }}>
            You've already spotted this vehicle.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setShowDuplicateWarning(false); handleSubmitQuick(); }}
              style={{
                flex: 1, padding: '10px', background: '#F97316', border: 'none', borderRadius: 6,
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer',
              }}
            >
              Update My Spot
            </button>
            <button
              onClick={() => { setShowDuplicateWarning(false); onNavigate('scan'); }}
              style={{
                flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5a6e7e', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Fixed submit button — above bottom nav (z-index 50) */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
        padding: '12px 16px 20px',
        background: 'rgba(3,5,8,0.95)', backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <button
          onClick={handleSubmitQuick}
          disabled={!canSubmit || submitting || uploadingPhoto}
          style={{ width: '100%', padding: 13, background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer', opacity: (!canSubmit || submitting || uploadingPhoto) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {(submitting || uploadingPhoto) ? <div style={{ width: 16, height: 16, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : null}
          {uploadingPhoto ? 'Uploading...' : existingSpotId ? 'Update Spot' : 'Submit Spot +10 RP'}
        </button>
      </div>


      {/* Weekly limit upgrade modal */}
      {showUpgradeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,5,8,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#0a0d14', borderRadius: 12, padding: 24, margin: '0 24px', border: '1px solid rgba(249,115,22,0.20)', maxWidth: 360, width: '100%' }}>
            <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', margin: '0 0 8px' }}>Weekly Limit Reached</h3>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7a8e9e', lineHeight: 1.5, margin: '0 0 16px' }}>
              You've used your 10 free spots this week. Upgrade to Pro for unlimited spotting.
            </p>
            <button
              onClick={() => { setShowUpgradeModal(false); onNavigate('premium'); }}
              style={{ width: '100%', padding: 13, background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#030508', cursor: 'pointer', marginBottom: 8 }}
            >
              Upgrade to Pro — $4/mo
            </button>
            <button
              onClick={() => setShowUpgradeModal(false)}
              style={{ width: '100%', padding: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a8e9e', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
