import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRewardEvents } from '../contexts/RewardEventContext';

interface MotoFanButtonProps {
  vehicleId: string;
  ownerId: string | null;
  onCountChange?: (count: number) => void;
}

export function MotoFanButton({ vehicleId, ownerId, onCountChange }: MotoFanButtonProps) {
  const { user } = useAuth();
  const { celebrateReward } = useRewardEvents();
  const [fanStatus, setFanStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [fanCount, setFanCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [vehiclePrivate, setVehiclePrivate] = useState(false);

  const loadState = useCallback(async function loadState() {
    // Get accepted fan count
    const { count } = await supabase
      .from('vehicle_follows')
      .select('*', { count: 'exact', head: true })
      .eq('vehicle_id', vehicleId)
      .eq('status', 'accepted');
    const c = count ?? 0;
    setFanCount(c);
    onCountChange?.(c);

    // Check vehicle privacy setting
    const { data: vData } = await supabase
      .from('vehicles')
      .select('is_private')
      .eq('id', vehicleId)
      .maybeSingle();
    setVehiclePrivate(vData?.is_private || false);

    // Check current user's fan status
    if (user) {
      const { data } = await supabase
        .from('vehicle_follows')
        .select('id, status')
        .eq('vehicle_id', vehicleId)
        .eq('follower_id', user.id)
        .maybeSingle();
      setFanStatus((data?.status as 'pending' | 'accepted') || 'none');
    }
    setInitialLoaded(true);
  }, [vehicleId, user, onCountChange]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  async function toggle() {
    if (!user || loading) return;
    setLoading(true);

    if (fanStatus === 'accepted' || fanStatus === 'pending') {
      // Remove fan / cancel request
      await supabase.from('vehicle_follows')
        .delete()
        .eq('vehicle_id', vehicleId)
        .eq('follower_id', user.id);
      setFanStatus('none');
      if (fanStatus === 'accepted') {
        const next = Math.max(0, fanCount - 1);
        setFanCount(next);
        onCountChange?.(next);
      }
    } else {
      // Become a fan — auto-accept if vehicle is public, pending if private
      const newStatus = vehiclePrivate ? 'pending' : 'accepted';
      const { data: existing } = await supabase
        .from('vehicle_follows')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .eq('follower_id', user.id)
        .maybeSingle();
      if (existing) {
        await supabase.from('vehicle_follows')
          .update({ status: newStatus })
          .eq('id', existing.id);
      } else {
        await supabase.from('vehicle_follows')
          .insert({ vehicle_id: vehicleId, follower_id: user.id, status: newStatus });
      }
      setFanStatus(newStatus);
      if (newStatus === 'accepted') {
        const next = fanCount + 1;
        setFanCount(next);
        onCountChange?.(next);
        celebrateReward({
          type: 'follow',
          title: 'Vehicle Followed',
          message: 'You will see new activity from this ride.',
        });
        try { const { notifyVehicleFollow } = await import('../lib/notifications'); await notifyVehicleFollow(vehicleId, user.id); } catch { /* intentionally empty */ }
      } else {
        celebrateReward({
          type: 'follow',
          title: 'Fan Request Sent',
          message: 'Owner approval is pending.',
          accent: '#f0a030',
        });
        try { const { notifyVehicleFollowRequest } = await import('../lib/notifications'); await notifyVehicleFollowRequest(vehicleId, user.id); } catch { /* intentionally empty */ }
      }
    }
    setLoading(false);
  }

  if (user?.id === ownerId) return null;
  if (!initialLoaded) return null;

  const isFan = fanStatus === 'accepted';
  const isPending = fanStatus === 'pending';

  const isActive = isFan || isPending;
  const label = isFan ? 'Fan' : isPending ? 'Pending' : 'Become a Fan';
  const accentColor = isFan ? '#F97316' : isPending ? '#f0a030' : '#7a8e9e';

  return (
    <button
      onClick={toggle}
      disabled={loading || !user}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px',
        background: isActive ? 'rgba(249,115,22,0.12)' : 'transparent',
        border: isActive ? '1px solid rgba(249,115,22,0.40)' : '1px solid rgba(255,255,255,0.10)',
        borderRadius: 6,
        cursor: user ? 'pointer' : 'not-allowed',
        opacity: loading ? 0.6 : 1,
        transition: 'all 0.15s',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24"
        fill={isFan ? '#F97316' : 'none'}
        stroke={accentColor}
        strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const,
        color: accentColor,
      }}>
        {label}
      </span>
    </button>
  );
}
