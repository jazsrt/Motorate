import { useEffect, useRef } from 'react';

interface ArcGaugeProps {
  value: number;
  max: number;
  label: string;
  format?: 'number' | 'decimal';
  color?: 'orange' | 'steel' | 'gold';
  size?: 'sm' | 'md' | 'lg';
}

const COLOR_MAP = {
  orange: 'var(--orange)',
  steel: 'var(--steel)',
  gold: 'var(--gold-h)',
};

export function ArcGauge({ value, max, label, format = 'number', color = 'orange', size = 'md' }: ArcGaugeProps) {
  const fillRef = useRef<SVGPathElement>(null);
  const totalArcLength = 82;
  const fillPct = Math.min(value / max, 1);
  const offset = totalArcLength - (totalArcLength * fillPct);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    el.style.strokeDashoffset = String(totalArcLength);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.strokeDashoffset = String(offset);
      });
    });
  }, [offset]);

  const displayValue = format === 'decimal' ? value.toFixed(1) : String(value);

  const sizeClasses = {
    sm: 'w-16',
    md: 'w-20',
    lg: 'w-24',
  };

  return (
    <div className={`flex flex-col items-center gap-1 ${sizeClasses[size]}`}>
      <svg className="w-full h-auto" viewBox="0 0 64 36">
        <path
          className="gauge-track"
          d="M 6 34 A 26 26 0 0 1 58 34"
          style={{ fill: 'none', stroke: 'var(--s3)', strokeWidth: 4, strokeLinecap: 'round' }}
        />
        <path
          ref={fillRef}
          d="M 6 34 A 26 26 0 0 1 58 34"
          style={{
            fill: 'none',
            stroke: COLOR_MAP[color],
            strokeWidth: 4,
            strokeLinecap: 'round',
            strokeDasharray: totalArcLength,
            strokeDashoffset: totalArcLength,
            transition: 'stroke-dashoffset 1.2s cubic-bezier(.22,.68,0,1.2)',
          }}
        />
      </svg>
      <span className="font-mono text-sm font-semibold text-primary" style={{ marginTop: '-4px' }}>
        {displayValue}
      </span>
      <span className="text-[9px] uppercase tracking-[2px] text-quaternary font-medium">
        {label}
      </span>
    </div>
  );
}
