import { useState } from 'react';
import { createReport, ReportContentType } from '../lib/reports';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle } from 'lucide-react';
import { ModalShell, modalButtonGhost, modalButtonDanger, modalInput, modalLabel } from './ui/ModalShell';

interface ReportModalProps {
  contentType: 'post' | 'review' | 'comment' | 'profile';
  contentId: string;
  onClose: () => void;
}

const REPORT_REASONS: Record<string, { value: string; label: string }[]> = {
  post: [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'misinformation', label: 'False or misleading' },
    { value: 'other', label: 'Other' }
  ],
  review: [
    { value: 'misinformation', label: 'False or misleading' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'other', label: 'Other' }
  ],
  comment: [
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'other', label: 'Other' }
  ],
  profile: [
    { value: 'harassment', label: 'Harassment' },
    { value: 'spam', label: 'Spam account' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'other', label: 'Other' }
  ]
};

export function ReportModal({ contentType, contentId, onClose }: ReportModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!user || !reason) return;
    setSubmitting(true);
    setError('');
    try {
      const mappedContentType: ReportContentType =
        contentType === 'review' ? 'post' : contentType as ReportContentType;
      const reportReason = description.trim() ? `${reason}: ${description}` : reason;
      const result = await createReport(mappedContentType, contentId, reportReason);
      if (!result.success) throw new Error(result.error || 'Failed to submit report');
      setSubmitted(true);
      setTimeout(() => onClose(), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <ModalShell isOpen={true} onClose={onClose} title="Report Submitted"
        footer={<button onClick={onClose} style={{ ...modalButtonGhost, width: '100%' }}>Close</button>}
      >
        <div style={{ textAlign: 'center' as const, padding: '24px 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            background: 'rgba(32,192,96,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle style={{ width: 28, height: 28, color: '#20c060' }} />
          </div>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#a8bcc8', lineHeight: 1.5 }}>
            Thank you for helping keep our community safe. We'll review your report shortly.
          </p>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell isOpen={true} onClose={onClose} eyebrow={contentType} title={`Report ${contentType}`}
      footer={
        <>
          <button onClick={onClose} style={modalButtonGhost}>Cancel</button>
          <button onClick={handleSubmit} disabled={!reason || submitting}
            style={{ ...modalButtonDanger, opacity: (!reason || submitting) ? 0.5 : 1 }}>
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </>
      }
    >
      {error && (
        <div style={{
          marginBottom: 14, padding: '10px 12px', borderRadius: 8,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#ef4444',
        }}>
          {error}
        </div>
      )}

      {/* Reason grid */}
      <div style={{ marginBottom: 16 }}>
        <label style={modalLabel}>Reason <span style={{ color: '#ef4444' }}>*</span></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {REPORT_REASONS[contentType].map(r => (
            <button key={r.value} onClick={() => setReason(r.value)} style={{
              padding: '10px 12px', borderRadius: 8, textAlign: 'left' as const,
              background: reason === r.value ? 'rgba(239,68,68,0.12)' : '#131920',
              border: reason === r.value ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.06)',
              fontFamily: "'Barlow', sans-serif", fontSize: 12, fontWeight: 600,
              color: reason === r.value ? '#ef4444' : '#a8bcc8',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Details */}
      <div>
        <label style={modalLabel}>Additional Details</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Provide any additional context..." rows={4}
          style={{ ...modalInput, resize: 'none' as const, lineHeight: 1.55 }} />
      </div>
    </ModalShell>
  );
}
