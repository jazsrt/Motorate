interface LicensePlateDisplayProps {
  stateCode: string;
  plateNumber: string;
  className?: string;
}

export function LicensePlateDisplay({ stateCode, plateNumber, className = '' }: LicensePlateDisplayProps) {
  return (
    <div
      className={`inline-flex flex-col items-center px-4 py-2 rounded-lg border ${className}`}
      style={{
        background: 'linear-gradient(180deg, #f8f8f8 0%, #e8e8e8 100%)',
        borderColor: '#888',
        minWidth: '120px',
      }}
    >
      <span className="text-[8px] font-bold uppercase tracking-[2px] text-blue-800 leading-none mb-0.5">
        {stateCode}
      </span>
      <span className="font-mono font-bold text-lg tracking-[3px] text-neutral-900 leading-tight">
        {plateNumber}
      </span>
    </div>
  );
}
