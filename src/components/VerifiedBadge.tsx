import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function VerifiedBadge({ size = 'md' }: VerifiedBadgeProps) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="inline-flex items-center justify-center relative group">
      <BadgeCheck
        className={`${sizeClasses[size]} text-green-400 fill-green-400/20`}
        strokeWidth={2.5}
      />
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
        Verified Owner
      </div>
    </div>
  );
}
