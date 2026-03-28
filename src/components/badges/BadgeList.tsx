import { useState, useRef, useEffect } from 'react';
import { getBadgeIcon } from '../../lib/badgeIcons';
import { BADGE_TIER_COLORS } from '../../config/badgeConfig';

interface Badge {
  id: string;
  name: string;
  icon_name: string;
  tier?: string;
  description?: string;
  level_name?: string;
}

interface BadgeListProps {
  badges: Badge[];
  maxDisplay?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const SIZE_PX = {
  xs: 16,
  sm: 20,
  md: 28,
  lg: 36,
};

const ICON_PX = {
  xs: 10,
  sm: 12,
  md: 16,
  lg: 20,
};

function getTierStyle(tier?: string) {
  const t = (tier || '').toLowerCase();
  if (t === 'platinum') return { colors: BADGE_TIER_COLORS.Platinum, label: 'Platinum' };
  if (t === 'gold') return { colors: BADGE_TIER_COLORS.Gold, label: 'Gold' };
  if (t === 'silver') return { colors: BADGE_TIER_COLORS.Silver, label: 'Silver' };
  return { colors: BADGE_TIER_COLORS.Bronze, label: 'Bronze' };
}

function BadgeTooltip({ badge, anchorRef }: { badge: Badge; anchorRef: React.RefObject<HTMLDivElement> }) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ position: 'fixed', opacity: 0, pointerEvents: 'none' });

  useEffect(() => {
    if (!anchorRef.current || !tooltipRef.current) return;
    const anchor = anchorRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = anchor.top - tooltip.height - 8;
    let left = anchor.left + anchor.width / 2 - tooltip.width / 2;

    if (top < 8) top = anchor.bottom + 8;
    if (left < 8) left = 8;
    if (left + tooltip.width > vw - 8) left = vw - tooltip.width - 8;
    if (top + tooltip.height > vh - 8) top = anchor.top - tooltip.height - 8;

    setStyle({ position: 'fixed', top, left, opacity: 1, zIndex: 9999, pointerEvents: 'none' });
  }, [anchorRef]);

  return (
    <div
      ref={tooltipRef}
      style={style}
      className="w-48 bg-gray-900 text-white rounded-lg py-1.5 px-2.5 shadow-2xl border border-gray-700/50"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs">{getBadgeIcon(badge.icon_name)}</span>
        <span className="text-xs font-bold truncate">{badge.name}</span>
      </div>
      <span
        style={{
          fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 9999,
          display: 'inline-block', marginBottom: 4,
          background: getTierStyle(badge.tier).colors.bg,
          border: `1px solid ${getTierStyle(badge.tier).colors.border}`,
          color: getTierStyle(badge.tier).colors.text,
        }}
      >
        {getTierStyle(badge.tier).label}
      </span>
      {badge.description && (
        <p className="text-[10px] text-gray-300 leading-snug">{badge.description}</p>
      )}
    </div>
  );
}

function BadgeItem({ badge, size, showTooltip }: { badge: Badge; size: 'xs' | 'sm' | 'md' | 'lg'; showTooltip: boolean }) {
  const [hovered, setHovered] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const tierStyle = getTierStyle(badge.tier);
  const px = SIZE_PX[size];
  const iconPx = ICON_PX[size];

  return (
    <div
      ref={anchorRef}
      className="relative flex-shrink-0"
      onMouseEnter={() => showTooltip && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="rounded-lg flex items-center justify-center cursor-help transition-transform duration-150 hover:scale-110"
        style={{
          width: px, height: px,
          background: tierStyle.colors.bg,
          border: `1px solid ${tierStyle.colors.border}`,
          boxShadow: tierStyle.colors.glow,
        }}
      >
        <div className="flex items-center justify-center text-white drop-shadow-sm" style={{ width: iconPx, height: iconPx, fontSize: iconPx }}>
          {getBadgeIcon(badge.icon_name)}
        </div>
      </div>

      {showTooltip && hovered && (
        <BadgeTooltip badge={badge} anchorRef={anchorRef} />
      )}
    </div>
  );
}

export function BadgeList({
  badges,
  maxDisplay,
  size = 'md',
  showTooltip = true,
}: BadgeListProps) {
  const validBadges = badges.filter(badge =>
    badge && badge.id && badge.icon_name
  );

  if (validBadges.length === 0) return null;

  const displayBadges = maxDisplay ? validBadges.slice(0, maxDisplay) : validBadges;
  const remaining = validBadges.length - (maxDisplay || validBadges.length);
  const px = SIZE_PX[size];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {displayBadges.map(badge => (
        <BadgeItem key={badge.id} badge={badge} size={size} showTooltip={showTooltip} />
      ))}

      {remaining > 0 && (
        <div
          className="flex-shrink-0 bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 rounded-lg flex items-center justify-center border border-white/10 shadow-md"
          style={{ width: px, height: px }}
          title={`${remaining} more ${remaining === 1 ? 'badge' : 'badges'}`}
        >
          <span className="text-white font-bold" style={{ fontSize: Math.max(8, px * 0.38) }}>
            +{remaining}
          </span>
        </div>
      )}
    </div>
  );
}
