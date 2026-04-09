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
    <div style={{
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16,
      background: '#0a0d14', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Score */}
      <div style={{ flexShrink: 0 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
          fontSize: 28, color: '#F97316', lineHeight: 1,
        }}>
          {score.toLocaleString()}
        </span>
      </div>

      {/* Tier + Progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{
            fontWeight: 700, textTransform: 'uppercase' as const,
            fontSize: 12, color: '#7a8e9e', letterSpacing: 2,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>
            {tier.name}
          </span>
          {!tier.isMax && (
            <span style={{ fontSize: 10, color: '#3a4e60' }}>
              {tier.nextMin.toLocaleString()} next
            </span>
          )}
        </div>
        <div style={{
          width: '100%', borderRadius: 3, overflow: 'hidden',
          height: 6, background: '#0e1320',
        }}>
          <div style={{
            height: '100%', borderRadius: 3,
            transition: 'width 0.5s ease',
            width: `${tier.progress}%`,
            background: 'linear-gradient(90deg, #F97316, #f0a030)',
          }} />
        </div>
      </div>

      {/* Icon */}
      <div style={{
        flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)',
      }}>
        <Trophy style={{ width: 20, height: 20, color: '#F97316' }} strokeWidth={1.5} />
      </div>
    </div>
  );
}
