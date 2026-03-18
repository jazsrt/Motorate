import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
  light:    '#a8bcc8',
  white:    '#eef4f8',
  accent:   '#F97316',
  accentDim:'rgba(249,115,22,0.11)',
  gold:     '#f0a030',
  green:    '#20c060',
};

interface RankingsPageProps {
  onNavigate: OnNavigate;
}

export function RankingsPage({ onNavigate }: RankingsPageProps) {
  const { user } = useAuth();
  const [ranked, setRanked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'city' | 'state' | 'national' | 'class'>('city');

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vehicles')
      .select('id, make, model, year, plate_number, plate_state, stock_image_url, profile_image_url, owner_id, reputation_score, spots_count')
      .order('reputation_score', { ascending: false })
      .limit(20);
    if (data) setRanked(data);
    setLoading(false);
  };

  return (
    <Layout currentPage="rankings" onNavigate={onNavigate}>
      <div style={{ background: C.black, minHeight: '100vh', paddingBottom: 88 }}>

        {/* ── HEADER ── */}
        <div style={{ padding: '52px 18px 8px', background: `linear-gradient(to bottom, ${C.carbon0} 60%, transparent)` }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 3 }}>
            Chicago Metro
          </div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700, color: C.white, lineHeight: 1 }}>
            Top <em style={{ fontStyle: 'normal', color: C.accent }}>Vehicles</em>
          </div>
        </div>

        {/* ── SCOPE TABS ── */}
        <div style={{ display: 'flex', borderBottom: `1px solid rgba(255,255,255,0.06)`, background: C.carbon0 }}>
          {(['City', 'State', 'National', 'Class'] as const).map((label) => {
            const key = label.toLowerCase() as typeof scope;
            const isOn = scope === key;
            return (
              <button key={label} onClick={() => setScope(key)}
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

        {/* ── PODIUM ── */}
        {!loading && ranked.length >= 3 && (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, padding: '20px 18px 16px', background: C.carbon1 }}>
            {[ranked[1], ranked[0], ranked[2]].map((v, i) => {
              const rank = [2, 1, 3][i];
              const isFirst = rank === 1;
              const photoUrl = v.profile_image_url || v.stock_image_url;
              return (
                <div key={v.id}
                  onClick={() => onNavigate('vehicle-detail', v.id)}
                  style={{
                    flex: isFirst ? '0 0 38%' : '0 0 28%',
                    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
                    cursor: 'pointer',
                  }}>
                  {/* Photo circle */}
                  <div style={{
                    width: isFirst ? 80 : 60, height: isFirst ? 80 : 60,
                    borderRadius: '50%', overflow: 'hidden',
                    border: `2px solid ${rank === 1 ? C.gold : rank === 2 ? C.sub : C.muted}`,
                    background: C.carbon2, marginBottom: 8, flexShrink: 0,
                  }}>
                    {photoUrl ? (
                      <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect width="13" height="8" x="9" y="13" rx="2"/></svg>
                      </div>
                    )}
                  </div>

                  {/* Vehicle name */}
                  <div style={{ textAlign: 'center' as const, marginBottom: 4 }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.accent, marginBottom: 1 }}>
                      {v.make ?? '\u2014'}
                    </div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: isFirst ? 16 : 13, fontWeight: 700, color: C.white, lineHeight: 1 }}>
                      {v.model ?? '\u2014'}
                    </div>
                  </div>

                  {/* RP */}
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: isFirst ? 13 : 11, fontWeight: 600, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>
                    {(v.reputation_score ?? 0).toLocaleString()} RP
                  </div>

                  {/* Rank block */}
                  <div style={{
                    marginTop: 8,
                    width: isFirst ? 44 : 36, height: isFirst ? 44 : 36,
                    background: rank === 1 ? C.gold : rank === 2 ? C.sub : C.muted,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 4,
                  }}>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: isFirst ? 22 : 18, fontWeight: 700, color: C.black }}>
                      {rank}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── FULL RANKINGS HEADER ── */}
        {!loading && ranked.length > 3 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px 8px', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: C.white }}>
              Full Rankings
            </span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.dim }}>
              Chicago
            </span>
          </div>
        )}

        {/* ── RANK ROWS ── */}
        {!loading && ranked.slice(3).map((v, i) => {
          const rank = i + 4;
          const photoUrl = v.profile_image_url || v.stock_image_url;
          return (
            <div key={v.id}
              onClick={() => onNavigate('vehicle-detail', v.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 18px',
                borderBottom: `1px solid rgba(255,255,255,0.03)`,
                cursor: 'pointer',
              }}>
              {/* Rank number */}
              <div style={{
                width: 28, textAlign: 'center' as const, flexShrink: 0,
                fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700,
                color: rank <= 5 ? C.accent : C.dim,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {rank}
              </div>

              {/* Thumbnail */}
              <div style={{ width: 44, height: 34, borderRadius: 5, overflow: 'hidden', background: C.carbon2, flexShrink: 0 }}>
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
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 700, color: C.white, lineHeight: 1, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {[v.make, v.model].filter(Boolean).join(' ') || '\u2014'}
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.dim, marginTop: 2 }}>
                  {[v.year, v.plate_state, v.plate_number].filter(Boolean).join(' \u00B7 ')}
                </div>
              </div>

              {/* Score */}
              <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: C.white, fontVariantNumeric: 'tabular-nums' }}>
                  {(v.reputation_score ?? 0).toLocaleString()}
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.dim, marginTop: 1 }}>
                  RP
                </div>
              </div>
            </div>
          );
        })}

        {/* ── LOADING ── */}
        {loading && (
          <div>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 18px', borderBottom: `1px solid rgba(255,255,255,0.03)`, alignItems: 'center' }}>
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

        {/* ── EMPTY STATE ── */}
        {!loading && ranked.length === 0 && (
          <div style={{ padding: '64px 24px', textAlign: 'center' as const }}>
            <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 8 }}>No Vehicles Ranked Yet</p>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: C.dim }}>Spot vehicles to start building the leaderboard.</p>
          </div>
        )}

      </div>
    </Layout>
  );
}
