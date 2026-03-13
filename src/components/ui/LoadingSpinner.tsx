interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', label, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`}>
      <div
        className={`${sizeClasses[size]} border-accent-primary border-t-transparent rounded-full animate-spin`}
      />
      {label && <span className="text-sm text-secondary">{label}</span>}
    </div>
  );
}
