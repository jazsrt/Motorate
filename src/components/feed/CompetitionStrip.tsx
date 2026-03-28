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

    // Recent badge unlocks
    const { data: badges } = await supabase
      .from('user_badges')
      .select('badge_id, badges:badge_id(name), user_id, profiles:user_id(handle)')
      .order('earned_at', { ascending: false })
      .limit(3);

    if (badges) {
      for (const b of badges) {
        const badge = Array.isArray(b.badges) ? b.badges[0] : b.badges;
        const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
        if (badge?.name && profile?.handle) {
          items.push({
            dot: '#3888ee',
            text: <><b style={{ color: '#eef4f8' }}>@{profile.handle}</b> earned <em style={{ fontStyle: 'normal', color: '#3888ee' }}>{badge.name}</em></>,
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
        height: 34,
        background: 'rgba(6,9,14,0.98)',
        borderBottom: '1px solid rgba(249,115,22,0.18)',
        overflow: 'hidden',
        position: 'relative',
      }}
      onMouseEnter={() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'paused'; }}
      onMouseLeave={() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'running'; }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 32, zIndex: 2, background: 'linear-gradient(to right, rgba(6,9,14,0.98), transparent)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 32, zIndex: 2, background: 'linear-gradient(to left, rgba(6,9,14,0.98), transparent)', pointerEvents: 'none' }} />

      <div
        ref={trackRef}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: '100%',
          whiteSpace: 'nowrap',
          animation: 'motorate-ticker 28s linear infinite',
        }}
      >
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '0 16px',
            borderRight: '1px solid rgba(255,255,255,0.04)',
            height: '100%',
          }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7a8e9e' }}>
              {item.text}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes motorate-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
