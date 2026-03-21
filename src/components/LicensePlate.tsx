interface LicensePlateProps {
  plateNumber: string;
  plateState: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { plate: { height: 44, borderRadius: 6, padding: '4px 12px' }, state: 10, number: 18 },
  md: { plate: { height: 60, borderRadius: 8, padding: '6px 16px' }, state: 11, number: 26 },
  lg: { plate: { height: 76, borderRadius: 10, padding: '8px 20px' }, state: 12, number: 34 },
};

export function LicensePlate({ plateNumber, plateState, size = 'md' }: LicensePlateProps) {
  const s = sizes[size];
  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, #f4f1ec 0%, #e8e3d8 100%)',
      border: '2px solid #1a1a2e',
      borderRadius: s.plate.borderRadius,
      padding: s.plate.padding,
      height: s.plate.height,
      minWidth: 100,
      boxShadow: '0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.6)',
      gap: 2,
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: s.state,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase' as const,
        color: '#444',
        lineHeight: 1,
      }}>
        {plateState || '\u2014'}
      </span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: s.number,
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase' as const,
        color: '#0a0a1a',
        lineHeight: 1,
      }}>
        {plateNumber || '\u2014'}
      </span>
    </div>
  );
}
