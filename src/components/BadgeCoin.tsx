import { Lock } from 'lucide-react';

type BadgeTier = 'bronze' | 'silver' | 'gold' | 'plat';

interface BadgeCoinProps {
  tier: BadgeTier;
  name: string;
  icon?: React.ReactNode;
  icon_path?: string;
  locked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const TIER_CONFIG: Record<BadgeTier, { bg: string; tierColor: string; label: string; strokeColor: string }> = {
  bronze: { bg: 'linear-gradient(145deg, #5a4228, #7a6040 40%, #9a7a58 55%, #7a6040 70%, #5a4228)', tierColor: '#c07840', label: 'Bronze', strokeColor: '#2a1a08' },
  silver: { bg: 'linear-gradient(145deg, #4a5668, #6a7688 40%, #909aaa 55%, #6a7688 70%, #4a5668)', tierColor: '#9ab0c0', label: 'Silver', strokeColor: '#1a1a2a' },
  gold: { bg: 'linear-gradient(145deg, #806828, #a8883e 40%, #c8a85a 55%, #a8883e 70%, #806828)', tierColor: '#f0a030', label: 'Gold', strokeColor: '#1a1400' },
  plat: { bg: 'linear-gradient(145deg, #585678, #706e90 40%, #8a88a8 55%, #706e90 70%, #585678)', tierColor: '#8a88a8', label: 'Platinum', strokeColor: '#1a1a28' },
};

const SIZE_PX = { sm: 44, md: 56, lg: 60 };
const ICON_PX = { sm: 16, md: 20, lg: 24 };

export function BadgeCoin({ tier, name, icon, icon_path, locked = false, size = 'md', onClick }: BadgeCoinProps) {
  const config = TIER_CONFIG[tier];
  const coinSize = SIZE_PX[size];
  const iconSize = ICON_PX[size];

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: coinSize, height: coinSize, borderRadius: '50%',
        background: locked ? '#202c3c' : config.bg,
        border: locked ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.15)',
        boxShadow: locked ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: locked ? 0.35 : 1,
        overflow: 'hidden', position: 'relative',
      }}>
        {locked ? (
          <Lock size={iconSize} color="#586878" strokeWidth={1.2} />
        ) : icon_path ? (
          <img
            src={icon_path}
            alt={name}
            width={iconSize + 8}
            height={iconSize + 8}
            style={{ objectFit: 'contain', borderRadius: '50%', display: 'block' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : icon || (
          <svg viewBox="0 0 24 24" fill="none" stroke={config.strokeColor} strokeWidth={1.2} width={iconSize} height={iconSize}>
            <circle cx="12" cy="8" r="7" />
            <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
          </svg>
        )}
      </div>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600,
        color: locked ? '#445566' : '#eef4f8',
        textAlign: 'center', lineHeight: 1.2, maxWidth: 64,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {locked ? '???' : name}
      </span>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.12em',
        color: locked ? '#445566' : config.tierColor,
      }}>
        {config.label}
      </span>
    </div>
  );
}
