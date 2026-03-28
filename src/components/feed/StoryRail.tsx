import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface StoryVehicle {
  id: string;
  make: string | null;
  model: string | null;
  profile_image_url: string | null;
  stock_image_url: string | null;
  plate_state: string | null;
  reputation_score: number | null;
}

interface StoryRailProps {
  onNavigate: (page: string, data?: unknown) => void;
}

export function StoryRail({ onNavigate }: StoryRailProps) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<StoryVehicle[]>([]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await supabase
        .from('vehicle_follows')
        .select(`
          vehicle_id,
          vehicles:vehicle_id(
            id, make, model, profile_image_url, stock_image_url, plate_state, reputation_score
          )
        `)
        .eq('follower_id', user!.id)
        .eq('status', 'accepted')
        .limit(12);

      if (data) {
        const mapped = data
          .map((row: any) => Array.isArray(row.vehicles) ? row.vehicles[0] : row.vehicles)
          .filter(Boolean)
          .sort((a: StoryVehicle, b: StoryVehicle) => (b.reputation_score ?? 0) - (a.reputation_score ?? 0));
        setVehicles(mapped);
      }
    }
    load();
  }, [user]);

  if (vehicles.length === 0) return null;

  return (
    <div style={{
      padding: '10px 16px 6px', display: 'flex', gap: 14,
      overflowX: 'auto', scrollbarWidth: 'none' as const,
      background: '#030508',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      {vehicles.map(v => {
        const img = v.profile_image_url || v.stock_image_url;
        const initial = (v.make || '?')[0].toUpperCase();
        const hasActivity = (v.reputation_score ?? 0) > 500;

        return (
          <button
            key={v.id}
            onClick={() => onNavigate('vehicle-detail', v.id)}
            style={{
              width: 64, flexShrink: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4, background: 'none', border: 'none',
              cursor: 'pointer', padding: 0,
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
              border: hasActivity
                ? '2px solid rgba(249,115,22,0.5)'
                : '2px solid rgba(255,255,255,0.08)',
              background: '#0a0d14',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {img ? (
                <img src={img} alt={v.make || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#F97316' }}>{initial}</span>
              )}
            </div>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 600,
              color: '#5a6e7e', maxWidth: 56, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {v.make || '---'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
