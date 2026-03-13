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
    <div className="card-v3 mx-4 mb-4 stg p-4 card-lift">
      <div className="relative flex flex-col items-center justify-center">
        <svg viewBox="0 0 180 100" className="w-full max-w-[220px]">
          <path
            d="M 15 90 A 75 75 0 0 1 165 90"
            style={{ fill: 'none', stroke: 'var(--s3)', strokeWidth: 6, strokeLinecap: 'round' }}
          />
          <path
            ref={fillRef}
            d="M 15 90 A 75 75 0 0 1 165 90"
            style={{
              fill: 'none',
              stroke: 'var(--orange)',
              strokeWidth: 6,
              strokeLinecap: 'round',
              strokeDasharray: totalArc,
              strokeDashoffset: totalArc,
              transition: 'stroke-dashoffset 1.5s cubic-bezier(.22,.68,0,1.2)',
              filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.3))',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className="font-mono text-2xl font-bold text-primary rep-score">
            {score.toLocaleString()}
          </span>
          <span className="text-[10px] text-tertiary mt-0.5">Reputation</span>
          <span className="text-[10px] font-medium mt-0.5" style={{ color: '#F97316' }}>{tierName}</span>
        </div>
      </div>
    </div>
  );
}
