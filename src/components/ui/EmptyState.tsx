import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-surfacehighlight rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-secondary" />
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-secondary mb-6 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-accent-primary hover:bg-accent-hover rounded-xl font-bold uppercase tracking-wider text-sm transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
