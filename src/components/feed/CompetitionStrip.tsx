import { useRef, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface TickerItem {
  dot: string;
  text: React.ReactNode;
}

const FALLBACK_ITEMS: TickerItem[] = [
  { dot: '#F97316', text: <>Spot vehicles to see <b style={{ color: '#F97316' }}>live activity</b> here</> },
  { dot: '#20c060', text: <>New plates discovered <em style={{ fontStyle: 'normal', color: '#eef4f8' }}>every day</em></> },
  { dot: '#3888ee', text: <>Earn badges by <em style={{ fontStyle: 'normal', color: '#3888ee' }}>spotting</em> and <em style={{ fontStyle: 'normal', color: '#3888ee' }}>reviewing</em></> },
];

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cachedItems: TickerItem[] | null = null;
let cacheTimestamp = 0;

async function fetchTickerItems(): Promise<TickerItem[]> {
  const now = Date.now();
  if (cachedItems && now - cacheTimestamp < CACHE_TTL) return cachedItems;

  const items: TickerItem[] = [];

  try {
    // Recent spots
    const { data: spots } = await supabase
      .from('spot_history')
      .select('vehicle_id, vehicles:vehicle_id(make, model)')
      .order('created_at', { ascending: false })
      .limit(4);

    if (spots) {
      for (const s of spots) {
        const v = Array.isArray(s.vehicles) ? s.vehicles[0] : s.vehicles;
        if (v?.make && v?.model) {
          items.push({
            dot: '#20c060',
            text: <><b style={{ color: '#eef4f8' }}>{v.make} {v.model}</b> spotted</>,
          });
        }
      }
    }

    // Top ranked vehicles
    const { data: ranked } = await supabase
      .from('vehicles')
      .select('make, model, reputation_score')
      .gt('reputation_score', 0)
      .order('reputation_score', { ascending: false })
      .limit(3);

    if (ranked) {
      ranked.forEach((v, i) => {
        if (v.make && v.model) {
          items.push({
            dot: '#F97316',
            text: <>{v.make} {v.model} ranked <b style={{ color: '#F97316' }}>#{i + 1}</b> · {v.reputation_score} RP</>,
          });
        }
      });
    }

    // Recent badge unlocks — separate queries to avoid FK join issues
    const { data: recentBadges } = await supabase
      .from('user_badges')
      .select('badge_id, user_id')
      .order('earned_at', { ascending: false })
      .limit(3);

    if (recentBadges && recentBadges.length > 0) {
      const badgeIds = [...new Set(recentBadges.map(b => b.badge_id))];
      const userIds = [...new Set(recentBadges.map(b => b.user_id))];

      const [{ data: badgeNames }, { data: profileNames }] = await Promise.all([
        supabase.from('badges').select('id, name').in('id', badgeIds),
        supabase.from('profiles').select('id, handle').in('id', userIds),
      ]);

      const badgeMap = new Map((badgeNames || []).map(b => [b.id, b.name]));
      const profileMap = new Map((profileNames || []).map(p => [p.id, p.handle]));

      for (const b of recentBadges) {
        const name = badgeMap.get(b.badge_id);
        const handle = profileMap.get(b.user_id);
        if (name && handle) {
          items.push({
            dot: '#3888ee',
            text: <><b style={{ color: '#eef4f8' }}>@{handle}</b> earned <em style={{ fontStyle: 'normal', color: '#3888ee' }}>{name}</em></>,
          });
        }
      }
    }
  } catch {
    // Fall through to fallback
  }

  const result = items.length >= 3 ? items : FALLBACK_ITEMS;
  cachedItems = result;
  cacheTimestamp = now;
  return result;
}

export function CompetitionStrip() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [tickerItems, setTickerItems] = useState<TickerItem[]>(FALLBACK_ITEMS);

  useEffect(() => {
    fetchTickerItems().then(setTickerItems);
  }, []);

  const items = [...tickerItems, ...tickerItems]; // duplicate for seamless loop

  return (
    <div
      style={{
        height: 32,
        background: 'rgba(6,9,14,0.98)',
        borderBottom: '1px solid rgba(249,115,22,0.14)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
      onMouseEnter={() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'paused'; }}
      onMouseLeave={() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'running'; }}
    >
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: '0 16px',
          whiteSpace: 'nowrap',
          animation: 'ticker 20s linear infinite',
        }}
      >
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#7a8e9e',
          }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
            <span>{item.text}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
