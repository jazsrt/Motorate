export const REPUTATION_TIERS = [
  { name: 'Permit',        min: 0,      max: 499    },
  { name: 'Learner',       min: 500,    max: 1499   },
  { name: 'Licensed',      min: 1500,   max: 3999   },
  { name: 'Registered',    min: 4000,   max: 7999   },
  { name: 'Certified',     min: 8000,   max: 14999  },
  { name: 'Endorsed',      min: 15000,  max: 24999  },
  { name: 'Authority',     min: 25000,  max: 39999  },
  { name: 'Distinguished', min: 40000,  max: 59999  },
  { name: 'Elite',         min: 60000,  max: 84999  },
  { name: 'Sovereign',     min: 85000,  max: 119999 },
  { name: 'Iconic',        min: 120000, max: Infinity },
] as const;

export function getTierFromScore(score: number | null | undefined): string {
  if (score == null || score < 0) return 'Permit';
  const tier = REPUTATION_TIERS.find(t => score >= t.min && score <= t.max);
  return tier?.name ?? 'Permit';
}
