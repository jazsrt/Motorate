import { useState } from 'react';
import { ModalShell, modalButtonPrimary, modalButtonGhost, modalInput, modalLabel } from './ui/ModalShell';

interface EditPostModalProps {
  postId: string;
  currentCaption: string | null;
  onClose: () => void;
  onSave: (postId: string, newCaption: string) => Promise<void>;
}

export function EditPostModal({ postId, currentCaption, onClose, onSave }: EditPostModalProps) {
  const [caption, setCaption] = useState(currentCaption || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(postId, caption);
      onClose();
    } catch (error) {
      console.error('Error saving post:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      eyebrow="Owner Post"
      title="Edit Post"
      footer={
        <>
          <button onClick={onClose} disabled={saving} style={{ ...modalButtonGhost, opacity: saving ? 0.5 : 1 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...modalButtonPrimary, opacity: saving ? 0.5 : 1 }}>
            {saving ? 'Saving...' : 'Update Post'}
          </button>
        </>
      }
    >
      <div>
        <label style={modalLabel}>Caption</label>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="What's on your mind?"
          maxLength={500}
          rows={4}
          style={{ ...modalInput, resize: 'none' as const, lineHeight: 1.55 }}
        />
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: '#445566', textAlign: 'right' as const, marginTop: 4,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {caption.length}/500
        </div>
      </div>
    </ModalShell>
  );
}
