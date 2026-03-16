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

const TIER_CONFIG = {
  bronze: { coinClass: 'coin-bronze', tierColor: 'var(--bronze-h)', label: 'Bronze', strokeColor: '#2a1a08' },
  silver: { coinClass: 'coin-silver', tierColor: 'var(--silver-h)', label: 'Silver', strokeColor: '#1a1a2a' },
  gold: { coinClass: 'coin-gold', tierColor: 'var(--gold-h)', label: 'Gold', strokeColor: '#1a1400' },
  plat: { coinClass: 'coin-plat', tierColor: 'var(--plat-h)', label: 'Platinum', strokeColor: '#1a1a28' },
};

const SIZE_MAP = {
  sm: 'w-11 h-11',
  md: 'w-14 h-14',
  lg: 'w-[60px] h-[60px]',
};

const ICON_SIZE_MAP = {
  sm: 16,
  md: 20,
  lg: 24,
};

export function BadgeCoin({ tier, name, icon, icon_path, locked = false, size = 'md', onClick }: BadgeCoinProps) {
  const config = TIER_CONFIG[tier];

  return (
    <div
      className={`flex flex-col items-center gap-1.5 cursor-pointer transition-transform active:scale-95`}
      onClick={onClick}
    >
      <div
        className={`${SIZE_MAP[size]} rounded-full flex items-center justify-center ${
          locked ? 'coin-locked' : config.coinClass
        }`}
      >
        {locked ? (
          <Lock size={ICON_SIZE_MAP[size]} className="text-quaternary opacity-30" strokeWidth={1.2} />
        ) : icon_path ? (
          <img
            src={icon_path}
            alt={name}
            width={ICON_SIZE_MAP[size] + 8}
            height={ICON_SIZE_MAP[size] + 8}
            style={{ objectFit: 'contain', borderRadius: '50%', display: 'block' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          icon || (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke={config.strokeColor}
              strokeWidth={1.2}
              width={ICON_SIZE_MAP[size]}
              height={ICON_SIZE_MAP[size]}
            >
              <circle cx="12" cy="8" r="7" />
              <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
            </svg>
          )
        )}
      </div>
      <span className="text-[10px] font-medium text-primary text-center leading-tight max-w-[64px] truncate">
        {locked ? '???' : name}
      </span>
      <span
        className="text-[8px] uppercase tracking-[1.5px] font-medium"
        style={{ color: locked ? 'var(--t4)' : config.tierColor }}
      >
        {config.label}
      </span>
    </div>
  );
}
