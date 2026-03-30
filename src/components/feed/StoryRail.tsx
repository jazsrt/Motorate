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
      display: 'flex', gap: 10, padding: '10px 14px',
      overflowX: 'auto', scrollbarWidth: 'none' as const,
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      {vehicles.map(v => {
        const img = v.profile_image_url || v.stock_image_url;
        const initial = (v.make || '?')[0].toUpperCase();

        return (
          <button
            key={v.id}
            onClick={() => onNavigate('vehicle-detail', v.id)}
            style={{
              flexShrink: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4, background: 'none', border: 'none',
              cursor: 'pointer', padding: 0,
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14, overflow: 'hidden',
              border: '2px solid rgba(249,115,22,0.40)',
              padding: 2,
              background: '#0d1117',
            }}>
              {img ? (
                <img src={img} alt={v.make || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 10 }} />
              ) : (
                <div style={{ width: '100%', height: '100%', borderRadius: 10, background: '#0a0d14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#F97316' }}>{initial}</span>
                </div>
              )}
            </div>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#5a6e7e', maxWidth: 54, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {v.make || '---'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
