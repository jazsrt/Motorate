interface LicensePlateProps {
  plateNumber: string;
  plateState: string;
  size?: 'sm' | 'md' | 'lg';
}

interface PlateDesign {
  bg: string;
  numberColor: string;
  stateColor: string;
  border: string;
  bolt: string;
  name: string;
}

const STATE_CONFIG: Record<string, PlateDesign> = {
  AL: { bg: '#FFFFFF', numberColor: '#1a1a1a', stateColor: '#1a5276', border: '#cccccc', bolt: '#aaaaaa', name: 'Alabama' },
  AK: { bg: '#F0EBD8', numberColor: '#1a1a1a', stateColor: '#2c3e50', border: '#aaaaaa', bolt: '#888888', name: 'Alaska' },
  AZ: { bg: '#CC0000', numberColor: '#FFFFFF', stateColor: '#FFFFFF', border: '#8b0000', bolt: '#aa0000', name: 'Arizona' },
  AR: { bg: '#FFFFFF', numberColor: '#CC0000', stateColor: '#003087', border: '#cccccc', bolt: '#aaaaaa', name: 'Arkansas' },
  CA: { bg: '#FFFFFF', numberColor: '#003366', stateColor: '#003366', border: '#dddddd', bolt: '#aaaaaa', name: 'California' },
  CO: { bg: '#FFFFFF', numberColor: '#00843D', stateColor: '#003366', border: '#cccccc', bolt: '#aaaaaa', name: 'Colorado' },
  CT: { bg: '#FFFFFF', numberColor: '#002868', stateColor: '#BF0A30', border: '#cccccc', bolt: '#aaaaaa', name: 'Connecticut' },
  DE: { bg: '#FFD700', numberColor: '#002868', stateColor: '#002868', border: '#B8860B', bolt: '#997700', name: 'Delaware' },
  FL: { bg: '#FF6600', numberColor: '#FFFFFF', stateColor: '#FFFFFF', border: '#CC4400', bolt: '#aa3300', name: 'Florida' },
  GA: { bg: '#FFFFFF', numberColor: '#CC0000', stateColor: '#003087', border: '#cccccc', bolt: '#aaaaaa', name: 'Georgia' },
  HI: { bg: '#003087', numberColor: '#FFFFFF', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'Hawaii' },
  ID: { bg: '#FFFFFF', numberColor: '#003087', stateColor: '#CC0000', border: '#cccccc', bolt: '#aaaaaa', name: 'Idaho' },
  IL: { bg: '#FFFFFF', numberColor: '#002868', stateColor: '#BF0A30', border: '#dddddd', bolt: '#aaaaaa', name: 'Illinois' },
  IN: { bg: '#002868', numberColor: '#FFFFFF', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'Indiana' },
  IA: { bg: '#FFFFFF', numberColor: '#002868', stateColor: '#002868', border: '#cccccc', bolt: '#aaaaaa', name: 'Iowa' },
  KS: { bg: '#003087', numberColor: '#FFD700', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'Kansas' },
  KY: { bg: '#003087', numberColor: '#FFFFFF', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'Kentucky' },
  LA: { bg: '#003087', numberColor: '#FFD700', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'Louisiana' },
  ME: { bg: '#FFFFFF', numberColor: '#003087', stateColor: '#003087', border: '#cccccc', bolt: '#aaaaaa', name: 'Maine' },
  MD: { bg: '#FFFFFF', numberColor: '#CC0000', stateColor: '#003087', border: '#cccccc', bolt: '#aaaaaa', name: 'Maryland' },
  MA: { bg: '#FFFFFF', numberColor: '#003087', stateColor: '#003087', border: '#cccccc', bolt: '#aaaaaa', name: 'Massachusetts' },
  MI: { bg: '#FFFFFF', numberColor: '#003087', stateColor: '#CC0000', border: '#cccccc', bolt: '#aaaaaa', name: 'Michigan' },
  MN: { bg: '#003087', numberColor: '#FFD700', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'Minnesota' },
  MS: { bg: '#003087', numberColor: '#FFFFFF', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'Mississippi' },
  MO: { bg: '#FFFFFF', numberColor: '#003087', stateColor: '#CC0000', border: '#cccccc', bolt: '#aaaaaa', name: 'Missouri' },
  MT: { bg: '#003087', numberColor: '#FFD700', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'Montana' },
  NE: { bg: '#003087', numberColor: '#FFD700', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'Nebraska' },
  NV: { bg: '#003366', numberColor: '#C0C0C0', stateColor: '#C0C0C0', border: '#001a4d', bolt: '#002060', name: 'Nevada' },
  NH: { bg: '#FFFFFF', numberColor: '#003087', stateColor: '#003087', border: '#cccccc', bolt: '#aaaaaa', name: 'New Hampshire' },
  NJ: { bg: '#FFD700', numberColor: '#003087', stateColor: '#003087', border: '#B8860B', bolt: '#997700', name: 'New Jersey' },
  NM: { bg: '#FFD700', numberColor: '#CC0000', stateColor: '#CC0000', border: '#B8860B', bolt: '#997700', name: 'New Mexico' },
  NY: { bg: '#FFD700', numberColor: '#003087', stateColor: '#003087', border: '#B8860B', bolt: '#997700', name: 'New York' },
  NC: { bg: '#FFFFFF', numberColor: '#CC0000', stateColor: '#003087', border: '#cccccc', bolt: '#aaaaaa', name: 'North Carolina' },
  ND: { bg: '#003087', numberColor: '#FFD700', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'North Dakota' },
  OH: { bg: '#003087', numberColor: '#FFFFFF', stateColor: '#CC0000', border: '#001a4d', bolt: '#002060', name: 'Ohio' },
  OK: { bg: '#FFFFFF', numberColor: '#003087', stateColor: '#CC6600', border: '#cccccc', bolt: '#aaaaaa', name: 'Oklahoma' },
  OR: { bg: '#003087', numberColor: '#FFD700', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'Oregon' },
  PA: { bg: '#003087', numberColor: '#FFD700', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'Pennsylvania' },
  RI: { bg: '#FFFFFF', numberColor: '#003087', stateColor: '#003087', border: '#cccccc', bolt: '#aaaaaa', name: 'Rhode Island' },
  SC: { bg: '#003087', numberColor: '#FFFFFF', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'South Carolina' },
  SD: { bg: '#003087', numberColor: '#FFD700', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'South Dakota' },
  TN: { bg: '#FFFFFF', numberColor: '#FF6600', stateColor: '#002868', border: '#cccccc', bolt: '#aaaaaa', name: 'Tennessee' },
  TX: { bg: '#FFFFFF', numberColor: '#003087', stateColor: '#003087', border: '#cccccc', bolt: '#aaaaaa', name: 'Texas' },
  UT: { bg: '#FFFFFF', numberColor: '#003087', stateColor: '#CC0000', border: '#cccccc', bolt: '#aaaaaa', name: 'Utah' },
  VT: { bg: '#FFFFFF', numberColor: '#003087', stateColor: '#228B22', border: '#cccccc', bolt: '#aaaaaa', name: 'Vermont' },
  VA: { bg: '#003087', numberColor: '#FFFFFF', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'Virginia' },
  WA: { bg: '#003087', numberColor: '#FFFFFF', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'Washington' },
  WV: { bg: '#003087', numberColor: '#FFD700', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'West Virginia' },
  WI: { bg: '#003087', numberColor: '#FFFFFF', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'Wisconsin' },
  WY: { bg: '#003087', numberColor: '#FFD700', stateColor: '#FFD700', border: '#001a4d', bolt: '#002060', name: 'Wyoming' },
  DC: { bg: '#FFFFFF', numberColor: '#CC0000', stateColor: '#CC0000', border: '#cccccc', bolt: '#aaaaaa', name: 'D.C.' },
};

