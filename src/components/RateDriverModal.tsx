import { useState } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { awardReputationPoints } from '../lib/reputation';
import { ModalShell, modalButtonPrimary, modalButtonGhost, modalInput, modalLabel } from './ui/ModalShell';

interface RateDriverModalProps {
  driverId: string;
  driverHandle: string;
  vehicleId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RateDriverModal({
  driverId,
  driverHandle,
  vehicleId,
  onClose,
  onSuccess
}: RateDriverModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [driverRating, setDriverRating] = useState(0);
  const [vehicleRating, setVehicleRating] = useState(0);
  const [hoverDriver, setHoverDriver] = useState(0);
  const [hoverVehicle, setHoverVehicle] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!user || driverRating === 0) {
      showToast('Please select a driver rating', 'error');
      return;
    }

    if (user.id === driverId) {
      showToast('You cannot rate yourself', 'error');
      return;
    }

    try {
      setSubmitting(true);

      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .eq('author_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('reviews')
          .update({
            driver_rating: driverRating,
            ...(vehicleRating > 0 ? { vehicle_rating: vehicleRating } : {}),
            ...(comment.trim() ? { comment: comment.trim() } : {}),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { data: review, error } = await supabase
          .from('reviews')
          .insert({
            vehicle_id: vehicleId,
            author_id: user.id,
            spot_type: 'quick',
            driver_rating: driverRating,
            driving_rating: driverRating,
            vehicle_rating: vehicleRating || driverRating,
            sentiment: driverRating >= 3 ? 'love' : 'hate',
            comment: comment.trim() || null,
          })
          .select('id')
          .single();

        if (error) {
          if (error.code === '23505') {
            showToast('You have already reviewed this vehicle', 'error');
            return;
          }
          throw error;
        }

        if (review) {
          await supabase.from('spot_history').insert({
            spotter_id: user.id,
            vehicle_id: vehicleId,
            review_id: review.id,
            spot_type: 'quick',
            reputation_earned: 10,
          });

          await awardReputationPoints(user.id, 'COMMENT_LEFT', 'review', review.id);

          try {
            await supabase.rpc('check_and_award_badges', {
              p_user_id: user.id,
              p_action: 'spot'
            });
          } catch (autoAwardError) {
            console.error('Auto-award badge error:', autoAwardError);
          }
        }
      }

      showToast('Driver rating submitted! +10 points', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Failed to submit rating', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const displayDriver = hoverDriver || driverRating;
  const displayVehicle = hoverVehicle || vehicleRating;
  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  function StarRow({ label, display, value, onHover, onChange, onLeave }: {
    label: string; display: number; value: number;
    onHover: (v: number) => void; onChange: (v: number) => void; onLeave: () => void;
  }) {
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
          letterSpacing: '0.18em', textTransform: 'uppercase' as const,
          color: '#7a8e9e', marginBottom: 10,
        }}>
          {label}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => onHover(star)}
              onMouseLeave={onLeave}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
            >
              <Star
                style={{
                  width: 32, height: 32,
                  color: star <= display ? '#F97316' : '#445566',
                  fill: star <= display ? '#F97316' : 'transparent',
                  transition: 'color 0.15s, fill 0.15s',
                }}
              />
            </button>
          ))}
        </div>
        <div style={{
          textAlign: 'center' as const, marginTop: 6,
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
          color: display > 0 ? '#eef4f8' : '#445566',
        }}>
          {display === 0 ? 'Select a rating' : ratingLabels[display]}
        </div>
      </div>
    );
  }

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      eyebrow={`@${driverHandle}`}
      title="Rate the Driver"
      footer={
        <>
          <button onClick={onClose} disabled={submitting} style={{ ...modalButtonGhost, opacity: submitting ? 0.5 : 1 }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={driverRating === 0 || submitting}
            style={{ ...modalButtonPrimary, opacity: (driverRating === 0 || submitting) ? 0.5 : 1 }}
          >
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </>
      }
    >
      {/* Info banner */}
      <div style={{
        padding: '10px 12px', borderRadius: 8, marginBottom: 18,
        background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)',
        fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#F97316', lineHeight: 1.45,
      }}>
        Your rating is anonymous and helps the community know what to expect.
      </div>

      <StarRow
        label="How would you rate this driver?"
        display={displayDriver} value={driverRating}
        onHover={setHoverDriver} onChange={setDriverRating} onLeave={() => setHoverDriver(0)}
      />

      <StarRow
        label="How would you rate this vehicle?"
        display={displayVehicle} value={vehicleRating}
        onHover={setHoverVehicle} onChange={setVehicleRating} onLeave={() => setHoverVehicle(0)}
      />

      <div>
        <label style={modalLabel}>Notes <span style={{ fontWeight: 400, textTransform: 'none' as const, letterSpacing: 'normal' }}>(Optional)</span></label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share your experience..."
          rows={3}
          maxLength={500}
          style={{ ...modalInput, resize: 'none' as const, lineHeight: 1.55 }}
        />
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: '#445566', textAlign: 'right' as const, marginTop: 4, fontVariantNumeric: 'tabular-nums',
        }}>
          {comment.length}/500
        </div>
      </div>
    </ModalShell>
  );
}
