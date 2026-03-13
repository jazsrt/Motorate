import { Share2, Check } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

interface Post {
  id: string;
  author_id?: string;
  author: {
    id?: string;
    handle: string;
  };
  caption?: string | null;
}

interface ShareButtonProps {
  url?: string;
  title?: string;
  text?: string;
  post?: Post;
  className?: string;
  showLabel?: boolean;
}

export function ShareButton({ url, title, text, post, className = '', showLabel = false }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();

  // Support both direct props and post object
  const shareUrl = url || (post ? `${window.location.origin}/post/${post.id}` : '');
  const shareTitle = title || (post ? `Check out @${post.author.handle}'s post on MotoRate` : '');
  const shareText = text || (post?.caption ? post.caption : '');

  const sendShareNotification = async () => {
    if (!post || !user) return;
    const authorId = post.author_id || post.author?.id;
    if (!authorId || authorId === user.id) return;
    try {
      const { notifyPostShare } = await import('../lib/notifications');
      await notifyPostShare(post.id, authorId, user.id);
    } catch (e) {
      console.error('Failed to send share notification:', e);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        await sendShareNotification();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
          await fallbackCopy();
        }
      }
    } else {
      await fallbackCopy();
    }
  };

  const fallbackCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('Link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
      await sendShareNotification();
    } catch (err) {
      console.error('Copy failed:', err);
      showToast('Failed to copy link', 'error');
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-1.5 transition-all active:scale-95 ${className}`}
      title="Share this post"
    >
      {copied ? <Check className="w-5 h-5 text-green-500" /> : <Share2 className="w-5 h-5" />}
      {showLabel && <span className="text-sm font-medium">{copied ? 'Copied!' : 'Share'}</span>}
    </button>
  );
}
