import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { VEHICLE_PUBLIC_COLUMNS } from '../../lib/vehicles';

interface StoryVehicle {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  stock_image_url: string | null;
  profile_image_url: string | null;
  reputation_score: number | null;
}

interface VehicleStoryRailProps {
  onNavigate: (page: string, data?: any) => void;
}

export function VehicleStoryRail({ onNavigate }: VehicleStoryRailProps) {
  const [vehicles, setVehicles] = useState<StoryVehicle[]>([]);

  useEffect(() => {
    async function load() {
      // PLATE: hidden — public surface
      const { data } = await supabase
        .from('vehicles')
        .select(VEHICLE_PUBLIC_COLUMNS)
        .not('profile_image_url', 'is', null)
        .order('reputation_score', { ascending: false })
        .limit(15);

      if (data) {
        setVehicles(data.filter((v: any) => v.profile_image_url || v.stock_image_url));
      }
    }
    load();
  }, []);

  if (vehicles.length === 0) return null;

  return (
    <div style={{
      display: 'flex', gap: 10, padding: '12px 14px',
      overflowX: 'auto', scrollbarWidth: 'none' as const,
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      {vehicles.map(v => {
        const img = v.profile_image_url || v.stock_image_url;
        const label = v.model || v.make || '---';
        return (
          <button
            key={v.id}
            onClick={() => onNavigate('vehicle-detail', v.id)}
            style={{
              flexShrink: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 5, background: 'none', border: 'none',
              cursor: 'pointer', padding: 0,
            }}
          >
            {/* Ring */}
            <div style={{
              width: 60, height: 60, borderRadius: '50%', padding: 2,
              background: (v.reputation_score ?? 0) > 1000
                ? 'linear-gradient(135deg, #F97316, #ff6000)'
                : 'rgba(255,255,255,0.1)',
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                overflow: 'hidden', border: '2px solid #030508',
              }}>
                {img ? (
                  <img src={img} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#0e1320' }} />
                )}
              </div>
            </div>
            {/* Label */}
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: '#5a6e7e', maxWidth: 62, textAlign: 'center',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
