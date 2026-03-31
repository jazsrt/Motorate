import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { VEHICLE_PUBLIC_COLUMNS } from '../lib/vehicles';
import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';

type Scope = 'your-model' | 'city' | 'state' | 'region' | 'national' | 'brand';

const SCOPE_LABELS: Record<Scope, string> = {
  'your-model': 'Your Model',
  'city': 'City',
  'state': 'State',
  'region': 'Region',
  'national': 'National',
  'brand': 'Brand',
};

const REGIONS: Record<string, string[]> = {
  Midwest: ['IL','IN','OH','MI','WI','MN','IA','MO','ND','SD','NE','KS'],
  Northeast: ['NY','PA','NJ','MA','CT','RI','VT','NH','ME','MD','DE'],
  South: ['TX','FL','GA','NC','SC','TN','AL','MS','LA','AR','VA','WV','KY','OK','DC'],
  West: ['CA','NV','AZ','NM','CO','UT','WY','MT','ID','OR','WA','AK','HI'],
};

function getRegionForState(state: string | null): string | null {
  if (!state) return null;
  const upper = state.toUpperCase();
  for (const [region, states] of Object.entries(REGIONS)) {
    if (states.includes(upper)) return region;
  }
  return null;
}

function getRegionStates(state: string | null): string[] {
  const region = getRegionForState(state);
  if (!region) return [];
  return REGIONS[region];
}

interface RankingsPageProps {
  onNavigate: OnNavigate;
}

