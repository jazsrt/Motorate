import { Share2, Check } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useRewardEvents } from '../contexts/RewardEventContext';
import { shareToSocial, type ShareCardData } from './ShareCardGenerator';

interface Post {
  id: string;
  author_id?: string;
  author: {
    id?: string;
    handle: string;
  };
  caption?: string | null;
  vehicles?: {
    year?: number | null;
    make?: string | null;
    model?: string | null;
  } | null;
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
  const { celebrateReward } = useRewardEvents();

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
    if (post) {
      const vehicleName = post.vehicles
        ? [post.vehicles.year, post.vehicles.make, post.vehicles.model].filter(Boolean).join(' ')
        : '';
      const data: ShareCardData = {
        type: 'spot',
        title: vehicleName || 'a vehicle',
        subtitle: post.caption || undefined,
        userHandle: post.author.handle,
        userRep: 0,
        deepLinkUrl: `${window.location.origin}/#/post/${post.id}`,
      };
      const shared = await shareToSocial(data, user?.id);
      if (shared) {
        setCopied(true);
        if (!navigator.share) showToast('Link copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 2000);
        celebrateReward({
          type: 'rp',
          title: 'Spot Shared',
          message: 'You pushed this ride beyond the feed.',
          points: 2,
        });
        await sendShareNotification();
      }
      return;
    }

    // Fallback for non-post shares using direct props
    const shareUrl = url || '';
    if (navigator.share) {
      try {
        await navigator.share({ title: title || '', text: text || '', url: shareUrl });
      } catch {
        // cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        showToast('Link copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        showToast('Failed to copy link', 'error');
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-1.5 transition-all active:scale-95 ${className}`}
      title="Share"
    >
      {copied ? <Check className="w-5 h-5 text-green-500" /> : <Share2 className="w-5 h-5" />}
      {showLabel && <span className="text-sm font-medium">{copied ? 'Copied!' : 'Share'}</span>}
    </button>
  );
}
