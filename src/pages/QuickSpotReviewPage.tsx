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
import { LicensePlate } from '../components/LicensePlate';
import { StickerSelector } from '../components/StickerSelector';
import { giveSticker } from '../lib/stickerService';
import { sounds } from '../lib/sounds';
import { haptics } from '../lib/haptics';

const inputStyle: React.CSSProperties = { width: '100%', background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '11px 14px', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#eef4f8', outline: 'none' };
const labelStyle: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#7a8e9e', marginBottom: 6, display: 'block' };
const primaryBtnStyle: React.CSSProperties = { width: '100%', padding: '13px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#000', cursor: 'pointer' };

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
  const [rewardData, setRewardData] = useState<{ rp: number; vehicleName: string; spotCount: number } | null>(null);
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
      // NOTE: If location (lat/lng) is added to this payload in the future,
      // it MUST go through fuzzCoordinates() from src/lib/locationPrivacy.ts first.
      // Never store raw GPS coordinates.
      const spotPayload: Record<string, unknown> = {
        spotter_id: user.id,
        vehicle_id: vehicleId,
        spot_type: 'quick',
        reputation_earned: 10,
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

      // Fetch vehicle spot count for reward display
      const { data: vehicleStats } = await supabase
        .from('vehicles')
        .select('spots_count')
        .eq('id', vehicleId)
        .maybeSingle();

      const vName = [wizardData.make, wizardData.model].filter(Boolean).join(' ');
      setRewardData({
        rp: 10,
        vehicleName: vName || 'Vehicle',
        spotCount: vehicleStats?.spots_count ?? 1,
      });

      // Show upgrade prompt instead of navigating away
      setShowUpgradePrompt(true);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to submit spot', 'error');
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

  const loveActive = sentiment === 'love';
  const hateActive = sentiment === 'hate';

  // Inline reward block — shown after successful submission, replacing the form
  if (showUpgradePrompt && rewardData) {
    const milestones = [1, 5, 10, 20, 50];
    const nextMilestone = milestones.find(m => m > rewardData.spotCount) ?? null;
    const spotsToNext = nextMilestone ? nextMilestone - rewardData.spotCount : null;

    return (
      <Layout currentPage="scan" onNavigate={onNavigate}>
        <div style={{ maxWidth: 512, margin: '0 auto', padding: '32px 16px' }}>
          {/* RP Earned */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 42, fontWeight: 700, color: '#F97316', lineHeight: 1 }}>+{rewardData.rp}</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#F97316', marginLeft: 6 }}>RP</span>
          </div>

          {/* Vehicle Impact */}
          <div style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
            <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8', margin: '0 0 4px' }}>
              {rewardData.vehicleName}
            </p>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7a8e9e', margin: 0 }}>
              {rewardData.spotCount === 1 ? 'First spot recorded' : `${rewardData.spotCount} spots total`}
            </p>
          </div>

          {/* Milestone Progress */}
          {spotsToNext !== null && nextMilestone !== null && (
            <div style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>Next milestone</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: '#eef4f8' }}>{nextMilestone}</span>
              </div>
              <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ width: `${Math.min(100, (rewardData.spotCount / nextMilestone) * 100)}%`, height: '100%', background: '#F97316', borderRadius: 2 }} />
              </div>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', margin: '6px 0 0', textAlign: 'right' }}>
                {spotsToNext} more {spotsToNext === 1 ? 'spot' : 'spots'} to go
              </p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => onNavigate('feed')}
              style={{ padding: '12px', background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#7a8e9e', cursor: 'pointer' }}
            >
              Done
            </button>
            <button
              onClick={() => {
                onNavigate('detailed-review', {
                  wizardData: { ...wizardData, vehicleId },
                  driverRating,
                  drivingRating,
                  vehicleRating,
                  sentiment,
                  comment,
                  selectedStickerIds,
                  upgradeFromQuickSpot: true,
                  existingReviewId: reviewId,
                });
              }}
              style={{ ...primaryBtnStyle, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Zap style={{ width: 14, height: 14 }} />
              Full Spot +5 RP
            </button>
          </div>
        </div>
      </Layout>
    );
  }

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
      </div>

      {/* Sentiment buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 16px' }}>
        <button onClick={() => setSentiment('love')} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 8,
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, cursor: 'pointer',
          ...(loveActive ? { background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.4)', color: '#F97316' } : { background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: '#5a6e7e' }),
        }}>
          <Heart style={{ width: 16, height: 16, fill: loveActive ? '#F97316' : 'none' }} /> Love It
        </button>
        <button onClick={() => setSentiment('hate')} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 8,
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, cursor: 'pointer',
          ...(hateActive ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' } : { background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: '#5a6e7e' }),
        }}>
          <ThumbsDown style={{ width: 16, height: 16, fill: hateActive ? '#ef4444' : 'none' }} /> Hate It
        </button>
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
          </button>
        )}
      </div>

      {/* Submit button */}
      <div style={{ margin: '0 16px 16px' }}>
        <button
          onClick={handleSubmitQuick}
          disabled={!canSubmit || submitting || uploadingPhoto}
          style={{ width: '100%', padding: 13, background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer', opacity: (!canSubmit || submitting || uploadingPhoto) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {(submitting || uploadingPhoto) ? <div style={{ width: 16, height: 16, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : null}
          {uploadingPhoto ? 'Uploading...' : 'Submit Spot +10 RP'}
        </button>
      </div>

      {/* Full spot upgrade link */}
      <div style={{ margin: '0 16px 24px', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)', borderRadius: 8, padding: '10px 14px' }}>
        <button
          onClick={handleGoDetailed}
          disabled={!canSubmit}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '8px', background: 'none', border: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: !canSubmit ? '#5a6e7e' : '#F97316', cursor: !canSubmit ? 'not-allowed' : 'pointer', opacity: !canSubmit ? 0.5 : 1 }}
        >
          <Zap style={{ width: 14, height: 14 }} />
          Full Spot — +15 RP
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </Layout>
  );
}
