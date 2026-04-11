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

// Sizes are 60% larger than before — image fills the space directly, no circle
const SIZE_PX = { sm: 56, md: 80, lg: 96 };

export function BadgeCoin({ tier, name, icon, icon_path, locked = false, size = 'md', onClick }: BadgeCoinProps) {
  const imgSize = SIZE_PX[size];

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: imgSize,
        height: imgSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: locked ? 0.3 : 1,
        filter: locked ? 'grayscale(1)' : 'none',
        transition: 'opacity 0.2s',
      }}>
        {locked ? (
          <Lock
            size={Math.round(imgSize * 0.45)}
            color="#586878"
            strokeWidth={1.2}
          />
        ) : icon_path ? (
          <img
            src={icon_path}
            alt={name}
            width={imgSize}
            height={imgSize}
            style={{
              objectFit: 'contain',
              display: 'block',
              width: imgSize,
              height: imgSize,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : icon ? (
          <div style={{ width: imgSize, height: imgSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </div>
        ) : (
          // Fallback: simple award silhouette — no circle background
          <svg viewBox="0 0 24 24" fill="none" stroke="#586878" strokeWidth={1.2} width={imgSize * 0.7} height={imgSize * 0.7}>
            <circle cx="12" cy="8" r="7" />
            <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
          </svg>
        )}
      </div>

      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: size === 'sm' ? 9 : size === 'md' ? 10 : 11,
        fontWeight: 600,
        color: locked ? '#445566' : '#eef4f8',
        textAlign: 'center',
        lineHeight: 1.2,
        maxWidth: imgSize + 8,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {locked ? '???' : name}
      </span>
    </div>
  );
}
