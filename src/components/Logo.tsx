interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
}

export function Logo({ size = 'medium', showTagline = false }: LogoProps) {
  const sizeClasses = {
    small: 'text-[20px]',
    medium: 'text-3xl',
    large: 'text-5xl',
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative inline-block overflow-visible">
        <h1
          className={`${sizeClasses[size]} font-heading font-bold whitespace-nowrap`}
          style={{
            background: 'linear-gradient(135deg, #F97316, #fb923c)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          MotoRate
        </h1>
      </div>
      {showTagline && (
        <p className="text-xs uppercase tracking-tight font-heading font-bold text-secondary mt-2">
          Community Driven
        </p>
      )}
    </div>
  );
}
