import React from 'react';

interface BadgeChipProps {
  name: string;
  icon?: string;
  type: 'prestige' | 'milestone' | 'identity';
  size?: 'sm' | 'md';
}

export function BadgeChip({ name, icon, type, size = 'md' }: BadgeChipProps) {
  const isSm = size === 'sm';

  const bgBorder: Record<string, React.CSSProperties> = {
    prestige: {
      background: 'linear-gradient(135deg, rgba(245,204,85,0.18), rgba(240,160,48,0.10))',
      border: '1px solid rgba(240,160,48,0.55)',
    },
    milestone: {
      background: 'rgba(249,115,22,0.10)',
      border: '1px solid rgba(249,115,22,0.32)',
    },
    identity: {
      background: 'rgba(154,176,192,0.08)',
      border: '1px solid rgba(154,176,192,0.22)',
    },
  };

  const textColor: Record<string, string> = {
    prestige: '#f0a030',
    milestone: '#F97316',
    identity: '#9ab0c0',
  };

  const iconSize: Record<string, number> = {
    prestige: isSm ? 10 : 12,
    milestone: isSm ? 9 : 11,
    identity: isSm ? 9 : 10,
  };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: isSm ? 3 : 5,
      padding: isSm ? '2px 6px' : '4px 9px',
      borderRadius: 5,
      flexShrink: 0,
      ...bgBorder[type],
    }}>
      {icon && (
        <span style={{ fontSize: iconSize[type], lineHeight: 1 }}>{icon}</span>
      )}
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: isSm ? 7 : 9,
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase' as const,
        color: textColor[type],
      }}>
        {name}
      </span>
    </div>
  );
}
