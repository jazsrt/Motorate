/**
 * CRITICAL: These are the EXACT colors from requirements - DO NOT CHANGE
 */
export const BADGE_TIER_COLORS = {
  Bronze: {
    hex: '#CD7F32',
    border: '#CD7F32',
    bg: 'rgba(205, 127, 50, 0.1)',
    text: '#CD7F32',
    glow: 'none',
    gradient: 'from-[#F97316] to-[#fb923c]'
  },
  Silver: {
    hex: '#C0C0C0',
    border: '#C0C0C0',
    bg: 'rgba(192, 192, 192, 0.1)',
    text: '#C0C0C0',
    glow: 'none',
    gradient: 'from-gray-300 to-gray-500'
  },
  Gold: {
    hex: '#f0a030',
    border: '#f0a030',
    bg: 'rgba(240, 160, 48, 0.12)',
    text: '#f0a030',
    glow: '0 0 10px rgba(240, 160, 48, 0.4)',
    gradient: 'from-yellow-400 to-yellow-600'
  },
  Platinum: {
    hex: '#f5cc55',
    border: '#f5cc55',
    bg: 'rgba(240, 160, 48, 0.18)',
    text: '#f5cc55',
    glow: '0 0 20px rgba(245, 204, 85, 0.6)',
    gradient: 'from-slate-200 to-slate-400'
  }
} as const;

export type BadgeTier = keyof typeof BADGE_TIER_COLORS;

/** Compact tier colors for inline badge chips (vehicle badges, rankings, fleet tiles) */
export const TIER_COLORS = {
  Platinum: { bg: 'rgba(240,160,48,0.18)', border: 'rgba(240,160,48,0.55)', text: '#f5cc55' },
  Gold:     { bg: 'rgba(240,160,48,0.12)', border: 'rgba(240,160,48,0.4)',  text: '#f0a030' },
  Silver:   { bg: 'rgba(154,176,192,0.1)',  border: 'rgba(154,176,192,0.3)', text: '#9ab0c0' },
  Bronze:   { bg: 'rgba(192,120,64,0.1)',   border: 'rgba(192,120,64,0.3)',  text: '#c07840' },
};

export const BADGE_TIER_THRESHOLDS: Record<string, { Bronze: number; Silver: number; Gold: number; Platinum: number }> = {
  'content-creator': { Bronze: 1,   Silver: 10,  Gold: 50,  Platinum: 150  },
  'commenter':       { Bronze: 1,   Silver: 25,  Gold: 100, Platinum: 500  },
  'reactor':         { Bronze: 1,   Silver: 50,  Gold: 200, Platinum: 1000 },
  'popular':         { Bronze: 10,  Silver: 100, Gold: 500, Platinum: 2000 },
  'followers':       { Bronze: 5,   Silver: 25,  Gold: 100, Platinum: 500  },
  'helpful':         { Bronze: 5,   Silver: 25,  Gold: 100, Platinum: 500  },
  'photographer':    { Bronze: 1,   Silver: 10,  Gold: 50,  Platinum: 200  },
  'builder':         { Bronze: 1,   Silver: 5,   Gold: 20,  Platinum: 50   },
  'spotter':         { Bronze: 1,   Silver: 10,  Gold: 50,  Platinum: 200  },
  'reviewer':        { Bronze: 1,   Silver: 10,  Gold: 50,  Platinum: 200  },
  'Modification':    { Bronze: 1,   Silver: 5,   Gold: 20,  Platinum: 50   },
};
