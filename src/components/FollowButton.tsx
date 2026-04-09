import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, UserCheck, Clock } from 'lucide-react';
import { useRateLimit } from '../hooks/useRateLimit';

interface FollowButtonProps {
  targetUserId: string;
  onFollowChange?: (isFollowing: boolean) => void;
  size?: 'xs' | 'sm' | 'md';
}

type FollowStatus = 'none' | 'pending' | 'accepted';

export function FollowButton({ targetUserId, onFollowChange, size = 'md' }: FollowButtonProps) {
  const { user } = useAuth();
  const [followStatus, setFollowStatus] = useState<FollowStatus>('none');
  const [loading, setLoading] = useState(false);
  const { checkAndConsume } = useRateLimit('follow');

  const checkFollowStatus = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('follows')
      .select('status')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle();
    setFollowStatus((data?.status as FollowStatus) || 'none');
  }, [user, targetUserId]);

  useEffect(() => {
    if (user && targetUserId) checkFollowStatus();
  }, [user, targetUserId, checkFollowStatus]);

  const toggleFollow = async () => {
    if (!user || loading) return;

    if (followStatus === 'none' && !checkAndConsume()) return;

    setLoading(true);

    try {
      if (followStatus === 'accepted' || followStatus === 'pending') {
        if (followStatus === 'accepted' && !window.confirm('Unfriend this user?')) {
          setLoading(false);
          return;
        }
        // Remove both directions for mutual unfriend
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
        await supabase.from('follows').delete().eq('follower_id', targetUserId).eq('following_id', user.id);
        setFollowStatus('none');
        onFollowChange?.(false);
      } else {
        // Send friend request (always pending, target must approve)
        const { error } = await supabase.from('follows').insert({
          follower_id: user.id,
          following_id: targetUserId,
          status: 'pending',
        });
        if (!error) {
          setFollowStatus('pending');
          onFollowChange?.(false);
          try {
            const { notifyFriendRequest } = await import('../lib/notifications');
            await notifyFriendRequest(targetUserId, user.id);
          } catch { /* intentionally empty */ }
        }
      }
    } catch (err) {
      console.error('Friend toggle error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.id === targetUserId) return null;

  const label = followStatus === 'accepted' ? 'Friends' : followStatus === 'pending' ? 'Requested' : 'Add Friend';
  const icon = followStatus === 'accepted' ? UserCheck : followStatus === 'pending' ? Clock : UserPlus;
  const Icon = icon;
  const isActive = followStatus !== 'none';
  const iconSize = size === 'xs' ? 10 : size === 'sm' ? 12 : 14;

  return (
    <button
      onClick={toggleFollow}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: size === 'xs' ? 3 : 6,
        padding: size === 'xs' ? '2px 8px' : size === 'sm' ? '5px 12px' : '8px 16px',
        background: isActive ? 'rgba(249,115,22,0.12)' : 'transparent',
        border: isActive ? '1px solid rgba(249,115,22,0.35)' : '1px solid rgba(255,255,255,0.10)',
        borderRadius: 6, cursor: 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <Icon size={iconSize} strokeWidth={2} style={{ color: isActive ? '#F97316' : '#7a8e9e' }} />
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: size === 'xs' ? 8 : size === 'sm' ? 9 : 10,
        fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
        color: isActive ? '#F97316' : '#7a8e9e',
      }}>
        {label}
      </span>
    </button>
  );
}
