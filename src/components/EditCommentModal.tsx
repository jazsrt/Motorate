import { useState } from 'react';
import { ModalShell, modalButtonPrimary, modalButtonGhost, modalInput } from './ui/ModalShell';

interface EditCommentModalProps {
  commentId: string;
  currentText: string;
  onClose: () => void;
  onSave: (commentId: string, newText: string) => Promise<void>;
}

export function EditCommentModal({ commentId, currentText, onClose, onSave }: EditCommentModalProps) {
  const [text, setText] = useState(currentText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!text.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    if (text === currentText) {
      onClose();
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(commentId, text.trim());
      onClose();
    } catch (err) {
      console.error('Error saving comment:', err);
      setError('Failed to save comment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      eyebrow="Your Comment"
      title="Edit Comment"
      footer={
        <>
          <button onClick={onClose} disabled={saving} style={{ ...modalButtonGhost, opacity: saving ? 0.5 : 1 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !text.trim()} style={{ ...modalButtonPrimary, opacity: (saving || !text.trim()) ? 0.5 : 1 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      }
    >
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        style={{ ...modalInput, resize: 'none' as const, lineHeight: 1.55, minHeight: 100 }}
        placeholder="Edit your comment..."
        disabled={saving}
      />
      {error && (
        <div style={{
          marginTop: 10, padding: '10px 12px', borderRadius: 8,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#ef4444',
        }}>
          {error}
        </div>
      )}
    </ModalShell>
  );
}
