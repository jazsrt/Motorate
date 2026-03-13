import { motion } from 'framer-motion';

interface DashLightProps {
  current: number;
  next: number;
  level: number;
  color?: 'rep' | 'driver' | 'cool';
  label?: string;
}

const colorMap = {
  rep: {
    normal: '#5aaa7a',
    warning: '#f59e0b',
    critical: '#aa5a5a',
    glow: 'rgba(16, 185, 129, 0.4)',
  },
  driver: {
    normal: '#F97316',
    warning: '#f59e0b',
    critical: '#aa5a5a',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  cool: {
    normal: '#fb923c',
    warning: '#f59e0b',
    critical: '#aa5a5a',
    glow: 'rgba(251, 146, 60, 0.4)',
  },
};

export function DashLight({ current, next, level, color = 'rep', label }: DashLightProps) {
  const segments = 20;
  const progress = (current / next) * 100;
  const filledSegments = Math.floor((progress / 100) * segments);
  const colors = colorMap[color];

  const getSegmentColor = (index: number) => {
    if (index >= filledSegments) return 'rgba(255, 255, 255, 0.1)';
    const segmentProgress = ((index + 1) / segments) * 100;
    if (segmentProgress > 90) return colors.critical;
    if (segmentProgress > 80) return colors.warning;
    return colors.normal;
  };

  const getSegmentGlow = (index: number) => {
    if (index >= filledSegments) return 'none';
    return `drop-shadow(0 0 4px ${colors.glow})`;
  };

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-secondary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {label}
          </span>
          <span className="text-xs text-secondary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Level {level}
          </span>
        </div>
      )}

      <div className="relative h-8 flex items-center gap-1">
        {Array.from({ length: segments }).map((_, index) => {
          const height = index % 5 === 4 ? 'h-8' : index % 2 === 0 ? 'h-6' : 'h-5';
          return (
            <motion.div
              key={index}
              className={`flex-1 ${height} rounded-sm transition-all`}
              style={{
                backgroundColor: getSegmentColor(index),
                filter: getSegmentGlow(index),
              }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: index < filledSegments ? 1 : 0.3 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-secondary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {current.toLocaleString()} pts
        </span>
        <span className="text-secondary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {next.toLocaleString()} pts
        </span>
      </div>
    </div>
  );
}
