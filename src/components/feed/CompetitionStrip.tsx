import { useRef } from 'react';

const TICKER_ITEMS = [
  { dot: '#F97316', text: <>Ferrari 488 climbed to <b style={{ color: '#F97316' }}>#4</b> in <em style={{ fontStyle: 'normal', color: '#eef4f8' }}>Chicago</em></> },
  { dot: '#20c060', text: <>New plate discovered in <em style={{ fontStyle: 'normal', color: '#eef4f8' }}>Miami</em></> },
  { dot: '#F97316', text: <>Lamborghini Huracán entered <b style={{ color: '#F97316' }}>Top 10</b></> },
  { dot: '#3888ee', text: <><b style={{ color: '#eef4f8' }}>@SpeedKingChi</b> earned <em style={{ fontStyle: 'normal', color: '#3888ee' }}>City King</em> badge</> },
  { dot: '#F97316', text: <>Porsche GT3 · <b style={{ color: '#F97316' }}>500 spots</b> milestone</> },
  { dot: '#20c060', text: <>Hellcat <em style={{ fontStyle: 'normal', color: '#eef4f8' }}>trending</em> in Chicago</> },
];

export function CompetitionStrip() {
  const trackRef = useRef<HTMLDivElement>(null);

  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]; // duplicate for seamless loop

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
      {/* Fade edges */}
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
