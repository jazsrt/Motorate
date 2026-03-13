import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface DigitalDisplayProps {
  value: number | string;
  label: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'rep' | 'driver' | 'cool' | 'blue' | 'purple';
  size?: 'sm' | 'md';
}

const colorMap = {
  rep: {
    text: '#5aaa7a',
    glow: 'rgba(16, 185, 129, 0.6)',
    bg: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.15), transparent)',
  },
  driver: {
    text: '#F97316',
    glow: 'rgba(249, 115, 22, 0.6)',
    bg: 'radial-gradient(circle at center, rgba(249, 115, 22, 0.15), transparent)',
  },
  cool: {
    text: '#fb923c',
    glow: 'rgba(251, 146, 60, 0.6)',
    bg: 'radial-gradient(circle at center, rgba(251, 146, 60, 0.15), transparent)',
  },
  blue: {
    text: '#fb923c',
    glow: 'rgba(251, 146, 60, 0.6)',
    bg: 'radial-gradient(circle at center, rgba(251, 146, 60, 0.15), transparent)',
  },
  purple: {
    text: '#fb923c',
    glow: 'rgba(251, 146, 60, 0.6)',
    bg: 'radial-gradient(circle at center, rgba(251, 146, 60, 0.15), transparent)',
  },
};

const sizeMap = {
  sm: {
    value: 'text-2xl',
    label: 'text-xs',
    padding: 'p-3',
    iconSize: 16,
  },
  md: {
    value: 'text-4xl',
    label: 'text-sm',
    padding: 'p-4',
    iconSize: 20,
  },
};

export function DigitalDisplay({
  value,
  label,
  icon: Icon,
  trend,
  trendValue,
  color = 'rep',
  size = 'md',
}: DigitalDisplayProps) {
  const colors = colorMap[color];
  const sizes = sizeMap[size];

  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const trendColor =
    trend === 'up' ? '#5aaa7a' : trend === 'down' ? '#aa5a5a' : '#6b7280';

  return (
    <div
      className={`bg-surface border border-surfacehighlight rounded-xl ${sizes.padding} relative overflow-hidden`}
      style={{ background: colors.bg }}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="text-secondary" size={sizes.iconSize} />}
            <span
              className={`${sizes.label} font-medium text-secondary uppercase tracking-wider`}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {label}
            </span>
          </div>
          {trend && trendValue && (
            <div className="flex items-center gap-1" style={{ color: trendColor }}>
              <TrendIcon size={14} />
              <span className="text-xs font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {trendValue}
              </span>
            </div>
          )}
        </div>

        <div
          className={`${sizes.value} font-bold tracking-tight`}
          style={{
            color: colors.text,
            fontFamily: 'Space Grotesk, sans-serif',
            textShadow: `0 0 20px ${colors.glow}, 0 0 10px ${colors.glow}`,
          }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
      </div>

      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255, 255, 255, 0.03) 2px,
            rgba(255, 255, 255, 0.03) 4px
          )`,
        }}
      />
    </div>
  );
}
