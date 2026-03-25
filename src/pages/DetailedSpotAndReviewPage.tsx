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

const inputStyle: React.CSSProperties = { width: '100%', background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '11px 14px', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#eef4f8', outline: 'none' };
const primaryBtnStyle: React.CSSProperties = { width: '100%', padding: '13px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#000', cursor: 'pointer' };

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a8e9e', width: 80 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.1s' }}
          >
            <Star
              style={{
                width: 28,
                height: 28,
                fill: star <= (hovered || value) ? '#F97316' : 'rgba(255,255,255,0.06)',
                color: star <= (hovered || value) ? '#F97316' : 'rgba(255,255,255,0.06)',
                transition: 'color 0.15s, fill 0.15s',
              }}
            />
          </button>
        ))}
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', width: 32, textAlign: 'right', color: value ? '#eef4f8' : '#525252' }}>
        {value ? `${value}.0` : '—'}
      </span>
    </div>
  );
}

function ReadOnlyStarRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a8e9e', width: 80 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            style={{
              width: 16,
              height: 16,
              fill: star <= value ? '#F97316' : 'rgba(255,255,255,0.06)',
              color: star <= value ? '#F97316' : 'rgba(255,255,255,0.06)',
            }}
          />
        ))}
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', width: 32, textAlign: 'right', color: '#eef4f8' }}>{value}.0</span>
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
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState<{ rp: number; vehicleName: string; spotCount: number; vehicleId: string } | null>(null);

  const canSubmit = looksRating > 0 && soundRating > 0 && conditionRating > 0;

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
        // UPGRADE CASE: Only UPDATE the existing review (spot already recorded)
        const { error: updateError } = await supabase
          .from('reviews')
          .update({
            spot_type: 'full',
            looks_rating: looksRating,
            sound_rating: soundRating,
            condition_rating: conditionRating,
            comment: comment.trim() || null,
          })
          .eq('id', existingReviewId);

        if (updateError) throw updateError;
        reviewId = existingReviewId;

        // Also update the feed post
        await supabase
          .from('posts')
          .update({
            spot_type: 'full',
            looks_rating: looksRating,
            sound_rating: soundRating,
            condition_rating: conditionRating,
            caption: comment.trim() || null,
          })
          .eq('review_id', existingReviewId);
      } else {
        // NEW FULL SPOT CASE: Insert into all three tables

        // STEP 1: Record the spot in spot_history
        const { data: spotData, error: spotError } = await supabase
          .from('spot_history')
          .insert({
            spotter_id: user.id,
            vehicle_id: vehicleId,
            spot_type: 'full',
            reputation_earned: 15,
          })
          .select('id')
          .single();

        if (spotError) {
          console.error('Spot insert error:', spotError);
          throw new Error('Failed to record spot: ' + spotError.message);
        }
        spotHistoryId = spotData.id;

        // STEP 2: Record the review in reviews table
        const { data: reviewData, error: reviewError } = await supabase
          .from('reviews')
          .insert({
            vehicle_id: vehicleId,
            author_id: user.id,
            rating_driver: driverRating,
            rating_driving: drivingRating,
            rating_vehicle: vehicleRating,
            looks_rating: looksRating,
            sound_rating: soundRating,
            condition_rating: conditionRating,
            sentiment,
            comment: comment.trim() || null,
            spot_type: 'full',
            spot_history_id: spotHistoryId,
          })
          .select('id')
          .single();

        if (reviewError) {
          console.error('Review insert error:', reviewError);
          throw new Error('Failed to record review: ' + reviewError.message);
        }
        reviewId = reviewData.id;

        // STEP 3: Resolve best available image for the feed post
        let feedImageUrl: string | null = null;
        {
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
              spot_type: 'full',
              caption: comment.trim() || null,
              image_url: feedImageUrl,
              spot_history_id: spotHistoryId,
              review_id: reviewId,
              rating_driver: driverRating,
              rating_driving: drivingRating,
              rating_vehicle: vehicleRating,
              looks_rating: looksRating,
              sound_rating: soundRating,
              condition_rating: conditionRating,
              sentiment,
              moderation_status: 'approved',
              privacy_level: 'public',
            });
        }
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
        await supabase
          .from('spot_history')
          .update({
            spot_type: 'full',
            reputation_earned: 15,
          })
          .eq('review_id', reviewId);

        await calculateAndAwardReputation({
          userId: user.id,
          action: 'SPOT_UPGRADE_TO_FULL',
          referenceType: 'review',
          referenceId: reviewId,
        });
      } else {
        await calculateAndAwardReputation({
          userId: user.id,
          action: 'SPOT_FULL_REVIEW',
          referenceType: 'review',
          referenceId: reviewId,
        });
      }

      // New plate bonus (+2 pts)
      if (isNewPlate) {
        await calculateAndAwardReputation({
          userId: user.id,
          action: 'NEW_PLATE_BONUS',
          referenceType: 'vehicle',
          referenceId: vehicleId,
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

      // Fetch vehicle spot count for reward display
      const { data: vehicleStats } = await supabase
        .from('vehicles')
        .select('spots_count')
        .eq('id', vehicleId)
        .maybeSingle();

      const rpEarned = upgradeFromQuickSpot ? 5 : 15;
      const vName = [wizardData.make, wizardData.model].filter(Boolean).join(' ');
      setRewardData({
        rp: rpEarned,
        vehicleName: vName || 'Vehicle',
        spotCount: vehicleStats?.spots_count ?? 1,
        vehicleId,
      });
      setShowReward(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const vehicleName = [wizardData.year, wizardData.make, wizardData.model].filter(Boolean).join(' ');

  // Inline reward block — shown after successful submission, replacing the form
  if (showReward && rewardData) {
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

          {/* Action */}
          <button
            onClick={() => onNavigate('vehicle-detail', rewardData.vehicleId)}
            style={{ width: '100%', padding: '12px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#000', cursor: 'pointer' }}
          >
            View Vehicle
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '24px 16px 100px 16px' }}>
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => onNavigate('quick-spot-review', { wizardData, driverRating, drivingRating, vehicleRating, sentiment, comment })}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#7a8e9e', cursor: 'pointer', marginBottom: 20, padding: 0 }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 14, fontFamily: "'Barlow', sans-serif", fontWeight: 500 }}>Back</span>
          </button>

          <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8', margin: '0 0 4px 0' }}>
            {upgradeFromQuickSpot ? 'FULL SPOT UPGRADE' : 'Full Spot'}
          </h1>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#7a8e9e', margin: 0 }}>
            {upgradeFromQuickSpot
              ? 'Add detailed ratings for +5 bonus RP'
              : (vehicleName || 'Complete the review for +15 RP')
            }
          </p>
        </div>

        {/* Carried Over Section */}
        <div style={{ background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#7a8e9e', margin: '0 0 12px 0' }}>Carried Over</p>
          <ReadOnlyStarRow label="Driver" value={driverRating} />
          <ReadOnlyStarRow label="Driving" value={drivingRating} />
          <ReadOnlyStarRow label="Vehicle" value={vehicleRating} />
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              background: sentiment === 'love' ? 'rgba(244,63,94,0.2)' : 'rgba(64,64,64,0.5)',
              color: sentiment === 'love' ? '#fb7185' : '#d4d4d4',
            }}>
              {sentiment === 'love'
                ? <><Heart style={{ width: 16, height: 16, fill: 'currentColor' }} /> Love It</>
                : <><ThumbsDown style={{ width: 16, height: 16 }} /> Hate It</>
              }
            </div>
          </div>
        </div>

        {/* Additional Ratings Section */}
        <div style={{ background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#7a8e9e', margin: '0 0 4px 0' }}>Additional Ratings</p>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7a8e9e', margin: '0 0 12px 0' }}>Required for full spot</p>
          <StarRow label="Looks" value={looksRating} onChange={setLooksRating} />
          <StarRow label="Sound" value={soundRating} onChange={setSoundRating} />
          <StarRow label="Condition" value={conditionRating} onChange={setConditionRating} />
        </div>

        {/* Sticker Selector */}
        <div style={{ marginTop: 20, marginBottom: 16 }}>
          <StickerSelector
            selectedStickers={selectedStickerIds}
            onToggleSticker={(id) => {
              setSelectedStickerIds(prev =>
                prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
              );
            }}
          />
        </div>

        {/* Comment */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#7a8e9e', marginBottom: 8 }}>
            Comment <span style={{ color: '#525252', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={upgradeFromQuickSpot ? "Anything else to add about this ride?" : "Share your experience with this vehicle..."}
            rows={4}
            style={{ ...inputStyle, resize: 'none', height: 'auto' }}
          />
        </div>
      </div>

      {/* Fixed bottom submit button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'linear-gradient(to top, #070a0f 80%, transparent)', zIndex: 40 }}>
        <div style={{ maxWidth: 512, margin: '0 auto' }}>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            style={{
              ...primaryBtnStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: (!canSubmit || submitting) ? 0.4 : 1,
              cursor: (!canSubmit || submitting) ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? (
              <div style={{ width: 16, height: 16, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : null}
            Submit Full Spot +15 RP
          </button>
        </div>
      </div>
    </Layout>
  );
}
