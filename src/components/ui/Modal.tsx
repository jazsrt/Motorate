import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  contentClassName?: string;
  centerContent?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  contentClassName = '',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="sheet-overlay"
      onClick={closeOnOverlayClick ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`w-full flex flex-col animate-sheet-up ${className}`}
        style={{
          background: 'var(--surface)',
          borderRadius: '14px 14px 0 0',
          borderTop: '1px solid var(--border-2)',
          maxHeight: '90vh',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div
            className="rounded-full"
            style={{ width: '28px', height: '2px', background: 'rgba(255,255,255,0.08)' }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2
            id="modal-title"
            className="text-[15px] font-normal"
            style={{ color: 'var(--text-primary)', letterSpacing: '0.3px' }}
          >
            {title}
          </h2>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                color: 'var(--text-tertiary)',
              }}
              aria-label="Close"
            >
              <X className="w-2.5 h-2.5" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Content */}
        <div
          className={`flex-1 overflow-y-auto px-5 py-4 ${contentClassName}`}
          style={{ overscrollBehavior: 'contain' }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="px-5 py-4 flex-shrink-0"
            style={{ borderTop: '1px solid var(--border)', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ModalFooter({
  children,
  align = 'right',
  className = '',
}: {
  children: ReactNode;
  align?: 'left' | 'center' | 'right' | 'between';
  className?: string;
}) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={`flex gap-2 ${alignClasses[align]} ${className}`}>
      {children}
    </div>
  );
}

export function ModalButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}) {
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--accent)', color: 'var(--bg)' },
    secondary: { background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-secondary)' },
    danger: { background: 'var(--negative)', color: '#e8eaed' },
    ghost: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-tertiary)' },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-4 py-2.5 rounded-lg text-[11px] font-semibold uppercase transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{ letterSpacing: '0.8px', ...variantStyles[variant] }}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div
            className="w-3.5 h-3.5 rounded-full border-2 animate-spin flex-shrink-0"
            style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'currentColor' }}
          />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  loading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
  loading?: boolean;
}) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <ModalFooter align="right">
          <ModalButton variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </ModalButton>
          <ModalButton
            variant={variant}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmText}
          </ModalButton>
        </ModalFooter>
      }
    >
      <div style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.65' }}>
        {typeof message === 'string' ? <p>{message}</p> : message}
      </div>
    </Modal>
  );
}
