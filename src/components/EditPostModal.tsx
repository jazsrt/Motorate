import { useState } from 'react';
import { X } from 'lucide-react';

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
      alert('Failed to update post. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border-2 border-accent-primary rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-surfacehighlight">
          <h2 className="text-xl font-bold uppercase tracking-wider">Edit Post</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surfacehighlight rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 bg-surfacehighlight border border-surfacehighlight rounded-lg focus:outline-none focus:border-accent-primary transition resize-none"
            />
            <div className="text-xs text-secondary mt-1 text-right">
              {caption.length}/500
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-surfacehighlight">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-lg font-bold uppercase tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-accent-primary hover:bg-accent-hover text-black rounded-lg font-bold uppercase tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
