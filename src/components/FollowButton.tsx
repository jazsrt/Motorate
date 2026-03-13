import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, UserCheck, Clock } from 'lucide-react';
import { useRateLimit } from '../hooks/useRateLimit';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface FollowButtonProps {
  targetUserId: string;
  onFollowChange?: (isFollowing: boolean) => void;
  size?: 'xs' | 'sm' | 'md';
}

type FollowStatus = 'none' | 'pending' | 'accepted';

export function FollowButton({ targetUserId, onFollowChange, size = 'md' }: FollowButtonProps) {
  const { user } = useAuth();
  const [followStatus, setFollowStatus] = useState<FollowStatus>('none');
  const [targetUserPrivate, setTargetUserPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const { checkAndConsume } = useRateLimit('follow');

  useEffect(() => {
    if (user && targetUserId) {
      checkFollowStatus();
    }
  }, [user, targetUserId]);

  const checkFollowStatus = async () => {
    if (!user) return;

    const [followResult, profileResult] = await Promise.all([
      supabase
        .from('follows')
        .select('status')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('is_private')
        .eq('id', targetUserId)
        .maybeSingle()
    ]);

    if (followResult.data) {
      setFollowStatus(followResult.data.status as FollowStatus);
    } else {
      setFollowStatus('none');
    }

    setTargetUserPrivate(profileResult.data?.is_private || false);
  };

  const toggleFollow = async () => {
    if (!user || loading) return;

    if (followStatus === 'none' && !checkAndConsume()) {
      return;
    }

    setLoading(true);

    try {
      if (followStatus === 'accepted' || followStatus === 'pending') {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (!error) {
          setFollowStatus('none');
          onFollowChange?.(false);
        }
      } else {
        const newStatus = targetUserPrivate ? 'pending' : 'accepted';

        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
            status: newStatus,
          });

        if (!error) {
          setFollowStatus(newStatus);
          onFollowChange?.(newStatus === 'accepted');

          // Send notification to followed user (only if accepted, not pending)
          if (newStatus === 'accepted') {
            try {
              const { notifyNewFollower } = await import('../lib/notifications');
              await notifyNewFollower(targetUserId, user.id);
            } catch (notifError) {
              console.error('Failed to send follow notification:', notifError);
            }
          }

          // AUTO-AWARD: Check for tiered follower badges (follower_id = the user who followed)
          try {
            await supabase.rpc('check_and_award_badges', {
              p_user_id: user.id,
              p_action: 'follow'
            });
          } catch (autoAwardError) {
            console.error('Auto-award badge error:', autoAwardError);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.id === targetUserId) {
    return null;
  }

  const getButtonContent = () => {
    const iconSize = size === 'xs' ? 'w-2.5 h-2.5' : size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    switch (followStatus) {
      case 'accepted':
        return {
          icon: <UserCheck className={iconSize} />,
          text: 'Following',
          isFollowing: true
        };
      case 'pending':
        return {
          icon: <Clock className={iconSize} />,
          text: 'Requested',
          isFollowing: true
        };
      default:
        return {
          icon: <UserPlus className={iconSize} />,
          text: 'Follow',
          isFollowing: false
        };
    }
  };

  const buttonContent = getButtonContent();

  const sizeClasses = size === 'xs'
    ? 'px-2 py-0.5 text-[9px] gap-0.5'
    : size === 'sm'
    ? 'px-3 py-1.5 text-xs gap-1'
    : 'px-6 py-2.5 text-sm gap-2';

  return (
    <button
      onClick={toggleFollow}
      disabled={loading}
      className={`flex items-center ${sizeClasses} rounded-xl transition-all active:scale-95 font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed ${
        buttonContent.isFollowing
          ? 'bg-transparent border-2 border-orange text-accent-primary hover:bg-orange/10'
          : 'text-white border-2 border-transparent hover:opacity-90'
      }`}
      style={
        !buttonContent.isFollowing
          ? {
              background: 'linear-gradient(135deg, #F97316, #fb923c)'
            }
          : undefined
      }
    >
      {loading ? <LoadingSpinner size="sm" /> : size !== 'xs' ? buttonContent.icon : null}
      {buttonContent.text}
    </button>
  );
}
