import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import {
  fileDispute,
  hasDisputedReview,
  DISPUTE_TYPE_LABELS,
  type DisputeType,
} from '../lib/disputes';
import { useToast } from '../contexts/ToastContext';
import { ModalShell, modalButtonGhost, modalButtonDanger, modalInput, modalLabel } from './ui/ModalShell';

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
    <ModalShell
      isOpen={true}
      onClose={onClose}
      eyebrow="Review Dispute"
      title={submitted ? 'Dispute Filed' : alreadyDisputed ? 'Already Disputed' : 'Dispute Review'}
      footer={!submitted && !alreadyDisputed && !checkingDispute ? (
        <>
          <button onClick={onClose} style={modalButtonGhost}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!selectedType || description.trim().length < 20 || submitting}
            style={{ ...modalButtonDanger, opacity: (!selectedType || description.trim().length < 20 || submitting) ? 0.5 : 1 }}
          >
            {submitting ? 'Filing...' : 'Submit Dispute'}
          </button>
        </>
      ) : (
        <button onClick={onClose} style={{ ...modalButtonGhost, width: '100%' }}>Close</button>
      )}
    >
      {checkingDispute ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#F97316',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : submitted ? (
        <div style={{ textAlign: 'center' as const, padding: '24px 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            background: 'rgba(32,192,96,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle style={{ width: 28, height: 28, color: '#20c060' }} />
          </div>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7a8e9e', lineHeight: 1.5 }}>
            Our moderation team will review your dispute and take action within 24-48 hours.
          </p>
        </div>
      ) : alreadyDisputed ? (
        <div style={{ textAlign: 'center' as const, padding: '24px 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            background: 'rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle style={{ width: 28, height: 28, color: '#F97316' }} />
          </div>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7a8e9e', lineHeight: 1.5 }}>
            You have already filed a dispute for this review. Please wait for it to be resolved.
          </p>
        </div>
      ) : (
        <>
          {/* Review quote */}
          {reviewComment && (
            <div style={{
              padding: '10px 12px', borderRadius: 8, marginBottom: 16,
              background: '#131920', borderLeft: '3px solid rgba(249,115,22,0.5)',
              fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7a8e9e',
              fontStyle: 'italic' as const, lineHeight: 1.5,
            }}>
              "{reviewComment}"
            </div>
          )}

          {/* Reason selection */}
          <div style={{ marginBottom: 16 }}>
            <label style={modalLabel}>
              Reason <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {DISPUTE_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  style={{
                    padding: '10px 12px', borderRadius: 8, textAlign: 'left' as const,
                    background: selectedType === type ? 'rgba(249,115,22,0.12)' : '#131920',
                    border: selectedType === type ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    fontFamily: "'Barlow', sans-serif", fontSize: 11, fontWeight: 600,
                    color: selectedType === type ? '#F97316' : '#a8bcc8',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {DISPUTE_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={modalLabel}>
              Details <span style={{ color: '#ef4444' }}>*</span>
              <span style={{ fontWeight: 400, textTransform: 'none' as const, letterSpacing: 'normal', marginLeft: 4 }}>(min 20 characters)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Explain why this review should be disputed..."
              rows={4}
              maxLength={1000}
              style={{ ...modalInput, resize: 'none' as const, lineHeight: 1.55 }}
            />
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: description.length >= 20 ? '#20c060' : '#445566',
              textAlign: 'right' as const, marginTop: 4, fontVariantNumeric: 'tabular-nums',
            }}>
              {description.length}/1000
            </div>
          </div>

          {/* Warning */}
          <div style={{
            padding: '10px 12px', borderRadius: 8,
            background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <AlertTriangle style={{ width: 14, height: 14, color: '#F97316', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#F97316', lineHeight: 1.45 }}>
              Filing false disputes may result in account action.
            </span>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ModalShell>
  );
}
