import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

/**
 * Hook to subscribe to real-time moderation status updates for user's content.
 * Shows success toast when content is approved, error toast when rejected.
 */
export function useModerationSubscription(onUpdate?: () => void) {
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!user) return;

    const reviewsChannel = supabase
      .channel('moderation-reviews')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reviews',
          filter: `author_id=eq.${user.id}`,
        },
        (payload: any) => {
          const newStatus = payload.new.moderation_status;
          const oldStatus = payload.old?.moderation_status;

          if (oldStatus === 'pending' && newStatus === 'approved') {
            showToast('Your review has been approved!', 'success');
            onUpdate?.();
          } else if (oldStatus === 'pending' && newStatus === 'rejected') {
            const reason = payload.new.rejection_reason;
            let message = 'Your review was not approved.';

            if (reason === 'no_vehicle') {
              message = 'Review rejected: No vehicle found in photo.';
            } else if (reason === 'inappropriate') {
              message = 'Review rejected: Content doesn\'t meet guidelines.';
            }

            showToast(message, 'error', 8000);
            onUpdate?.();
          }
        }
      )
      .subscribe();

    const postsChannel = supabase
      .channel('moderation-posts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `author_id=eq.${user.id}`,
        },
        (payload: any) => {
          const newStatus = payload.new.moderation_status;
          const oldStatus = payload.old?.moderation_status;

          if (oldStatus === 'pending' && newStatus === 'approved') {
            showToast('Your post has been approved!', 'success');
            onUpdate?.();
          } else if (oldStatus === 'pending' && newStatus === 'rejected') {
            const reason = payload.new.rejection_reason;
            let message = 'Your post was not approved.';

            if (reason === 'no_vehicle') {
              message = 'Post rejected: No vehicle found in photo.';
            } else if (reason === 'inappropriate') {
              message = 'Post rejected: Content doesn\'t meet guidelines.';
            }

            showToast(message, 'error', 8000);
            onUpdate?.();
          }
        }
      )
      .subscribe();

    return () => {
      reviewsChannel.unsubscribe();
      postsChannel.unsubscribe();
    };
  }, [user, showToast, onUpdate]);
}
