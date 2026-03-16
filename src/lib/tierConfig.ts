import { REPUTATION_TIERS } from './constants';

export { REPUTATION_TIERS };

const TIER_LIST = Object.values(REPUTATION_TIERS).sort((a, b) => a.min - b.min);

export function getTierFromScore(score: number): { name: string; min: number; nextTier: string | null; nextMin: number | null; progress: number } {
  let current = TIER_LIST[0];
  for (let i = TIER_LIST.length - 1; i >= 0; i--) {
    if (score >= TIER_LIST[i].min) {
      current = TIER_LIST[i];
      const next = TIER_LIST[i + 1] || null;
      const range = next ? next.min - current.min : 1;
      const progress = next ? Math.min(((score - current.min) / range) * 100, 100) : 100;
      return {
        name: current.name,
        min: current.min,
        nextTier: next?.name || null,
        nextMin: next?.min || null,
        progress,
      };
    }
  }
  return { name: current.name, min: current.min, nextTier: TIER_LIST[1]?.name || null, nextMin: TIER_LIST[1]?.min || null, progress: 0 };
}
