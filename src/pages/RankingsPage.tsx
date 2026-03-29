import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { VEHICLE_PUBLIC_COLUMNS } from '../lib/vehicles';
import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';

const C = {
  black:    '#030508',
  carbon0:  '#070a0f',
  carbon1:  '#0a0d14',
  carbon2:  '#0e1320',
  muted:    '#445566',
  dim:      '#5a6e7e',
  sub:      '#7a8e9e',
  white:    '#eef4f8',
  accent:   '#F97316',
  gold:     '#f0a030',
};

type Scope = 'global' | 'city' | 'make';

interface RankingsPageProps {
  onNavigate: OnNavigate;
}

export function RankingsPage({ onNavigate }: RankingsPageProps) {
  const { user } = useAuth();
  const [ranked, setRanked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>('global');
  const [userState, setUserState] = useState<string | null>(null);
  const [makes, setMakes] = useState<string[]>([]);
  const [selectedMake, setSelectedMake] = useState<string | null>(null);

  // Load user's state from their vehicles for city scope
  useEffect(() => {
    if (!user) return;
    supabase
      .from('vehicles')
      .select('state')
      .eq('owner_id', user.id)
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.state) setUserState(data[0].state);
      });
  }, [user]);

  const loadRankings = useCallback(async () => {
    setLoading(true);
    // PLATE: hidden — public surface
    let query = supabase
      .from('vehicles')
      .select(VEHICLE_PUBLIC_COLUMNS)
      .gt('reputation_score', 0)
      .order('reputation_score', { ascending: false })
      .limit(50);

    if (scope === 'city' && userState) {
      query = query.eq('state', userState);
    }
    if (scope === 'make' && selectedMake) {
      query = query.eq('make', selectedMake);
    }

    const { data } = await query;
    if (data) {
      setRanked(data);
      // Extract unique makes for make filter
      if (scope !== 'make') {
        const uniqueMakes = [...new Set(data.map((v: any) => v.make).filter(Boolean))].sort() as string[];
        setMakes(uniqueMakes);
      }
    }
    setLoading(false);
  }, [scope, userState, selectedMake]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  const handleScopeChange = (newScope: Scope) => {
    setScope(newScope);
    if (newScope !== 'make') setSelectedMake(null);
  };

  const scopeLabel = scope === 'city' && userState ? userState
    : scope === 'make' && selectedMake ? selectedMake
    : 'Global';

  return (
    <Layout currentPage="rankings" onNavigate={onNavigate}>
      <div style={{ background: C.black, minHeight: '100vh', paddingBottom: 88 }}>

        {/* Header */}
        <div style={{ padding: '52px 18px 8px', background: `linear-gradient(to bottom, ${C.carbon0} 60%, transparent)` }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 3 }}>
            {scopeLabel}
          </div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700, color: C.white, lineHeight: 1 }}>
            Top <em style={{ fontStyle: 'normal', color: C.accent }}>Vehicles</em>
          </div>
        </div>

        {/* Scope tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', background: C.carbon0 }}>
          {(['Global', 'City', 'Make'] as const).map((label) => {
            const key = label.toLowerCase() as Scope;
            const isOn = scope === key;
            return (
              <button key={label} onClick={() => handleScopeChange(key)}
                style={{
                  flex: 1, padding: '10px 0', textAlign: 'center' as const,
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                  color: isOn ? C.accent : C.dim,
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: isOn ? `2px solid ${C.accent}` : '2px solid transparent',
                }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Make filter pills */}
        {scope === 'make' && makes.length > 0 && (
          <div style={{ display: 'flex', gap: 6, padding: '10px 18px', overflowX: 'auto', scrollbarWidth: 'none' as const, background: C.carbon0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {makes.map(make => {
              const isActive = selectedMake === make;
              return (
                <button key={make} onClick={() => setSelectedMake(make)}
                  style={{
                    flexShrink: 0, padding: '5px 12px', borderRadius: 20,
                    background: isActive ? 'rgba(249,115,22,0.12)' : 'transparent',
                    border: `1px solid ${isActive ? 'rgba(249,115,22,0.45)' : 'rgba(255,255,255,0.06)'}`,
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                    color: isActive ? C.accent : C.dim, cursor: 'pointer',
                  }}>
                  {make}
                </button>
              );
            })}
          </div>
        )}

        {/* City scope — no state message */}
        {scope === 'city' && !userState && !loading && (
          <div style={{ padding: '32px 24px', textAlign: 'center' as const }}>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: C.dim }}>
              Claim a vehicle with a state to see local rankings.
            </p>
          </div>
        )}

        {/* Ranked list */}
        {!loading && ranked.map((v, i) => {
          const rank = i + 1;
          const isTop3 = rank <= 3;
          const photoUrl = v.profile_image_url || v.stock_image_url;
          const repScore = v.reputation_score ?? 0;
          const spotsCount = v.spots_count ?? 0;

          return (
            <div key={v.id}
              onClick={() => onNavigate('vehicle-detail', { vehicleId: v.id })}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: isTop3 ? '12px 18px' : '10px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                background: isTop3 ? 'rgba(249,115,22,0.03)' : 'transparent',
                cursor: 'pointer',
              }}>
              {/* Rank number */}
              <div style={{
                width: isTop3 ? 30 : 28, height: isTop3 ? 30 : 'auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                ...(isTop3 ? {
                  background: rank === 1 ? C.gold : rank === 2 ? C.sub : C.muted,
                  borderRadius: 4,
                } : {}),
              }}>
                <span style={{
                  fontFamily: "'Rajdhani', sans-serif", fontSize: isTop3 ? 18 : 16, fontWeight: 700,
                  color: isTop3 ? C.black : C.dim,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {rank}
                </span>
              </div>

              {/* Photo */}
              <div style={{
                width: isTop3 ? 50 : 44, height: isTop3 ? 38 : 34,
                borderRadius: 5, overflow: 'hidden', background: C.carbon2, flexShrink: 0,
                border: isTop3 ? `1px solid ${rank === 1 ? C.gold : rank === 2 ? C.sub : C.muted}` : 'none',
              }}>
                {photoUrl ? (
                  <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect width="13" height="8" x="9" y="13" rx="2"/></svg>
                  </div>
                )}
              </div>

              {/* Vehicle info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Rajdhani', sans-serif", fontSize: isTop3 ? 16 : 15, fontWeight: 700,
                  color: C.white, lineHeight: 1,
                  whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {[v.make, v.model].filter(Boolean).join(' ') || '\u2014'}
                </div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
                  letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.dim, marginTop: 2,
                }}>
                  {[v.year, spotsCount > 0 ? `${spotsCount} spots` : null].filter(Boolean).join(' \u00B7 ')}
                </div>
              </div>

              {/* Score */}
              <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: isTop3 ? 14 : 13, fontWeight: 600,
                  color: isTop3 ? C.accent : C.white, fontVariantNumeric: 'tabular-nums',
                }}>
                  {repScore.toLocaleString()}
                </div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                  color: C.dim, marginTop: 1,
                }}>
                  RP
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading */}
        {loading && (
          <div>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
                <div style={{ width: 28, height: 18, background: C.carbon2, borderRadius: 3 }} />
                <div style={{ width: 44, height: 34, background: C.carbon2, borderRadius: 5 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '60%', height: 14, background: C.carbon2, borderRadius: 3, marginBottom: 6 }} />
                  <div style={{ width: '40%', height: 10, background: C.carbon2, borderRadius: 3 }} />
                </div>
                <div style={{ width: 48, height: 22, background: C.carbon2, borderRadius: 3 }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && ranked.length === 0 && (
          <div style={{ padding: '64px 24px', textAlign: 'center' as const }}>
            <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 8 }}>No Vehicles Ranked Yet</p>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: C.dim, marginBottom: 20 }}>Spot vehicles to start building the leaderboard.</p>
            <button onClick={() => onNavigate('scan')} style={{
              padding: '10px 24px', background: '#F97316', color: '#030508', border: 'none', borderRadius: 6,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
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
