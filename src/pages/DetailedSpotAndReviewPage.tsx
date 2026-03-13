import { useState } from 'react';
import { ArrowLeft, Star, Heart, ThumbsDown } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { hashPlate } from '../lib/hash';
import { calculateAndAwardReputation } from '../lib/reputation';
import { type OnNavigate } from '../types/navigation';
import type { SpotWizardData } from '../types/spot';
import { StickerSelector } from '../components/StickerSelector';
import { giveSticker } from '../lib/stickerService';

interface DetailedSpotAndReviewPageProps {
  onNavigate: OnNavigate;
  wizardData: SpotWizardData;
  driverRating: number;
  drivingRating: number;
  vehicleRating: number;
  sentiment: 'love' | 'hate';
  comment?: string;
  upgradeFromQuickSpot?: boolean;
  existingReviewId?: string;
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
    <div
      className="flex items-center justify-between py-3 last:border-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <span
        style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontWeight: 700,
          textTransform: 'uppercase',
          fontSize: '13px',
          color: 'var(--light,#a8bcc8)',
          width: '7rem',
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
            className="p-0.5 transition-transform active:scale-90"
          >
            <Star
              className="w-7 h-7 transition-colors"
              style={{
                fill: star <= (hovered || value) ? 'var(--accent,#F97316)' : 'rgba(255,255,255,0.15)',
                color: star <= (hovered || value) ? 'var(--accent,#F97316)' : 'rgba(255,255,255,0.15)',
              }}
            />
          </button>
        ))}
      </div>
      <span
        style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: '14px',
          fontVariantNumeric: 'tabular-nums',
          color: value ? 'var(--white,#eef4f8)' : 'var(--dim,#6a7486)',
          width: '2rem',
          textAlign: 'right',
        }}
      >
        {value ? `${value}.0` : '—'}
      </span>
    </div>
  );
}

function ReadOnlyStarRow({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="flex items-center justify-between py-2 last:border-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <span
        style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontWeight: 700,
          textTransform: 'uppercase',
          fontSize: '12px',
          color: 'var(--light,#a8bcc8)',
          width: '5rem',
        }}
      >
        {label}
      </span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className="w-4 h-4"
            style={{
              fill: star <= value ? 'var(--accent,#F97316)' : 'rgba(255,255,255,0.15)',
              color: star <= value ? 'var(--accent,#F97316)' : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: '14px',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--white,#eef4f8)',
          width: '2rem',
          textAlign: 'right',
        }}
      >
        {value}.0
      </span>
    </div>
  );
}

