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
  icon_path?: string | null;
  icon_name?: string | null;
}): string | undefined {
  // Prefer explicit icon_path if set
  if (badge.icon_path) return badge.icon_path;
  // Build from badge_group + tier
  if (badge.badge_group && badge.tier) {
    const group = badge.badge_group.toLowerCase().replace(/_/g, '-');
    const t = badge.tier.toLowerCase() === 'plat' ? 'platinum' : badge.tier.toLowerCase();
    return `/badges/${group}-${t}.png`;
  }
  // Fallback to icon_name as a path
  if (badge.icon_name) return `/badges/${badge.icon_name}.png`;
  return undefined;
}
