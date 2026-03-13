import { useState } from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  avatarUrl?: string | null;
  src?: string | null;
  userName?: string | null;
  handle?: string;
  userId?: string;
  size?: 'xs' | 'sm' | 'small' | 'md' | 'medium' | 'large' | 'lg' | 'xl';
  className?: string;
  alt?: string;
}

export function UserAvatar({ avatarUrl, src, userName, handle, userId, size = 'medium', className = '', alt }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    small: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    medium: 'w-10 h-10 text-sm',
    large: 'w-16 h-16 text-xl',
    lg: 'w-24 h-24 text-2xl',
    xl: 'w-32 h-32 text-3xl',
  };

  const iconSizes = {
    xs: 12,
    sm: 16,
    small: 16,
    md: 20,
    medium: 20,
    large: 32,
    lg: 48,
    xl: 64,
  };

  const displayName = userName || handle;
  const imageUrl = src || avatarUrl;

  if (imageUrl && !imgError) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <img
          src={imageUrl}
          alt={alt || displayName || 'User'}
          className="w-full h-full object-cover"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold flex-shrink-0 text-white ${className}`}
      style={{ background: 'linear-gradient(135deg, #F97316, #F97316)' }}
    >
      {displayName ? (
        <span>{displayName[0]?.toUpperCase()}</span>
      ) : (
        <User size={iconSizes[size]} className="text-white opacity-70" />
      )}
    </div>
  );
}
