import { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = {
    success: { Icon: CheckCircle, color: 'var(--positive)' },
    error: { Icon: AlertCircle, color: 'var(--negative)' },
    info: { Icon: Info, color: 'var(--accent)' },
    warning: { Icon: AlertTriangle, color: 'var(--rep)' },
  };

  const { Icon, color } = config[type];

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl animate-slide-up"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-2)',
        minWidth: '260px',
        maxWidth: '400px',
      }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} style={{ color }} />
      <p className="flex-1 text-[13px]" style={{ color: 'var(--text-primary)' }}>{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors"
        style={{ color: 'var(--text-quaternary)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-quaternary)')}
      >
        <X className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
