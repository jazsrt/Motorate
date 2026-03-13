import { useState } from 'react';
import { X } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-surfacehighlight rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-surfacehighlight">
          <h3 className="text-xl font-bold">Edit Comment</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surfacehighlight rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-surfacehighlight border border-surfacehighlight rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
            rows={4}
            placeholder="Edit your comment..."
            disabled={saving}
          />

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="flex-shrink-0 flex gap-2 justify-end p-6 border-t border-surfacehighlight">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-xl font-bold uppercase tracking-wider text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="px-4 py-2 bg-accent-primary hover:bg-accent-hover rounded-xl font-bold uppercase tracking-wider text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
