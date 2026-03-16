export function getBadgeImagePath(badge: {
  badge_group?: string | null;
  tier?: string | null;
}): string | undefined {
  if (!badge.badge_group || !badge.tier) return undefined;
  const t = badge.tier.toLowerCase() === 'plat' ? 'platinum' : badge.tier.toLowerCase();
  return `/badges/${badge.badge_group}-${t}.png`;
}
