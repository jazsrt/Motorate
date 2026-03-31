import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { VEHICLE_PUBLIC_COLUMNS } from '../lib/vehicles';
import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';

type Scope = 'your-model' | 'city' | 'state' | 'national';

const SCOPE_TABS: { key: Scope; label: string }[] = [
  { key: 'your-model', label: 'Your Model' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'national', label: 'National' },
];

interface RankingsPageProps {
  onNavigate: OnNavigate;
}

export function RankingsPage({ onNavigate }: RankingsPageProps) {
  const { user } = useAuth();
  const [ranked, setRanked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>('national');
  const [userVehicle, setUserVehicle] = useState<{ id: string; make: string | null; model: string | null; state: string | null } | null>(null);
  const [initDone, setInitDone] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  // Load user's top claimed vehicle for scope defaults
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
        }
        setInitDone(true);
      });
  }, [user]);

  const loadRankings = useCallback(async () => {
    if (!initDone) return;
    setLoading(true);
    setFallbackReason(null);

    // PLATE: hidden — public surface
    let query = supabase
      .from('vehicles')
      .select(VEHICLE_PUBLIC_COLUMNS)
      .gt('reputation_score', 0)
      .order('reputation_score', { ascending: false })
      .limit(50);

    let effectiveScope = scope;

    if (scope === 'your-model') {
      if (userVehicle?.make && userVehicle?.model) {
        query = query.eq('make', userVehicle.make).eq('model', userVehicle.model);
      } else {
        effectiveScope = 'national';
        setFallbackReason('Claim a vehicle to see how your model ranks against its peers.');
      }
    } else if (scope === 'city' || scope === 'state') {
      if (userVehicle?.state) {
        query = query.eq('state', userVehicle.state);
      } else {
        effectiveScope = 'national';
        setFallbackReason('Vehicle location not set. Showing national rankings.');
      }
    }

    const { data } = await query;
    if (data) setRanked(data);
    setLoading(false);
  }, [scope, userVehicle, initDone]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  // Header context
  const scopeSubtitle = scope === 'your-model' && userVehicle?.make && userVehicle?.model
    ? `${userVehicle.make} ${userVehicle.model} ranked against exact peers`
    : scope === 'city' && userVehicle?.state ? `Vehicles in ${userVehicle.state}`
    : scope === 'state' && userVehicle?.state ? `Statewide · ${userVehicle.state}`
    : 'All vehicles across MotoRate';

  // Find user's position in the list
  const userRankIndex = userVehicle ? ranked.findIndex(v => v.id === userVehicle.id) : -1;

  return (
    <Layout currentPage="rankings" onNavigate={onNavigate}>
      <div style={{ background: '#030508', minHeight: '100vh', paddingBottom: 88 }}>

        {/* ── HEADER ── */}
        <div style={{ padding: '52px 18px 14px', background: '#070a0f' }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700, color: '#eef4f8', lineHeight: 1, marginBottom: 4 }}>
            Top <span style={{ color: '#F97316' }}>Vehicles</span>
          </div>
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', lineHeight: 1.4 }}>
            {scopeSubtitle}
          </div>
        </div>

        {/* ── SCOPE TABS ── */}
        <div style={{ display: 'flex', background: '#070a0f', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {SCOPE_TABS.map(({ key, label }) => {
            const isOn = scope === key;
            return (
              <button key={key} onClick={() => setScope(key)}
                style={{
                  flex: 1, padding: '11px 0', textAlign: 'center' as const,
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                  color: isOn ? '#F97316' : '#5a6e7e',
                  background: isOn ? 'rgba(249,115,22,0.06)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderBottom: isOn ? '2px solid #F97316' : '2px solid transparent',
                }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* ── FALLBACK NOTICE ── */}
        {fallbackReason && (
          <div style={{ padding: '8px 16px', background: 'rgba(249,115,22,0.04)', borderBottom: '1px solid rgba(249,115,22,0.08)' }}>
            <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7a8e9e' }}>{fallbackReason}</span>
          </div>
        )}

        {/* ── USER'S POSITION (pinned) ── */}
        {!loading && userRankIndex >= 0 && userRankIndex >= 5 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
            background: 'rgba(249,115,22,0.06)', borderBottom: '1px solid rgba(249,115,22,0.12)',
          }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#F97316' }}>
              Your Position
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: '#eef4f8', fontVariantNumeric: 'tabular-nums' }}>
              #{userRankIndex + 1}
            </span>
            <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#5a6e7e' }}>
              {[ranked[userRankIndex]?.make, ranked[userRankIndex]?.model].filter(Boolean).join(' ')}
            </span>
            <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: '#F97316', fontVariantNumeric: 'tabular-nums' }}>
              {(ranked[userRankIndex]?.reputation_score ?? 0).toLocaleString()} RP
            </span>
          </div>
        )}

        {/* ── RANKED LIST ── */}
        {!loading && ranked.map((v, i) => {
          const rank = i + 1;
          const isTop3 = rank <= 3;
          const photoUrl = v.profile_image_url || v.stock_image_url;
          const repScore = v.reputation_score ?? 0;
          const spotsCount = v.spots_count ?? 0;
          const isUserVehicle = userVehicle && v.id === userVehicle.id;

          // Top 1 row — larger image, stronger emphasis
          if (rank === 1) {
            return (
              <div key={v.id}
                onClick={() => onNavigate('vehicle-detail', { vehicleId: v.id })}
                style={{
                  position: 'relative', cursor: 'pointer',
                  background: 'rgba(249,115,22,0.03)',
                  borderBottom: '1px solid rgba(249,115,22,0.08)',
                }}>
                {/* Wider image */}
                <div style={{ position: 'relative', width: '100%', height: 140, overflow: 'hidden', background: '#0d1117' }}>
                  {photoUrl ? (
                    <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65, display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1e2a38" strokeWidth="1"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17H3v-6l2-5h9l4 5h3v6h-2"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.9) 0%, transparent 60%)' }} />
                  {/* Rank badge */}
                  <div style={{ position: 'absolute', top: 10, left: 14, width: 32, height: 32, borderRadius: 6, background: '#f0a030', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#030508' }}>1</span>
                  </div>
                  {isUserVehicle && (
                    <div style={{ position: 'absolute', top: 12, right: 14, padding: '3px 8px', borderRadius: 4, background: 'rgba(249,115,22,0.20)', border: '1px solid rgba(249,115,22,0.35)' }}>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316' }}>You</span>
                    </div>
                  )}
                  {/* Vehicle info */}
                  <div style={{ position: 'absolute', bottom: 10, left: 14, right: 14 }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316', marginBottom: 1 }}>
                      {v.make || 'Unknown'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
                        {v.model || '—'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, color: '#F97316', fontVariantNumeric: 'tabular-nums' }}>{repScore.toLocaleString()}</span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(249,115,22,0.6)' }}>RP</span>
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, color: '#5a6e7e', letterSpacing: '0.08em', marginTop: 2 }}>
                      {[v.year, v.trim, spotsCount > 0 ? `${spotsCount} spots` : null].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Rows 2+ — standard list rows with stronger top-3 treatment
          return (
            <div key={v.id}
              onClick={() => onNavigate('vehicle-detail', { vehicleId: v.id })}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: isTop3 ? '14px 16px' : '12px 16px',
                borderBottom: '1px solid rgba(249,115,22,0.05)',
                background: isUserVehicle ? 'rgba(249,115,22,0.05)' : isTop3 ? 'rgba(249,115,22,0.02)' : 'transparent',
                cursor: 'pointer',
              }}>
              {/* Rank badge */}
              <div style={{
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, borderRadius: 4,
                ...(rank === 2 ? { background: '#9aaebc' }
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

              {/* Vehicle thumb — larger for top 3 */}
              <div style={{
                width: isTop3 ? 56 : 52, height: isTop3 ? 42 : 38, borderRadius: 5, overflow: 'hidden',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 700,
                    color: '#eef4f8', lineHeight: 1,
                    whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {[v.make, v.model].filter(Boolean).join(' ') || '\u2014'}
                  </span>
                  {isUserVehicle && (
                    <span style={{ flexShrink: 0, padding: '1px 5px', borderRadius: 3, background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.30)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#F97316' }}>You</span>
                  )}
                </div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5a6e7e', marginTop: 2,
                }}>
                  {[v.year, v.trim, v.state, spotsCount > 0 ? `${spotsCount} spots` : null].filter(Boolean).join(' \u00B7 ')}
                </div>
              </div>

              {/* Score */}
              <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600,
                  color: rank === 1 ? '#F97316' : '#eef4f8', fontVariantNumeric: 'tabular-nums',
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
            {/* Top slot shimmer */}
            <div style={{ width: '100%', height: 140, background: 'linear-gradient(90deg, #0d1117 25%, #111720 50%, #0d1117 75%)', backgroundSize: '200% 100%', animation: 'rankShimmer 1.5s infinite' }} />
            {[1,2,3,4].map(i => (
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
            <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', marginBottom: 6 }}>
              {scope === 'your-model' ? 'No Peers Ranked Yet' : 'No Vehicles Ranked Yet'}
            </p>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e', lineHeight: 1.5, marginBottom: 20 }}>
              {scope === 'your-model'
                ? `No other ${userVehicle?.make || ''} ${userVehicle?.model || ''} builds have been spotted yet. Be the first to climb.`
                : 'Spot vehicles to start building the leaderboard.'}
            </p>
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

      <style>{`
        @keyframes rankShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </Layout>
  );
}
