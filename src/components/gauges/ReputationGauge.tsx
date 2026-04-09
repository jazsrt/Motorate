import { useEffect, useRef } from 'react';

interface ReputationGaugeProps {
  score: number;
  maxScore?: number;
  tierName: string;
}

export function ReputationGauge({ score, maxScore = 10000, tierName }: ReputationGaugeProps) {
  const fillRef = useRef<SVGPathElement>(null);
  const totalArc = 236;
  const pct = Math.min(score / maxScore, 1);
  const targetOffset = totalArc - (totalArc * pct);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    el.style.strokeDashoffset = String(totalArc);
    const timeout = setTimeout(() => {
      el.style.strokeDashoffset = String(targetOffset);
    }, 300);
    return () => clearTimeout(timeout);
  }, [targetOffset]);

  return (
    <div style={{ margin: '0 16px 16px', padding: 16 }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 180 100" style={{ width: '100%', maxWidth: 220 }}>
          <path
            d="M 15 90 A 75 75 0 0 1 165 90"
            style={{ fill: 'none', stroke: '#0e1320', strokeWidth: 6, strokeLinecap: 'round' }}
          />
          <path
            ref={fillRef}
            d="M 15 90 A 75 75 0 0 1 165 90"
            style={{
              fill: 'none',
              stroke: '#F97316',
              strokeWidth: 6,
              strokeLinecap: 'round',
              strokeDasharray: totalArc,
              strokeDashoffset: totalArc,
              transition: 'stroke-dashoffset 1.5s cubic-bezier(.22,.68,0,1.2)',
              filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.3))',
            }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8,
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 700,
            color: '#eef4f8', lineHeight: 1,
          }}>
            {score.toLocaleString()}
          </span>
          <span style={{ fontSize: 10, color: '#5a6e7e', marginTop: 2 }}>Reputation</span>
          <span style={{ fontSize: 10, fontWeight: 600, marginTop: 2, color: '#F97316' }}>{tierName}</span>
        </div>
      </div>
    </div>
  );
}