export function DetailedSpotAndReviewPage({
  onNavigate,
  wizardData,
  driverRating,
  drivingRating,
  vehicleRating,
  sentiment,
  comment: initialComment = '',
  upgradeFromQuickSpot = false,
  existingReviewId,
}: DetailedSpotAndReviewPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [looksRating, setLooksRating] = useState(0);
  const [soundRating, setSoundRating] = useState(0);
  const [conditionRating, setConditionRating] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [selectedStickerIds, setSelectedStickerIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = looksRating > 0 && soundRating > 0 && conditionRating > 0;

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
        is_claimed: false,
        verification_tier: 'shadow',
        created_by_user_id: user?.id,
      })
      .select('id')
      .single();

    if (error) throw new Error('Failed to create vehicle: ' + error.message);
    return newVehicle.id;
  };

  const handleSubmit = async () => {
    if (!user || !canSubmit || submitting) return;

    setSubmitting(true);
    try {
      const vehicleId = await ensureVehicleExists();

      let reviewId: string;
      let spotHistoryId: string | null = null;

      if (upgradeFromQuickSpot && existingReviewId) {
        // UPGRADE CASE: Update the existing post record (spot already recorded)
        const { error: updateError } = await supabase
          .from('posts')
          .update({
            spot_type: 'full',
            post_type: 'review',
            looks_rating: looksRating,
            sound_rating: soundRating,
            condition_rating: conditionRating,
            caption: comment.trim() || null,
          })
          .eq('id', existingReviewId);

        if (updateError) throw updateError;
        reviewId = existingReviewId;
      } else {
        // NEW FULL SPOT CASE: Insert into spot_history + posts

        // STEP 1: Record the spot in spot_history
        const { data: spotData, error: spotError } = await supabase
          .from('spot_history')
          .insert({
            spotter_id: user.id,
            vehicle_id: vehicleId,
            spot_type: 'full',
            reputation_earned: 35,
          })
          .select('id')
          .single();

        if (spotError) {
          console.error('Spot insert error:', spotError);
          throw new Error('Failed to record spot: ' + spotError.message);
        }
        spotHistoryId = spotData.id;

        // STEP 2: Create the post (serves as the review record + feed entry)
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .insert({
            author_id: user.id,
            vehicle_id: vehicleId,
            post_type: 'review',
            spot_type: 'full',
            caption: comment.trim() || `Full spot on this ride!`,
            image_url: null,
            spot_history_id: spotHistoryId,
            rating_driver: driverRating,
            rating_driving: drivingRating,
            rating_vehicle: vehicleRating,
            looks_rating: looksRating,
            sound_rating: soundRating,
            condition_rating: conditionRating,
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
        reviewId = postData.id;
      }

      // Save bumper stickers via stickerService → vehicle_stickers table
      if (selectedStickerIds.length > 0 && user) {
        const finalVehicleId = vehicleId || wizardData.vehicleId;
        if (finalVehicleId) {
          for (const stickerId of selectedStickerIds) {
            await giveSticker(finalVehicleId, stickerId, user.id);
          }
        }
      }

      // Award reputation and check badges
      if (upgradeFromQuickSpot) {
        // Update spot_history to reflect upgrade
        const { data: origPost } = await supabase
          .from('posts')
          .select('spot_history_id')
          .eq('id', reviewId)
          .maybeSingle();

        if (origPost?.spot_history_id) {
          await supabase
            .from('spot_history')
            .update({
              spot_type: 'full',
              reputation_earned: 35,
            })
            .eq('id', origPost.spot_history_id);
        }

        await calculateAndAwardReputation({
          userId: user.id,
          action: 'SPOT_UPGRADE_TO_FULL',
          referenceType: 'review',
          referenceId: reviewId,
        });
      } else {
        // Reputation already calculated for new full spot
        await calculateAndAwardReputation({
          userId: user.id,
          action: 'SPOT_FULL_REVIEW',
          referenceType: 'review',
          referenceId: reviewId,
        });
      }

      // Check for badge awards (counts from spot_history and reviews)
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

      showToast(`Full Spot submitted! +${upgradeFromQuickSpot ? 20 : 35} RP earned`, 'success');
      onNavigate('vehicle-detail', vehicleId);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const vehicleName = [wizardData.year, wizardData.make, wizardData.model].filter(Boolean).join(' ');

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      <div className="max-w-lg mx-auto px-4 py-6" style={{ background: 'var(--black,#030508)' }}>
        <div className="mb-6">
          <button
            onClick={() => onNavigate('quick-spot-review', { wizardData, driverRating, drivingRating, vehicleRating, sentiment, comment })}
            className="flex items-center gap-2 transition-colors mb-5"
            style={{ color: 'var(--light,#a8bcc8)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm" style={{ fontFamily: "'Barlow',sans-serif" }}>Back</span>
          </button>

          <h1
            style={{
              fontFamily: "'Rajdhani',sans-serif",
              fontWeight: 700,
              fontSize: '26px',
              color: 'var(--white,#eef4f8)',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            {upgradeFromQuickSpot ? 'FULL SPOT UPGRADE' : 'Full Spot'}
          </h1>
          <p style={{ color: 'var(--light,#a8bcc8)', fontSize: '14px', fontFamily: "'Barlow',sans-serif" }}>
            {upgradeFromQuickSpot
              ? 'Add detailed ratings for +20 bonus RP'
              : (vehicleName || 'Complete the review for +35 pts')
            }
          </p>
        </div>

        <div
          className="p-4 mb-4"
          style={{
            background: 'var(--carbon-1,#0a0d14)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '14px',
          }}
        >
          <p
            style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontWeight: 700,
              fontSize: '10px',
              textTransform: 'uppercase',
              color: 'var(--dim,#6a7486)',
              marginBottom: '12px',
              letterSpacing: '0.08em',
            }}
          >
            Carried Over
          </p>
          <ReadOnlyStarRow label="Driver" value={driverRating} />
          <ReadOnlyStarRow label="Driving" value={drivingRating} />
          <ReadOnlyStarRow label="Vehicle" value={vehicleRating} />
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
              style={
                sentiment === 'love'
                  ? {
                      background: 'rgba(249,115,22,0.15)',
                      border: '1px solid var(--accent,#F97316)',
                      color: 'var(--accent,#F97316)',
                      fontFamily: "'Barlow Condensed',sans-serif",
                      fontWeight: 700,
                    }
                  : {
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      fontFamily: "'Barlow Condensed',sans-serif",
                      fontWeight: 700,
                    }
              }
            >
              {sentiment === 'love'
                ? <><Heart className="w-4 h-4 fill-current" /> Love It</>
                : <><ThumbsDown className="w-4 h-4" /> Hate It</>
              }
            </div>
          </div>
        </div>

        <div
          className="p-5 mb-4"
          style={{
            background: 'var(--carbon-1,#0a0d14)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '14px',
          }}
        >
          <p
            style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontWeight: 700,
              fontSize: '10px',
              textTransform: 'uppercase',
              color: 'var(--dim,#6a7486)',
              marginBottom: '2px',
              letterSpacing: '0.08em',
            }}
          >
            Additional Ratings
          </p>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--dim,#6a7486)',
              fontFamily: "'Barlow',sans-serif",
              marginBottom: '12px',
            }}
          >
            Required for full spot
          </p>
          <StarRow label="Looks" value={looksRating} onChange={setLooksRating} />
          <StarRow label="Sound" value={soundRating} onChange={setSoundRating} />
          <StarRow label="Condition" value={conditionRating} onChange={setConditionRating} />
        </div>

        <div className="mb-4">
          <StickerSelector
            selectedStickers={selectedStickerIds}
            onToggleSticker={(id) => {
              setSelectedStickerIds(prev =>
                prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
              );
            }}
          />
        </div>

        <div className="mb-6">
          <label
            className="block mb-2"
            style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontWeight: 700,
              fontSize: '10px',
              textTransform: 'uppercase',
              color: 'var(--dim,#6a7486)',
              letterSpacing: '0.08em',
            }}
          >
            Comment{' '}
            <span
              style={{
                color: 'var(--dim,#6a7486)',
                fontFamily: "'Barlow',sans-serif",
                fontWeight: 400,
                textTransform: 'none',
              }}
            >
              (optional)
            </span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={upgradeFromQuickSpot ? "Anything else to add about this ride?" : "Share your experience with this vehicle..."}
            rows={4}
            className="w-full focus:outline-none transition-colors resize-none text-sm"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'var(--white,#eef4f8)',
              padding: '12px 16px',
              fontFamily: "'Barlow',sans-serif",
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl transition-all active:scale-95 disabled:cursor-not-allowed"
          style={
            canSubmit && !submitting
              ? {
                  background: 'var(--accent,#F97316)',
                  color: '#030508',
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontWeight: 700,
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }
              : {
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--dim,#6a7486)',
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontWeight: 700,
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }
          }
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : null}
          {upgradeFromQuickSpot ? 'Submit Upgrade (+20 pts)' : 'Submit Full Spot (+35 pts)'}
        </button>
      </div>
    </Layout>
  );
}
