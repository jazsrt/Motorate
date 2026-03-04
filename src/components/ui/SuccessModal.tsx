import { ReactNode } from 'react';
import { X, Zap } from 'lucide-react';

interface SuccessModalProps {
  title: string;
  message: string;
  repEarned?: number;
  icon?: ReactNode;
  primaryAction: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  onClose: () => void;
}

export function SuccessModal({
  title,
  message,
  repEarned,
  icon,
  primaryAction,
  secondaryAction,
  onClose
}: SuccessModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-surface to-surfacehighlight rounded-3xl max-w-md w-full border-2 border-green-500/20 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-primary/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-green-400">Success!</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surfacehighlight rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center animate-bounce-once">
            {icon || (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Zap className="w-10 h-10 text-white" />
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold">{title}</h3>

          {/* Message */}
          <p className="text-secondary">{message}</p>

          {/* Rep Badge */}
          {repEarned && (
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-[#fb923c] px-6 py-3 rounded-xl font-bold text-lg">
              <Zap size={20} />
              +{repEarned} rep
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <button
              onClick={primaryAction.onClick}
              className="w-full bg-gradient-to-r from-primary to-[#fb923c] hover:shadow-xl rounded-2xl px-6 py-4 font-bold uppercase tracking-wider transition-all"
            >
              {primaryAction.label}
            </button>

            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="w-full bg-surface border-2 border-primary/20 hover:bg-surfacehighlight rounded-2xl px-6 py-4 font-bold uppercase tracking-wider transition-all"
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
