import { useState, useEffect } from 'react';

interface StatGaugeProps {
  value: number;
  max: number;
  label: string;
  icon: React.ReactNode;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function StatGauge({ value, max, label, icon, color, size = 'md', onClick }: StatGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  const percentage = Math.min((animatedValue / max) * 100, 100);
  const angle = -210 + (percentage / 100) * 240;

  const autoColor = color || (
    percentage >= 80 ? 'text-green-400' :
    percentage >= 60 ? 'text-accent-primary' :
    percentage >= 40 ? 'text-yellow-400' :
    percentage >= 20 ? 'text-orange-400' :
    'text-red-400'
  );

  const sizes = {
    sm: { svg: 80, needle: 30, text: 'text-lg', label: 'text-[10px]' },
    md: { svg: 120, needle: 45, text: 'text-2xl', label: 'text-xs' },
    lg: { svg: 160, needle: 60, text: 'text-3xl', label: 'text-sm' }
  };

  const s = sizes[size];
  const centerX = s.svg / 2;
  const centerY = s.svg / 2;
  const radius = s.svg / 2 - 10;

  const polarToCartesian = (angle: number, r: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: centerX + r * Math.cos(rad),
      y: centerY + r * Math.sin(rad)
    };
  };

  const startAngle = -210;
  const endAngle = 30;
  const start = polarToCartesian(startAngle, radius);
  const end = polarToCartesian(endAngle, radius);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  const arcPath = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;

  const needleEnd = polarToCartesian(angle, s.needle);

  const isClickable = !!onClick;

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={`relative bg-surface border border-surfacehighlight rounded-lg p-3 flex flex-col items-center transition-all ${
        isClickable
          ? 'hover:border-accent-primary/50 hover:bg-surfacehighlight cursor-pointer active:scale-95'
          : 'hover:border-accent-primary/30'
      }`}
    >
      <div className={`${autoColor} mb-1`}>{icon}</div>

      <svg width={s.svg} height={s.svg * 0.65} viewBox={`0 0 ${s.svg} ${s.svg * 0.65}`} className="mb-1">
        <defs>
          <linearGradient id={`gauge-gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#aa5a5a" />
            <stop offset="25%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>

        <path
          d={arcPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-surfacehighlight"
          strokeLinecap="round"
        />

        <path
          d={arcPath}
          fill="none"
          stroke={`url(#gauge-gradient-${label})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(percentage / 100) * 300} 300`}
          className="transition-all duration-1000"
        />

        {[0, 25, 50, 75, 100].map((tick) => {
          const tickAngle = -210 + (tick / 100) * 240;
          const tickStart = polarToCartesian(tickAngle, radius - 12);
          const tickEnd = polarToCartesian(tickAngle, radius - 4);
          return (
            <line
              key={tick}
              x1={tickStart.x}
              y1={tickStart.y}
              x2={tickEnd.x}
              y2={tickEnd.y}
              stroke="currentColor"
              strokeWidth="2"
              className="text-surfacehighlight"
            />
          );
        })}

        <line
          x1={centerX}
          y1={centerY}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className={`${autoColor} transition-all duration-1000`}
          style={{
            transformOrigin: `${centerX}px ${centerY}px`
          }}
        />

        <circle
          cx={centerX}
          cy={centerY}
          r="4"
          fill="currentColor"
          className={autoColor}
        />
      </svg>

      <div className={`${s.text} font-bold ${autoColor} transition-all duration-1000`}>
        {animatedValue}
      </div>

      <div className={`${s.label} uppercase tracking-wide text-secondary font-semibold`}>
        {label}
      </div>
    </button>
  );
}
