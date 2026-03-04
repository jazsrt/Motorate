import { useState } from 'react';
import { X, Star, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { awardReputationPoints } from '../lib/reputation';

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

          // AUTO-AWARD: Check for tiered spot badges
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

  function StarRow({
    label,
    display,
    value,
    onHover,
    onChange,
    onLeave,
  }: {
    label: string;
    display: number;
    value: number;
    onHover: (v: number) => void;
    onChange: (v: number) => void;
    onLeave: () => void;
  }) {
    return (
      <div>
        <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-3">
          {label}
        </label>
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onChange(star)}
              onMouseEnter={() => onHover(star)}
              onMouseLeave={onLeave}
              className="transition-transform hover:scale-110 active:scale-95"
              type="button"
            >
              <Star
                className={`w-10 h-10 transition-colors ${
                  star <= display
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-neutral-600'
                }`}
              />
            </button>
          ))}
        </div>
        <p className="text-center mt-2 text-base font-bold text-secondary">
          {display === 0 ? 'Select a rating' : ratingLabels[display]}
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-surfacehighlight rounded-xl max-w-md w-full animate-in fade-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-surfacehighlight flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <User className="w-6 h-6 text-orange-400" />
              Rate Driver
            </h2>
            <p className="text-secondary mt-1 text-sm">@{driverHandle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surfacehighlight rounded-lg transition-colors"
            disabled={submitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <StarRow
            label="How would you rate this driver?"
            display={displayDriver}
            value={driverRating}
            onHover={setHoverDriver}
            onChange={setDriverRating}
            onLeave={() => setHoverDriver(0)}
          />

          <StarRow
            label="How would you rate this vehicle?"
            display={displayVehicle}
            value={vehicleRating}
            onHover={setHoverVehicle}
            onChange={setVehicleRating}
            onLeave={() => setHoverVehicle(0)}
          />

          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2">
              Comment <span className="text-secondary/60 text-xs normal-case">(Optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this driver..."
              className="w-full px-4 py-3 bg-surfacehighlight border border-surfacehighlight rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-secondary mt-1">
              {comment.length}/500 characters
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-surfacehighlight flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-surfacehighlight border border-surfacehighlight rounded-xl font-bold uppercase tracking-wider hover:bg-surfacehighlight/80 transition-all active:scale-95"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={driverRating === 0 || submitting}
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Star className="w-5 h-5" />
                <span>Submit Rating</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
