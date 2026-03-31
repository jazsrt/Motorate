import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { VEHICLE_PUBLIC_COLUMNS } from '../lib/vehicles';
import { Layout } from '../components/Layout';
import { Search } from 'lucide-react';
import { OnNavigate } from '../types/navigation';

// PLATE: hidden — public surface

interface ExploreVehicle {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  stock_image_url: string | null;
  profile_image_url?: string | null;
  reputation_score: number;
}

type FilterTab = 'all' | 'vehicles' | 'spots' | 'people';

const FILTERS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'spots', label: 'Spots' },
  { id: 'people', label: 'People' },
];

const GRID_SIZE = 5; // 1 wide + 4 regular cells

interface ExplorePageProps {
  onNavigate: OnNavigate;
}

export default function ExplorePage({ onNavigate }: ExplorePageProps) {
  const [vehicles, setVehicles] = useState<ExploreVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rotationIndex, setRotationIndex] = useState(0);
  const [fadingIn, setFadingIn] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadVehicles();
  }, []);

  // Auto-rotation
  useEffect(() => {
    if (vehicles.length <= GRID_SIZE) return;

    intervalRef.current = setInterval(() => {
      setFadingIn(false);
      setTimeout(() => {
        setRotationIndex(prev => (prev + GRID_SIZE) % vehicles.length);
        setFadingIn(true);
      }, 400);
    }, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [vehicles.length]);

  async function loadVehicles() {
    try {
      const { data } = await supabase
        .from('vehicles')
        .select(VEHICLE_PUBLIC_COLUMNS)
        .eq('is_private', false)
        .not('stock_image_url', 'is', null)
        .order('reputation_score', { ascending: false })
        .limit(50);

      if (data) {
        setVehicles(data as ExploreVehicle[]);
      }
    } catch (error) {
      console.error('Error loading explore vehicles:', error);
    } finally {
      setLoading(false);
    }
  }

  function getVisibleVehicles(): ExploreVehicle[] {
    if (vehicles.length === 0) return [];
    const result: ExploreVehicle[] = [];
    for (let i = 0; i < Math.min(GRID_SIZE, vehicles.length); i++) {
      result.push(vehicles[(rotationIndex + i) % vehicles.length]);
    }
    return result;
  }

  function getVehicleImage(v: ExploreVehicle): string | null {
    return v.profile_image_url || v.stock_image_url || null;
  }

  function getVehicleName(v: ExploreVehicle): string {
    const parts = [v.year, v.make, v.model].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Unknown Vehicle';
  }

  const visible = getVisibleVehicles();
  const wideVehicle = visible[0] || null;
  const gridVehicles = visible.slice(1);

  return (
    <Layout currentPage="explore" onNavigate={onNavigate}>
      {/* Page header */}
      <div style={{ padding: '52px 0 0', background: '#070a0f' }}>
        <div style={{ padding: '0 14px 10px' }}>
          <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8', margin: '0 0 10px' }}>
            Explore
          </h2>

          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#0d1117', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
            <Search style={{ width: 14, height: 14, color: '#5a6e7e', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search plates, makes, models..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim()) {
                  onNavigate('search', e.target.value);
                }
              }}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#eef4f8', padding: 0 }}
            />
          </div>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 14px', background: '#0a0d14', borderBottom: '1px solid rgba(255,255,255,0.04)', overflowX: 'auto' }}>
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                flexShrink: 0,
                padding: '4px 12px',
                borderRadius: 20,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                border: active ? '1px solid rgba(249,115,22,0.40)' : '1px solid rgba(255,255,255,0.06)',
                color: active ? '#F97316' : '#3a4e60',
                background: active ? 'rgba(249,115,22,0.10)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#3a4e60' }}>Loading...</span>
        </div>
      ) : vehicles.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#3a4e60' }}>No Vehicles Found</span>
        </div>
      ) : (
        <>
          {/* Section header */}
          <div style={{ padding: '12px 16px 0', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5a6e7e' }}>
            Trending Vehicles
          </div>

          {/* Explore grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, transition: 'opacity 0.4s ease', opacity: fadingIn ? 1 : 0 }}>
            {/* Wide cell — top vehicle */}
            {wideVehicle && (
              <div
                onClick={() => onNavigate('vehicle-detail', { vehicleId: wideVehicle.id })}
                style={{ position: 'relative', overflow: 'hidden', background: '#0d1117', gridColumn: 'span 2', height: 150, cursor: 'pointer' }}
              >
                {getVehicleImage(wideVehicle) && (
                  <img src={getVehicleImage(wideVehicle)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.8) 0%, transparent 60%)' }} />
                <div style={{ position: 'absolute', bottom: 8, left: 10, right: 10 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#F97316' }}>
                    {wideVehicle.make || 'Unknown'}
                  </div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
                    {getVehicleName(wideVehicle)}
                  </div>
                </div>
              </div>
            )}

            {/* Regular cells */}
            {gridVehicles.map((v) => (
              <div
                key={v.id}
                onClick={() => onNavigate('vehicle-detail', { vehicleId: v.id })}
                style={{ position: 'relative', overflow: 'hidden', background: '#0d1117', height: 120, cursor: 'pointer' }}
              >
                {getVehicleImage(v) && (
                  <img src={getVehicleImage(v)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.8) 0%, transparent 60%)' }} />
                <div style={{ position: 'absolute', bottom: 8, left: 10, right: 10 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#F97316' }}>
                    {v.make || 'Unknown'}
                  </div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
                    {getVehicleName(v)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}
