import React from 'react';

interface BadgeIconProps {
  iconPath?: string;
  size?: number;
  className?: string;
  alt?: string;
  locked?: boolean;
}

export function BadgeIcon({
  iconPath,
  size = 64,
  className = '',
  alt = 'Badge',
  locked = false
}: BadgeIconProps) {
  if (!iconPath) {
    return (
      <div
        className={`bg-surfacehighlight rounded-xl flex items-center justify-center ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <span className="text-gray-500 text-2xl">?</span>
      </div>
    );
  }

  if (iconPath.startsWith('emoji:')) {
    const emoji = iconPath.slice(6);
    return (
      <div
        className={`flex items-center justify-center select-none transition-all ${locked ? 'opacity-30 grayscale' : ''} ${className}`}
        style={{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.65}px`, lineHeight: 1 }}
        aria-label={alt}
      >
        {emoji}
      </div>
    );
  }

  return (
    <img
      src={`/badges/${iconPath}`}
      alt={alt}
      width={size}
      height={size}
      className={`select-none transition-all ${locked ? 'opacity-30 grayscale' : ''} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain'
      }}
      draggable={false}
      loading="lazy"
    />
  );
}
