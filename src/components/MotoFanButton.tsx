import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface MotoFanButtonProps {
  vehicleId: string;
  ownerId: string | null;
  onCountChange?: (count: number) => void;
}

export function MotoFanButton({ vehicleId, ownerId, onCountChange }: MotoFanButtonProps) {
  const { user } = useAuth();
  const [isFan, setIsFan] = useState(false);
  const [fanCount, setFanCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    loadState();
  }, [vehicleId, user?.id]);

  async function loadState() {
    const { count } = await supabase
      .from('vehicle_follows')
      .select('*', { count: 'exact', head: true })
      .eq('vehicle_id', vehicleId)
      .eq('status', 'accepted');
    const c = count ?? 0;
    setFanCount(c);
    onCountChange?.(c);

    if (user) {
      const { data } = await supabase
        .from('vehicle_follows')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .eq('follower_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle();
      setIsFan(!!data);
    }
    setInitialLoaded(true);
  }

  async function toggle() {
    if (!user || loading) return;
    setLoading(true);
    if (isFan) {
      await supabase.from('vehicle_follows')
        .delete()
        .eq('vehicle_id', vehicleId)
        .eq('follower_id', user.id);
      setIsFan(false);
      const next = Math.max(0, fanCount - 1);
      setFanCount(next);
      onCountChange?.(next);
    } else {
      const { data: existing } = await supabase
        .from('vehicle_follows')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .eq('follower_id', user.id)
        .maybeSingle();
      if (existing) {
        await supabase.from('vehicle_follows')
          .update({ status: 'accepted' })
          .eq('id', existing.id);
      } else {
        await supabase.from('vehicle_follows')
          .insert({ vehicle_id: vehicleId, follower_id: user.id, status: 'accepted' });
      }
      setIsFan(true);
      const next = fanCount + 1;
      setFanCount(next);
      onCountChange?.(next);
    }
    setLoading(false);
  }

  if (user?.id === ownerId) return null;
  if (!initialLoaded) return null;

  return (
    <button
      onClick={toggle}
      disabled={loading || !user}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px',
        background: isFan ? 'rgba(249,115,22,0.12)' : 'transparent',
        border: isFan ? '1px solid rgba(249,115,22,0.40)' : '1px solid rgba(255,255,255,0.10)',
        borderRadius: 6,
        cursor: user ? 'pointer' : 'not-allowed',
        opacity: loading ? 0.6 : 1,
        transition: 'all 0.15s',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24"
        fill={isFan ? '#F97316' : 'none'}
        stroke={isFan ? '#F97316' : '#7a8e9e'}
        strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const,
        color: isFan ? '#F97316' : '#7a8e9e',
      }}>
        {isFan ? 'Fan' : 'Become a Fan'}
      </span>
    </button>
  );
}
