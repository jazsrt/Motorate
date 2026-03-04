import { Shield, User, Car } from 'lucide-react';

export type VerificationTier = 'shadow' | 'conditional' | 'standard' | 'verified' | 'vin_verified';

interface TierBadgeProps {
  tier: VerificationTier;
  size?: 'xs' | 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

export function TierBadge({ tier, size = 'medium', showIcon = true }: TierBadgeProps) {
  const configs = {
    shadow: {
      label: 'Unclaimed',
      icon: Car,
      bgColor: 'bg-gray-900/30',
      borderColor: 'border-gray-700',
      textColor: 'text-gray-400',
      iconColor: 'text-gray-500',
    },
    conditional: {
      label: 'Pending',
      icon: User,
      bgColor: 'bg-yellow-900/30',
      borderColor: 'border-yellow-800',
      textColor: 'text-yellow-400',
      iconColor: 'text-yellow-500',
    },
    standard: {
      label: 'Owner',
      icon: User,
      bgColor: 'bg-orange-900/30',
      borderColor: 'border-orange-800',
      textColor: 'text-orange-400',
      iconColor: 'text-orange-500',
    },
    verified: {
      label: 'Verified Owner',
      icon: Shield,
      bgColor: 'bg-green-900/30',
      borderColor: 'border-green-800',
      textColor: 'text-green-400',
      iconColor: 'text-green-500',
    },
    vin_verified: {
      label: 'VIN Verified',
      icon: Shield,
      bgColor: 'bg-orange-900/30',
      borderColor: 'border-orange-800',
      textColor: 'text-orange-400',
      iconColor: 'text-orange-500',
    },
  };

  const sizeClasses = {
    xs: {
      container: 'px-1.5 py-0.5 text-[8px]',
      icon: 'w-2.5 h-2.5',
    },
    small: {
      container: 'px-2 py-0.5 text-[10px]',
      icon: 'w-3 h-3',
    },
    medium: {
      container: 'px-3 py-1 text-xs',
      icon: 'w-4 h-4',
    },
    large: {
      container: 'px-4 py-1.5 text-sm',
      icon: 'w-5 h-5',
    },
  };

  const config = configs[tier] || configs.shadow;
  const sizeClass = sizeClasses[size];
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        border rounded-lg font-heading font-bold uppercase tracking-tight shadow-sm
        ${sizeClass.container}
      `}
    >
      {showIcon && <Icon className={`${sizeClass.icon} ${config.iconColor}`} strokeWidth={1.5} />}
      <span>{config.label}</span>
    </span>
  );
}
