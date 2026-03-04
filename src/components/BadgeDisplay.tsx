import { useEffect, useState } from 'react';
import { getUserBadges, UserBadge } from '../lib/reputation';
import { getBadgeIcon } from '../lib/badgeIcons';

interface BadgeDisplayProps {
  userId: string;
  maxShow?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function BadgeDisplay({ userId, maxShow = 5, size = 'md' }: BadgeDisplayProps) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadges();
  }, [userId]);

  async function loadBadges() {
    try {
      const data = await getUserBadges(userId);
      setBadges(data);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || badges.length === 0) return null;

  const displayBadges = badges.slice(0, maxShow);
  const remainingCount = badges.length - maxShow;

  const sizeClasses = {
    sm: 'w-6 h-6 text-lg',
    md: 'w-8 h-8 text-xl',
    lg: 'w-10 h-10 text-2xl'
  };

  return (
    <div className="flex items-center gap-1">
      {displayBadges.map((userBadge) => {
        if (!userBadge.badge) return null;

        return (
          <div
            key={userBadge.id}
            className={`${sizeClasses[size]} bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-full flex items-center justify-center cursor-help hover:scale-110 transition-transform shadow-sm`}
            title={`${userBadge.badge.name}: ${userBadge.badge.description}`}
          >
            <div className="w-4/5 h-4/5 flex items-center justify-center">
              {getBadgeIcon(userBadge.badge.icon_name)}
            </div>
          </div>
        );
      })}

      {remainingCount > 0 && (
        <div
          className={`${sizeClasses[size]} bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 cursor-help`}
          title={`${remainingCount} more ${remainingCount === 1 ? 'badge' : 'badges'}`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
