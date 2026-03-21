import { useEffect, useCallback } from 'react';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
}

export function ModalShell({ isOpen, onClose, eyebrow, title, subtitle, children, footer, maxWidth = 420 }: ModalShellProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth,
          background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 16,
          display: 'flex', flexDirection: 'column' as const,
          maxHeight: '85vh',
          animation: 'modalSlideUp 280ms cubic-bezier(0.22,0.61,0.36,1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            {eyebrow && (
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase' as const,
                color: '#F97316', marginBottom: 4,
              }}>
                {eyebrow}
              </div>
            )}
            <div style={{
              fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700,
              color: '#eef4f8', lineHeight: 1,
            }}>
              {title}
            </div>
            {subtitle && (
              <div style={{
                fontFamily: "'Barlow', sans-serif", fontSize: 12,
                color: '#7a8e9e', marginTop: 4,
              }}>
                {subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, marginLeft: 12,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="#7a8e9e" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto' as const, padding: '16px 20px' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '14px 20px 18px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 10, flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* Shared button styles for modal footers */
export const modalButtonPrimary: React.CSSProperties = {
  flex: 1, padding: '12px', borderRadius: 8,
  background: '#F97316', border: 'none',
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  color: '#030508', cursor: 'pointer',
};

export const modalButtonGhost: React.CSSProperties = {
  flex: 1, padding: '12px', borderRadius: 8,
  background: 'transparent', border: '1px solid rgba(255,255,255,0.10)',
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  color: '#7a8e9e', cursor: 'pointer',
};

export const modalButtonDanger: React.CSSProperties = {
  flex: 1, padding: '12px', borderRadius: 8,
  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)',
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  color: '#ef4444', cursor: 'pointer',
};

export const modalInput: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: '#070a0f', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  fontFamily: "'Barlow', sans-serif", fontSize: 14,
  color: '#eef4f8', outline: 'none',
  boxSizing: 'border-box',
};

export const modalLabel: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
  letterSpacing: '0.18em', textTransform: 'uppercase',
  color: '#7a8e9e', marginBottom: 6, display: 'block',
};
