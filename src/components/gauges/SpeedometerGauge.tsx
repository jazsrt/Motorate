import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface SpeedometerGaugeProps {
  value: number;
  max: number;
  label: string;
  color?: 'rep' | 'driver' | 'cool';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
}

const colorMap = {
  rep: {
    arc: '#5aaa7a',
    needle: '#059669',
    glow: 'rgba(16, 185, 129, 0.3)',
  },
  driver: {
    arc: '#F97316',
    needle: '#F97316',
    glow: 'rgba(249, 115, 22, 0.3)',
  },
  cool: {
    arc: '#fb923c',
    needle: '#fb923c',
    glow: 'rgba(251, 146, 60, 0.3)',
  },
};

const sizeMap = {
  sm: { radius: 80, strokeWidth: 8, needleLength: 55, fontSize: '24px', labelSize: '12px' },
  md: { radius: 100, strokeWidth: 10, needleLength: 70, fontSize: '32px', labelSize: '14px' },
  lg: { radius: 120, strokeWidth: 12, needleLength: 85, fontSize: '40px', labelSize: '16px' },
};

export function SpeedometerGauge({
  value,
  max,
  label,
  color = 'rep',
  size = 'md',
  icon: Icon,
}: SpeedometerGaugeProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const colors = colorMap[color];
  const sizes = sizeMap[size];

  const centerX = sizes.radius + 20;
  const centerY = sizes.radius + 20;
  const startAngle = -225;
  const endAngle = 45;
  const totalAngle = endAngle - startAngle;
  const needleAngle = startAngle + (totalAngle * percentage) / 100;

  const polarToCartesian = (angle: number, radius: number) => {
    const angleRad = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(angleRad),
      y: centerY + radius * Math.sin(angleRad),
    };
  };

  const createArc = () => {
    const start = polarToCartesian(startAngle, sizes.radius);
    const end = polarToCartesian(endAngle, sizes.radius);
    return `M ${start.x} ${start.y} A ${sizes.radius} ${sizes.radius} 0 1 1 ${end.x} ${end.y}`;
  };

  const tickMarks = [0, 25, 50, 75, 100].map((tick) => {
    const angle = startAngle + (totalAngle * tick) / 100;
    const inner = polarToCartesian(angle, sizes.radius - sizes.strokeWidth - 5);
    const outer = polarToCartesian(angle, sizes.radius - sizes.strokeWidth - 15);
    return { tick, inner, outer };
  });

  const viewBoxSize = (sizes.radius + 20) * 2;

  return (
    <div className="flex flex-col items-center">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className="max-w-full"
      >
        <defs>
          <filter id={`glow-${color}-${size}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={createArc()}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={sizes.strokeWidth}
          strokeLinecap="round"
        />

        <motion.path
          d={createArc()}
          fill="none"
          stroke={colors.arc}
          strokeWidth={sizes.strokeWidth}
          strokeLinecap="round"
          strokeDasharray="1000"
          strokeDashoffset={1000}
          filter={`url(#glow-${color}-${size})`}
          initial={{ strokeDashoffset: 1000 }}
          animate={{ strokeDashoffset: 1000 - (1000 * percentage) / 100 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />

        {tickMarks.map(({ tick, inner, outer }) => (
          <line
            key={tick}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ))}

        <motion.line
          x1={centerX}
          y1={centerY}
          x2={polarToCartesian(needleAngle, sizes.needleLength).x}
          y2={polarToCartesian(needleAngle, sizes.needleLength).y}
          stroke={colors.needle}
          strokeWidth="3"
          strokeLinecap="round"
          filter={`url(#glow-${color}-${size})`}
          initial={{ rotate: startAngle }}
          animate={{ rotate: needleAngle }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ transformOrigin: `${centerX}px ${centerY}px` }}
        />

        <circle cx={centerX} cy={centerY} r="6" fill={colors.needle} />
        <circle cx={centerX} cy={centerY} r="3" fill="#fff" />

        <text
          x={centerX}
          y={centerY + 30}
          textAnchor="middle"
          fill="#fff"
          fontSize={sizes.fontSize}
          fontFamily="Space Grotesk, sans-serif"
          fontWeight="700"
        >
          {value}
        </text>
      </svg>

      <div className="flex items-center gap-2 mt-2">
        {Icon && <Icon className="w-4 h-4 text-secondary" />}
        <span
          className="text-secondary font-medium"
          style={{ fontSize: sizes.labelSize, fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