const FALLBACK: PlateDesign = {
  bg: '#F4F1EC', numberColor: '#0a0a1a', stateColor: '#444444', border: '#999999', bolt: '#888888', name: '',
};

const SIZE_PX = {
  sm: { width: 140, height: 70 },
  md: { width: 180, height: 90 },
  lg: { width: 240, height: 120 },
};

export function LicensePlate({ plateNumber, plateState, size = 'md' }: LicensePlateProps) {
  const code = (plateState || '').toUpperCase().trim();
  const design = STATE_CONFIG[code] || { ...FALLBACK, name: code };
  const dim = SIZE_PX[size];

  return (
    <div style={{ width: dim.width, height: dim.height, flexShrink: 0 }}>
      <svg
        viewBox="0 0 240 120"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* Background */}
        <rect width="240" height="120" rx="10" fill={design.bg} />
        {/* Border */}
        <rect width="236" height="116" x="2" y="2" rx="9" fill="none" stroke={design.border} strokeWidth="3" />
        {/* Corner bolts */}
        <circle cx="18" cy="18" r="4" fill={design.bolt} />
        <circle cx="222" cy="18" r="4" fill={design.bolt} />
        <circle cx="18" cy="102" r="4" fill={design.bolt} />
        <circle cx="222" cy="102" r="4" fill={design.bolt} />
        {/* State name */}
        <text
          x="120" y="32"
          textAnchor="middle"
          fontFamily="'Barlow Condensed', sans-serif"
          fontSize="14" fontWeight="700"
          letterSpacing="3"
          fill={design.stateColor}
        >
          {design.name.toUpperCase()}
        </text>
        {/* Plate number */}
        <text
          x="120" y="82"
          textAnchor="middle"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="38" fontWeight="600"
          letterSpacing="4"
          fill={design.numberColor}
        >
          {(plateNumber || '\u2014').toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
