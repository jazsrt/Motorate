import { Trophy } from 'lucide-react';

interface RepHeroCardProps {
  score: number;
}

const TIERS = [
  { name: 'Rookie',     min: 0 },
  { name: 'Prospect',   min: 100 },
  { name: 'Contender',  min: 300 },
  { name: 'Competitor', min: 600 },
  { name: 'Veteran',    min: 1000 },
  { name: 'Expert',     min: 2000 },
  { name: 'Master',     min: 3500 },
  { name: 'Legend',     min: 5500 },
  { name: 'Icon',       min: 8000 },
];

function getTier(score: number) {
  let current = TIERS[0];
  let nextMin = TIERS[1]?.min ?? current.min;

  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (score >= TIERS[i].min) {
      current = TIERS[i];
      nextMin = TIERS[i + 1]?.min ?? current.min;
      break;
    }
  }

  const range = nextMin - current.min;
  const progress = range > 0 ? Math.min(((score - current.min) / range) * 100, 100) : 100;

  return { name: current.name, progress, nextMin, isMax: current.name === 'Icon' };
}

export function RepHeroCard({ score }: RepHeroCardProps) {
  const tier = getTier(score);

  return (
    <div className="card-v3 px-4 py-3 flex items-center gap-4">
      {/* Score */}
      <div className="flex-shrink-0">
        <span
          className="font-mono font-bold"
          style={{ fontSize: '28px', color: 'var(--orange)', lineHeight: 1 }}
        >
          {score.toLocaleString()}
        </span>
      </div>

      {/* Tier + Progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="font-bold uppercase"
            style={{ fontSize: '12px', color: 'var(--t2)', letterSpacing: '2px' }}
          >
            {tier.name}
          </span>
          {!tier.isMax && (
            <span style={{ fontSize: '10px', color: 'var(--t4)' }}>
              {tier.nextMin.toLocaleString()} next
            </span>
          )}
        </div>
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: '6px', background: 'var(--s3)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${tier.progress}%`,
              background: 'linear-gradient(90deg, var(--orange), var(--accent-2))',
            }}
          />
        </div>
      </div>

      {/* Icon */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: 'var(--orange-dim)',
          border: '1px solid var(--orange-muted)',
        }}
      >
        <Trophy className="w-5 h-5" strokeWidth={1.5} style={{ color: 'var(--orange)' }} />
      </div>
    </div>
  );
}
