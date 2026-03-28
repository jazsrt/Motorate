import { useState } from 'react';
import { getBadgeIcon } from '../lib/badgeIcons';

interface BadgeProps {
  name: string;
  icon: string;
  type: 'good' | 'bad' | 'status' | null;
  description?: string;
  count?: number | null;
  size?: 'xs' | 'small' | 'medium' | 'large';
  variant?: 'card' | 'pill';
  className?: string;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | string;
  category?: string;
  isPositive?: boolean;
}

export function Badge({ name, icon, type, description, count, size = 'medium', variant = 'card', className = '', tier, category, isPositive = true }: BadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const badgeIcon = getBadgeIcon(icon, tier);

  const getTierStyles = () => {
    switch (tier) {
      case 'bronze':
        return {
          base: 'bg-gradient-to-br from-orange-900 to-orange-700 border-2 border-orange-600',
          glow: 'shadow-[0_0_20px_rgba(194,65,12,0.4)] hover:shadow-[0_0_30px_rgba(194,65,12,0.6)]',
          text: 'text-orange-200',
          shine: '',
          badge: 'B'
        };
      case 'silver':
        return {
          base: 'bg-gradient-to-br from-gray-500 to-gray-300 border-2 border-gray-400',
          glow: 'shadow-[0_0_20px_rgba(156,163,175,0.4)] hover:shadow-[0_0_30px_rgba(156,163,175,0.6)]',
          text: 'text-gray-800',
          shine: '',
          badge: 'S'
        };
      case 'gold':
        return {
          base: 'bg-gradient-to-br from-yellow-500 to-yellow-400 border-2 border-yellow-500',
          glow: 'shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)]',
          text: 'text-yellow-900',
          shine: '',
          badge: 'G'
        };
      case 'platinum':
        return {
          base: 'bg-gradient-to-br from-[#fb923c] to-[#fb923c] border-2 border-orange',
          glow: 'shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)]',
          text: 'text-accent-primary',
          shine: '',
          badge: 'P'
        };
      default:
        return null;
    }
  };

  const tierStyles = getTierStyles();

  const sizeClasses = {
    card: {
      xs: 'p-2',
      small: 'p-3',
      medium: 'p-5',
      large: 'p-7'
    },
    pill: {
      xs: 'px-2 py-1',
      small: 'px-3 py-1.5',
      medium: 'px-4 py-2',
      large: 'px-5 py-2.5'
    }
  };

  const iconSizes = {
    card: {
      xs: 'w-8 h-8',
      small: 'w-10 h-10',
      medium: 'w-14 h-14',
      large: 'w-18 h-18'
    },
    pill: {
      xs: 'w-4 h-4',
      small: 'w-5 h-5',
      medium: 'w-6 h-6',
      large: 'w-7 h-7'
    }
  };

  const textSizes = {
    card: {
      xs: 'text-[9px]',
      small: 'text-[10px]',
      medium: 'text-xs',
      large: 'text-sm'
    },
    pill: {
      xs: 'text-[10px]',
      small: 'text-xs',
      medium: 'text-sm',
      large: 'text-base'
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'status':
        return {
          base: 'bg-gradient-to-br from-[#F97316]/20 via-yellow-500/20 to-orange-500/20 backdrop-blur-xl border-2 border-orange/40',
          glow: 'shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:shadow-[0_0_40px_rgba(251,191,36,0.5)]',
          text: 'text-amber-200',
          shine: 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000'
        };
      case 'good':
        return {
          base: 'bg-gradient-to-br from-emerald-500/20 via-green-500/20 to-teal-500/20 backdrop-blur-xl border-2 border-emerald-400/40',
          glow: 'shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)]',
          text: 'text-emerald-200',
          shine: 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000'
        };
      case 'bad':
        return {
          base: 'bg-gradient-to-br from-red-500/20 via-rose-500/20 to-pink-500/20 backdrop-blur-xl border-2 border-red-400/40',
          glow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_40px_rgba(239,68,68,0.5)]',
          text: 'text-red-200',
          shine: 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000'
        };
      default:
        return {
          base: 'bg-gradient-to-br from-slate-500/20 via-gray-500/20 to-zinc-500/20 backdrop-blur-xl border-2 border-gray-400/30',
          glow: 'shadow-[0_0_20px_rgba(100,116,139,0.2)] hover:shadow-[0_0_30px_rgba(100,116,139,0.4)]',
          text: 'text-gray-200',
          shine: 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000'
        };
    }
  };

  const styles = tierStyles || getTypeStyles();

  if (variant === 'pill') {
    return (
      <div className="relative inline-block group">
        <div
          className={`${styles.base} ${styles.glow} ${styles.shine} ${sizeClasses.pill[size]} rounded-full flex items-center gap-2 transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 cursor-pointer relative overflow-hidden ${className}`}
          onMouseEnter={() => {
            if (description) setShowTooltip(true);
            setIsHovered(true);
          }}
          onMouseLeave={() => {
            setShowTooltip(false);
            setIsHovered(false);
          }}
        >
          <div className={`${iconSizes.pill[size]} transition-all duration-300 ${isHovered ? 'scale-110 rotate-6' : ''}`}>
            {badgeIcon}
          </div>
          <span className={`${textSizes.pill[size]} ${styles.text} font-bold uppercase tracking-wider whitespace-nowrap`}>
            {name}
          </span>
          {count !== undefined && count !== null && (
            <span className={`${textSizes.pill[size]} ${styles.text} opacity-70 ml-1`}>
              ({count})
            </span>
          )}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>

        {description && showTooltip && (
          <div className="absolute z-50 w-64 p-4 bg-surface/90 backdrop-blur-xl border border-surfacehighlight rounded-2xl shadow-2xl text-xs left-1/2 -translate-x-1/2 bottom-full mb-3 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="text-primary leading-relaxed font-medium">{description}</div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-surfacehighlight"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block group">
      <div
        className={`${styles.base} ${styles.glow} ${styles.shine} ${sizeClasses.card[size]} rounded-3xl text-center transition-all duration-300 hover:scale-110 hover:-translate-y-1 cursor-pointer relative overflow-hidden ${className}`}
        onMouseEnter={() => {
          if (description) setShowTooltip(true);
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setShowTooltip(false);
          setIsHovered(false);
        }}
      >
        {!isPositive && (
          <div className="absolute top-2 left-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold z-10">
            !
          </div>
        )}

        <div className={`${iconSizes.card[size]} mx-auto mb-2 transition-all duration-300 ${isHovered ? 'scale-125 rotate-12' : ''} drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]`}>
          {badgeIcon}
        </div>
        <div className={`${textSizes.card[size]} ${styles.text} font-bold uppercase tracking-wider drop-shadow-lg`}>
          {name}
        </div>
        {count !== undefined && count !== null && (
          <div className={`${textSizes.card[size]} ${styles.text} opacity-70 mt-1.5 font-mono font-bold`}>
            {count} left
          </div>
        )}

        {tierStyles && (
          <div className="absolute bottom-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white text-xs font-bold border border-white/30">
            {tierStyles.badge}
          </div>
        )}

        <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
      </div>

      {description && showTooltip && (
        <div className="absolute z-50 w-64 p-4 bg-surface/90 backdrop-blur-xl border border-surfacehighlight rounded-2xl shadow-2xl text-xs left-1/2 -translate-x-1/2 bottom-full mb-3 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="space-y-1">
            <div className="text-primary font-bold text-sm">{name}</div>
            {tierStyles && (
              <div className="text-secondary text-xs">
                Tier: {(tier?.charAt(0).toUpperCase() ?? '') + (tier?.slice(1) ?? '')}
              </div>
            )}
            {category && (
              <div className="text-secondary text-xs">Category: {category}</div>
            )}
            <div className="text-primary leading-relaxed">{description}</div>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-surfacehighlight"></div>
        </div>
      )}
    </div>
  );
}
