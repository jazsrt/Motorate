import { Lock } from 'lucide-react';

interface BadgeCoinProps {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'locked';
  icon: React.ReactNode;
  name: string;
  earned: boolean;
  size?: number;
  onClick?: () => void;
}

const tierGradients = {
  bronze: 'linear-gradient(145deg, #5a4228, #7a6040 40%, #9a7a58 55%, #7a6040 70%, #5a4228)',
  silver: 'linear-gradient(145deg, #4a5668, #6a7688 40%, #909aaa 55%, #6a7688 70%, #4a5668)',
  gold:   'linear-gradient(145deg, #806828, #a8883e 40%, #c8a85a 55%, #a8883e 70%, #806828)',
  platinum: 'linear-gradient(145deg, #585678, #706e90 40%, #8a88a8 55%, #706e90 70%, #585678)',
  locked: '#202c3c',
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function BadgeCoin({ tier, icon, name, earned, size = 56, onClick }: BadgeCoinProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: earned ? tierGradients[tier] : tierGradients.locked,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: earned
          ? '1px solid rgba(255,255,255,.15)'
          : '1px solid rgba(255,255,255,.06)',
        boxShadow: earned
          ? 'inset 0 1px 0 rgba(255,255,255,.3), 0 2px 8px rgba(0,0,0,.3)'
          : 'none',
        opacity: earned ? 1 : 0.35,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s',
        padding: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {earned && (
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '50%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.2), transparent)',
          left: '-100%',
          pointerEvents: 'none',
        }} />
      )}
      {earned ? icon : <Lock size={size * 0.32} color="#586878" strokeWidth={1.5} />}
    </button>
  );
}
