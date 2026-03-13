import { useState, useRef, useEffect } from 'react';
import { getBadgeIcon } from '../../lib/badgeIcons';

interface Badge {
  id: string;
  name: string;
  icon_name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
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

const rarityStyles = {
  Common: {
    gradient: 'from-slate-400 via-slate-500 to-slate-600',
    glow: 'shadow-slate-400/30',
  },
  Uncommon: {
    gradient: 'from-[#F97316] via-[#F97316] to-[#fb923c]',
    glow: 'shadow-[#F97316]/40',
  },
  Rare: {
    gradient: 'from-[#fb923c] via-[#fb923c] to-[#fb923c]',
    glow: 'shadow-[#fb923c]/50',
  },
  Epic: {
    gradient: 'from-[#F97316] via-orange-500 to-orange-600',
    glow: 'shadow-orange-400/60',
  },
  Legendary: {
    gradient: 'from-orange-500 via-orange-600 to-red-600',
    glow: 'shadow-orange-500/70',
  },
};

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
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-block mb-1 ${
        badge.rarity === 'Common' ? 'bg-slate-500/30 text-slate-300' :
        badge.rarity === 'Uncommon' ? 'bg-orange/30 text-accent-2' :
        badge.rarity === 'Rare' ? 'bg-accent-2/30 text-accent-2' :
        badge.rarity === 'Epic' ? 'bg-orange-500/30 text-orange-300' :
        'bg-pink-500/30 text-pink-300'
      }`}>
        {badge.rarity}
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
  const validRarity = badge.rarity as keyof typeof rarityStyles;
  const style = rarityStyles[validRarity] || rarityStyles.Common;
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
        className={`bg-gradient-to-br ${style.gradient} rounded-lg flex items-center justify-center cursor-help transition-transform duration-150 hover:scale-110 shadow-md ${style.glow} border border-white/20`}
        style={{ width: px, height: px }}
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
    badge && badge.id && badge.icon_name && badge.rarity && rarityStyles[badge.rarity as keyof typeof rarityStyles]
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
