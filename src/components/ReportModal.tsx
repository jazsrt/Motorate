import { useState } from 'react';
import { createReport, ReportContentType } from '../lib/reports';
import { useAuth } from '../contexts/AuthContext';
import { X, AlertTriangle } from 'lucide-react';

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
  const [reason, setReason] = useState<'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'other' | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !reason) return;

    setSubmitting(true);
    setError('');

    try {
      const mappedContentType: ReportContentType =
        contentType === 'review' ? 'post' : contentType as ReportContentType;

      const reportReason = description.trim()
        ? `${reason}: ${description}`
        : reason;

      const result = await createReport(mappedContentType, contentId, reportReason);

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit report');
      }

      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-surface border border-surfacehighlight rounded-xl max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 bg-status-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-status-success" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Report Submitted</h2>
          <p className="text-secondary">
            Thank you for helping keep our community safe. We'll review your report shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-surfacehighlight rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-status-danger/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-status-danger" />
            </div>
            <h2 className="text-2xl font-bold uppercase tracking-wider">Report {contentType}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surfacehighlight rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-status-danger/20 border border-status-danger rounded-lg text-sm text-status-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2">
              Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              required
              className="w-full bg-surfacehighlight border border-surfacehighlight rounded-lg px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="">Select a reason</option>
              {REPORT_REASONS[contentType].map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2">
              Additional Details
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any additional context..."
              rows={4}
              className="w-full bg-surfacehighlight border border-surfacehighlight rounded-lg px-4 py-2 text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-surfacehighlight hover:bg-surface rounded-lg font-bold uppercase tracking-wider transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || submitting}
              className="flex-1 px-4 py-2 bg-status-danger hover:bg-red-600 rounded-lg font-bold uppercase tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
