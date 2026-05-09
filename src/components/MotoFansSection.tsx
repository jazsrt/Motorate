import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { VEHICLE_PUBLIC_COLUMNS } from '../lib/vehicles';
import type { OnNavigate } from '../types/navigation';

interface FannedVehicle {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  stock_image_url: string | null;
  profile_image_url: string | null;
  reputation_score: number | null;
}

interface MotoFansSectionProps {
  userId: string;
  onNavigate: OnNavigate;
}

export function MotoFansSection({ userId, onNavigate }: MotoFansSectionProps) {
  const [vehicles, setVehicles] = useState<FannedVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: follows } = await supabase
        .from('vehicle_follows')
        .select('vehicle_id')
        .eq('follower_id', userId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!follows?.length) { setLoading(false); return; }

      const ids = follows.map(f => f.vehicle_id);
      // PLATE: hidden — public surface
      const { data } = await supabase
        .from('vehicles')
        .select(VEHICLE_PUBLIC_COLUMNS)
        .in('id', ids)
        .eq('is_private', false);

      setVehicles((data as unknown as FannedVehicle[]) || []);
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading || vehicles.length === 0) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
          Followed Vehicles · {vehicles.length}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, padding: '0 14px 20px' }}>
        {vehicles.map(v => {
          const img = v.profile_image_url || v.stock_image_url || null;
          const name = v.model || v.make || 'Vehicle';
          const make = v.make || '';
          const rp = v.reputation_score ?? 0;

          return (
            <div
              key={v.id}
              onClick={() => onNavigate('vehicle-detail', { vehicleId: v.id })}
              style={{
                position: 'relative', borderRadius: 10, overflow: 'hidden',
                cursor: 'pointer', aspectRatio: '4/3', background: '#111720',
              }}
            >
              {img ? (
                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.85 }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#111720', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3a4e60" strokeWidth="1.5">
                    <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17H3v-6l2-5h9l4 5h3v6h-2"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.93) 0%, transparent 55%)' }} />
              <div style={{ position: 'absolute', bottom: 8, left: 10, right: 10 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316' }}>
                  {make}
                </div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
                  {name}
                </div>
                {rp > 0 && (
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600, color: '#F97316', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                    {rp.toLocaleString()} RP
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
