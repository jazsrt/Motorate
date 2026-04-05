import { type ReactNode, type CSSProperties } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  fullWidth?: boolean;
  type?: 'button' | 'submit';
}

const base: CSSProperties = {
  minHeight: 44,
  borderRadius: 8,
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  transition: 'transform 0.1s',
};

const variants: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: '#F97316',
    color: '#030508',
    border: 'none',
  },
  secondary: {
    background: 'rgba(249,115,22,0.08)',
    color: '#F97316',
    border: '1px solid rgba(249,115,22,0.25)',
  },
  ghost: {
    background: 'transparent',
    color: '#5a6e7e',
    border: '1px solid rgba(255,255,255,0.08)',
  },
};

export function Button({
  children,
  variant = 'primary',
  disabled = false,
  onClick,
  style,
  fullWidth = true,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...base,
        ...variants[variant],
        width: fullWidth ? '100%' : undefined,
        padding: fullWidth ? '0 16px' : '0 16px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        ...style,
      }}
      onMouseDown={e => {
        if (!disabled) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)';
      }}
      onMouseUp={e => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      }}
    >
      {children}
    </button>
  );
}
