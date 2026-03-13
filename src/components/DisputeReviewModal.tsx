import { useState } from 'react';
import { X, Flag, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import {
  fileDispute,
  hasDisputedReview,
  DISPUTE_TYPE_LABELS,
  type DisputeType,
} from '../lib/disputes';
import { useToast } from '../contexts/ToastContext';
import { useEffect } from 'react';

interface DisputeReviewModalProps {
  reviewId: string;
  reviewComment?: string | null;
  onClose: () => void;
}

const DISPUTE_TYPES: DisputeType[] = [
  'false_information',
  'wrong_vehicle',
  'harassment',
  'fake_review',
  'privacy_violation',
  'other',
];

export function DisputeReviewModal({ reviewId, reviewComment, onClose }: DisputeReviewModalProps) {
  const { showToast } = useToast();
  const [selectedType, setSelectedType] = useState<DisputeType | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alreadyDisputed, setAlreadyDisputed] = useState(false);
  const [checkingDispute, setCheckingDispute] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      const disputed = await hasDisputedReview(reviewId);
      setAlreadyDisputed(disputed);
      setCheckingDispute(false);
    })();
  }, [reviewId]);

  async function handleSubmit() {
    if (!selectedType || description.trim().length < 20) return;

    setSubmitting(true);
    try {
      await fileDispute(reviewId, selectedType, description.trim());
      setSubmitted(true);
      showToast('Dispute filed successfully. Our team will review it shortly.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to file dispute', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-surface border border-surfacehighlight rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 fade-in">
        <div className="flex items-center justify-between p-5 border-b border-surfacehighlight">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-heading font-bold uppercase tracking-tight">Dispute Review</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surfacehighlight rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-secondary" />
          </button>
        </div>

        <div className="p-5">
          {checkingDispute ? (
            <div className="flex items-center justify-center py-10">
              <Loader className="w-6 h-6 text-secondary animate-spin" />
            </div>
          ) : submitted ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Dispute Filed</h3>
              <p className="text-secondary text-sm mb-6">
                Our moderation team will review your dispute and take action within 24-48 hours.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-xl font-bold transition-all"
              >
                Close
              </button>
            </div>
          ) : alreadyDisputed ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-orange-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Already Disputed</h3>
              <p className="text-secondary text-sm mb-6">
                You have already filed a dispute for this review. Please wait for it to be resolved.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-xl font-bold transition-all"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {reviewComment && (
                <div className="bg-surfacehighlight rounded-xl p-3 border-l-4 border-orange-500/50">
                  <p className="text-xs text-secondary uppercase tracking-wider font-bold mb-1">Spot Being Disputed</p>
                  <p className="text-sm text-secondary italic">"{reviewComment}"</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
                  Reason for Dispute <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  {DISPUTE_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        selectedType === type
                          ? 'bg-orange-500/20 border-orange-500/60 text-orange-300'
                          : 'bg-surfacehighlight border-transparent text-secondary hover:border-neutral-600'
                      }`}
                    >
                      {DISPUTE_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
                  Description <span className="text-red-400">*</span>
                  <span className="text-neutral-600 ml-1 normal-case">(min 20 characters)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Explain why this review should be disputed..."
                  rows={4}
                  maxLength={1000}
                  className="w-full bg-surfacehighlight border border-surfacehighlight rounded-xl px-4 py-3 text-primary placeholder-neutral-600 focus:outline-none focus:border-orange-500/50 resize-none text-sm"
                />
                <p className={`text-xs mt-1 text-right ${description.length >= 20 ? 'text-green-400' : 'text-secondary'}`}>
                  {description.length}/1000
                </p>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
                <p className="text-xs text-orange-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Filing false disputes may result in account action. Only dispute spots that genuinely violate our community guidelines.</span>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-surfacehighlight hover:bg-surfacehighlight/80 border border-surfacehighlight rounded-xl font-bold uppercase tracking-tight text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedType || description.trim().length < 20 || submitting}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 disabled:from-neutral-700 disabled:to-neutral-700 disabled:text-neutral-500 rounded-xl font-bold uppercase tracking-tight text-sm transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Flag className="w-4 h-4" />
                  )}
                  File Dispute
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