export function RankingsPage({ onNavigate }: RankingsPageProps) {
  const { user } = useAuth();
  const [ranked, setRanked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>('national');
  const [userVehicle, setUserVehicle] = useState<{ id: string; make: string | null; model: string | null; state: string | null } | null>(null);
  const [makes, setMakes] = useState<string[]>([]);
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const [initDone, setInitDone] = useState(false);

  // Load user's claimed vehicle for scope defaults
  useEffect(() => {
    if (!user) { setInitDone(true); return; }
    supabase
      .from('vehicles')
      .select('id, make, model, state')
      .eq('owner_id', user.id)
      .eq('is_claimed', true)
      .order('reputation_score', { ascending: false })
      .limit(1)
      // PLATE: hidden — public surface
      .then(({ data }) => {
        if (data?.[0]) {
          setUserVehicle(data[0]);
          setScope('your-model');
          setSelectedMake(data[0].make);
        }
        setInitDone(true);
      });
  }, [user]);

  const loadRankings = useCallback(async () => {
    if (!initDone) return;
    setLoading(true);
    // PLATE: hidden — public surface
    let query = supabase
      .from('vehicles')
      .select(VEHICLE_PUBLIC_COLUMNS)
      .gt('reputation_score', 0)
      .order('reputation_score', { ascending: false })
      .limit(50);

    if (scope === 'your-model' && userVehicle?.make && userVehicle?.model) {
      query = query.eq('make', userVehicle.make).eq('model', userVehicle.model);
    } else if (scope === 'city' && userVehicle?.state) {
      query = query.eq('state', userVehicle.state);
    } else if (scope === 'state' && userVehicle?.state) {
      query = query.eq('state', userVehicle.state);
    } else if (scope === 'region' && userVehicle?.state) {
      const regionStates = getRegionStates(userVehicle.state);
      if (regionStates.length > 0) {
        query = query.in('state', regionStates);
      }
    } else if (scope === 'brand' && selectedMake) {
      query = query.eq('make', selectedMake);
    }

    const { data } = await query;
    if (data) {
      setRanked(data);
      // Extract unique makes for brand scope
      const uniqueMakes = [...new Set(data.map((v: any) => v.make).filter(Boolean))].sort() as string[];
      setMakes(uniqueMakes);
    }
    setLoading(false);
  }, [scope, userVehicle, selectedMake, initDone]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  const handleScopeChange = (newScope: Scope) => {
    setScope(newScope);
    if (newScope === 'brand') {
      setSelectedMake(userVehicle?.make || null);
    } else {
      setSelectedMake(null);
    }
  };

  const scopeDisplayLabel = scope === 'your-model' && userVehicle?.make && userVehicle?.model
    ? `${userVehicle.make} ${userVehicle.model}`
    : scope === 'city' && userVehicle?.state ? userVehicle.state
    : scope === 'state' && userVehicle?.state ? userVehicle.state
    : scope === 'region' && userVehicle?.state ? getRegionForState(userVehicle.state) || 'Region'
    : scope === 'brand' && selectedMake ? selectedMake
    : SCOPE_LABELS[scope];

  return (
    <Layout currentPage="rankings" onNavigate={onNavigate}>
      <div style={{ background: '#030508', minHeight: '100vh', paddingBottom: 88 }}>

        {/* Header */}
        <div style={{ padding: '52px 16px 14px', background: '#0a0d14' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: '#3a4e60', marginBottom: 2 }}>
            {scopeDisplayLabel}
          </div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
            Top <span style={{ color: '#F97316' }}>Vehicles</span>
          </div>
        </div>

        {/* Scope tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#070a0f', overflowX: 'auto', scrollbarWidth: 'none' as const }}>
          {(['your-model', 'city', 'state', 'region', 'national', 'brand'] as Scope[]).map((key) => {
            const isOn = scope === key;
            return (
              <button key={key} onClick={() => handleScopeChange(key)}
                style={{
                  flex: 1, padding: '10px 0', textAlign: 'center' as const,
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                  color: isOn ? '#F97316' : '#5a6e7e',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: isOn ? '2px solid #F97316' : '2px solid transparent',
                  marginBottom: -1,
                }}>
                {SCOPE_LABELS[key]}
              </button>
            );
          })}
        </div>

        {/* Brand filter pills */}
        {scope === 'brand' && makes.length > 0 && (
          <div style={{ display: 'flex', gap: 6, padding: '8px 14px', overflowX: 'auto', scrollbarWidth: 'none' as const, background: '#0a0d14', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {makes.map(make => {
              const isActive = selectedMake === make;
              return (
                <button key={make} onClick={() => setSelectedMake(make)}
                  style={{
                    flexShrink: 0, padding: '4px 12px', borderRadius: 20,
                    background: isActive ? 'rgba(249,115,22,0.10)' : 'transparent',
                    border: `1px solid ${isActive ? 'rgba(249,115,22,0.40)' : 'rgba(255,255,255,0.06)'}`,
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                    color: isActive ? '#F97316' : '#3a4e60', cursor: 'pointer',
                  }}>
                  {make}
                </button>
              );
            })}
          </div>
        )}

        {/* Ranked list */}
        {!loading && ranked.map((v, i) => {
          const rank = i + 1;
          const isTop3 = rank <= 3;
          const photoUrl = v.profile_image_url || v.stock_image_url;
          const repScore = v.reputation_score ?? 0;
          const spotsCount = v.spots_count ?? 0;
          const isUserVehicle = userVehicle && v.id === userVehicle.id;

          return (
            <div key={v.id}
              onClick={() => onNavigate('vehicle-detail', { vehicleId: v.id })}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                borderBottom: '1px solid rgba(249,115,22,0.05)',
                background: isTop3 ? 'rgba(249,115,22,0.02)' : 'transparent',
                cursor: 'pointer',
                ...(isUserVehicle ? { borderLeft: '3px solid #F97316', background: 'rgba(249,115,22,0.04)' } : {}),
              }}>
              {/* Rank badge */}
              <div style={{
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, borderRadius: 4,
                ...(rank === 1 ? { background: '#f0a030' }
                  : rank === 2 ? { background: '#9aaebc' }
                  : rank === 3 ? { background: '#cd7f32' }
                  : {}),
              }}>
                <span style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: isTop3 ? 16 : 13,
                  fontWeight: 700,
                  color: isTop3 ? '#030508' : '#5a6e7e',
                }}>
                  {rank}
                </span>
              </div>

              {/* Vehicle thumb */}
              <div style={{
                width: 52, height: 38, borderRadius: 5, overflow: 'hidden',
                background: '#111720', flexShrink: 0,
              }}>
                {photoUrl ? (
                  <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a4e60" strokeWidth="1.5">
                      <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17H3v-6l2-5h9l4 5h3v6h-2"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Vehicle info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 700,
                  color: '#eef4f8', lineHeight: 1,
                  whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {[v.make, v.model].filter(Boolean).join(' ') || '\u2014'}
                </div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5a6e7e', marginTop: 2,
                }}>
                  {[v.year, spotsCount > 0 ? `${spotsCount} spots` : null].filter(Boolean).join(' \u00B7 ')}
                </div>
              </div>

              {/* Score */}
              <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600,
                  color: '#F97316', fontVariantNumeric: 'tabular-nums',
                }}>
                  {repScore.toLocaleString()}
                </div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700,
                  letterSpacing: '0.1em', color: '#5a6e7e',
                }}>
                  RP
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading skeleton */}
        {loading && (
          <div>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(249,115,22,0.05)', alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, background: '#0e1320', borderRadius: 4 }} />
                <div style={{ width: 52, height: 38, background: '#0e1320', borderRadius: 5 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '60%', height: 14, background: '#0e1320', borderRadius: 3, marginBottom: 6 }} />
                  <div style={{ width: '40%', height: 10, background: '#0e1320', borderRadius: 3 }} />
                </div>
                <div style={{ width: 48, height: 22, background: '#0e1320', borderRadius: 3 }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && ranked.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '48px 24px', textAlign: 'center' as const }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e2a38" strokeWidth="1" style={{ marginBottom: 16 }}>
              <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17H3v-6l2-5h9l4 5h3v6h-2"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', marginBottom: 6 }}>No Vehicles Ranked Yet</p>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e', lineHeight: 1.5, marginBottom: 20 }}>Spot vehicles to start building the leaderboard.</p>
            <button onClick={() => onNavigate('scan')} style={{
              padding: '10px 24px', background: '#F97316', color: '#030508', border: 'none', borderRadius: 6,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase' as const, cursor: 'pointer',
            }}>
              Spot a Car
            </button>
          </div>
        )}

      </div>
    </Layout>
  );
}
