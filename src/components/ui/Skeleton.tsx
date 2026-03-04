interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'circle' | 'card';
}

export function Skeleton({ className = '', variant = 'default' }: SkeletonProps) {
  const baseClass = 'animate-pulse bg-surfacehighlight';

  const variants = {
    default: 'h-4 rounded',
    circle: 'rounded-full',
    card: 'h-32 rounded-xl'
  };

  return <div className={`${baseClass} ${variants[variant]} ${className}`} />;
}

export function PostSkeleton() {
  return (
    <div className="bg-surface border border-surfacehighlight rounded-xl p-4 mb-4">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circle" className="w-10 h-10 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-32" />
          <Skeleton className="w-24" />
        </div>
      </div>

      <Skeleton variant="card" className="mb-4" />

      <div className="space-y-2">
        <Skeleton className="w-full" />
        <Skeleton className="w-3/4" />
      </div>
    </div>
  );
}

export function VehicleCardSkeleton() {
  return (
    <div className="bg-surface border border-surfacehighlight rounded-xl overflow-hidden">
      <Skeleton variant="card" />
      <div className="p-4 space-y-2">
        <Skeleton className="w-3/4" />
        <Skeleton className="w-1/2" />
        <Skeleton className="w-full h-8" />
      </div>
    </div>
  );
}

export function UserCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 bg-surface border border-surfacehighlight rounded-xl">
      <Skeleton variant="circle" className="w-12 h-12 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="w-32" />
        <Skeleton className="w-24" />
      </div>
      <Skeleton className="w-20 h-9" />
    </div>
  );
}

export function BadgeCardSkeleton() {
  return (
    <div className="bg-surface border border-surfacehighlight rounded-xl p-4">
      <div className="flex flex-col items-center">
        <Skeleton variant="circle" className="w-16 h-16 mb-3" />
        <Skeleton className="w-24 h-4 mb-2" />
        <Skeleton className="w-32 h-3" />
      </div>
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="bg-surface border border-surfacehighlight rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Skeleton variant="circle" className="w-10 h-10 mt-1 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-3/4" />
          <Skeleton className="w-full" />
          <Skeleton className="w-1/3" />
        </div>
      </div>
    </div>
  );
}
