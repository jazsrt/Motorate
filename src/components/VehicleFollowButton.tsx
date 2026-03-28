import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Clock, Check } from 'lucide-react';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface VehicleFollowButtonProps {
  vehicleId: string;
  vehicleOwnerId?: string | null;
  isPrivateVehicle?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  size?: 'sm' | 'md';
}

type FollowStatus = 'none' | 'pending' | 'accepted';

export function VehicleFollowButton({
  vehicleId,
  vehicleOwnerId,
  isPrivateVehicle = false,
  onFollowChange,
  size = 'md',
}: VehicleFollowButtonProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<FollowStatus>('none');
  const [loading, setLoading] = useState(false);

  const isOwner = useMemo(() => user?.id === vehicleOwnerId, [user, vehicleOwnerId]);

  const checkStatus = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('vehicle_follows')
      .select('status')
      .eq('follower_id', user.id)
      .eq('vehicle_id', vehicleId)
      .maybeSingle();
    setStatus(data ? (data.status as FollowStatus) : 'none');
  }, [user, vehicleId]);

  useEffect(() => {
    if (user && !isOwner) checkStatus();
  }, [user, vehicleId, isOwner, checkStatus]);

  const toggle = async () => {
    if (!user || loading || isOwner) return;
    setLoading(true);

    try {
      if (status === 'accepted' || status === 'pending') {
        // Unfollow
        await supabase
          .from('vehicle_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('vehicle_id', vehicleId);
        setStatus('none');
        onFollowChange?.(false);
      } else {
        // Follow
        const newStatus = isPrivateVehicle ? 'pending' : 'accepted';
        const { error } = await supabase
          .from('vehicle_follows')
          .insert({ follower_id: user.id, vehicle_id: vehicleId, status: newStatus });

        if (!error) {
          setStatus(newStatus);
          onFollowChange?.(newStatus === 'accepted');

          // Send notification
          try {
            if (newStatus === 'accepted') {
              const { notifyVehicleFollow } = await import('../lib/notifications');
              await notifyVehicleFollow(vehicleId, user.id);
            } else {
              const { notifyVehicleFollowRequest } = await import('../lib/notifications');
              await notifyVehicleFollowRequest(vehicleId, user.id);
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error('VehicleFollowButton error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render for vehicle owners
  if (!user || isOwner) return null;

  const label = status === 'accepted' ? 'Following' : status === 'pending' ? 'Requested' : 'Follow';
  const Icon = status === 'accepted' ? Check : status === 'pending' ? Clock : Heart;
  const isActive = status !== 'none';

  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-[11px] gap-1'
    : 'px-4 py-2.5 text-[12px] gap-1.5';

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        fontFamily: 'var(--font-cond)',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        borderRadius: '8px',
        border: isActive ? '1px solid rgba(255,255,255,0.12)' : 'none',
        background: isActive ? 'transparent' : 'var(--accent)',
        color: isActive ? 'var(--light)' : 'var(--black)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        opacity: loading ? 0.6 : 1,
      }}
      className={sizeClasses}
    >
      {loading
        ? <LoadingSpinner size="sm" />
        : <Icon style={{ width: size === 'sm' ? 12 : 14, height: size === 'sm' ? 12 : 14 }} strokeWidth={2} />
      }
      {label}
    </button>
  );
}
