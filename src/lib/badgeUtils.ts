export type BadgeDisplayType = 'prestige' | 'milestone' | 'identity';

export function getBadgeType(badge: { category?: string | null; tier?: string | null }): BadgeDisplayType {
  const cat = (badge.category ?? '').toLowerCase();
  const t = (badge.tier ?? '').toLowerCase();
  if (cat.includes('rank') || cat.includes('leader') || cat.includes('top') || t === 'platinum' || t === 'gold') return 'prestige';
  if (cat.includes('identity') || cat.includes('build') || cat.includes('mod') || cat === 'builder') return 'identity';
  return 'milestone';
}

export function getBadgeImagePath(badge: {
  badge_group?: string | null;
  tier?: string | null;
}): string | undefined {
  if (!badge.badge_group || !badge.tier) return undefined;
  const group = badge.badge_group.toLowerCase().replace(/_/g, '-');
  const t = badge.tier.toLowerCase() === 'plat' ? 'platinum' : badge.tier.toLowerCase();
  return `/badges/${group}-${t}.png`;
}
