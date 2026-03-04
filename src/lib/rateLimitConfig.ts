/**
 * Rate limiting configuration for different actions in the application.
 *
 * Each action has a limit (number of requests) and a window (time period in milliseconds).
 * These values are tuned to prevent spam while allowing legitimate usage.
 */

export type RateLimitAction = 'review' | 'post' | 'badge_give' | 'follow' | 'scan';

interface RateLimitRule {
  limit: number;
  windowMs: number;
  windowMinutes?: number;
}

const HOUR_IN_MS = 60 * 60 * 1000;

/**
 * Default rate limit configurations for each action type.
 *
 * - review: Posting reviews about vehicles (10 per hour)
 * - post: Creating social posts (20 per hour)
 * - badge_give: Giving badges to other users (30 per hour)
 * - follow: Following other users (60 per hour)
 * - scan: Scanning license plates (30 per hour)
 */
export const RATE_LIMIT_CONFIG: Record<RateLimitAction, RateLimitRule> = {
  review: {
    limit: 10,
    windowMs: HOUR_IN_MS,
    windowMinutes: 60
  },
  post: {
    limit: 20,
    windowMs: HOUR_IN_MS,
    windowMinutes: 60
  },
  badge_give: {
    limit: 30,
    windowMs: HOUR_IN_MS,
    windowMinutes: 60
  },
  follow: {
    limit: 60,
    windowMs: HOUR_IN_MS,
    windowMinutes: 60
  },
  scan: {
    limit: 30,
    windowMs: HOUR_IN_MS,
    windowMinutes: 60
  }
};

/**
 * Gets the rate limit configuration for a specific action.
 */
export function getRateLimitConfig(action: RateLimitAction): RateLimitRule {
  return RATE_LIMIT_CONFIG[action];
}

/**
 * Gets a human-readable description of the rate limit for an action.
 */
export function getRateLimitDescription(action: RateLimitAction): string {
  const config = RATE_LIMIT_CONFIG[action];
  const minutes = config.windowMinutes || Math.floor(config.windowMs / (60 * 1000));

  if (minutes >= 60) {
    const hours = minutes / 60;
    return `${config.limit} per ${hours} hour${hours > 1 ? 's' : ''}`;
  }

  return `${config.limit} per ${minutes} minute${minutes > 1 ? 's' : ''}`;
}

/**
 * Gets a user-friendly name for each action type.
 */
export function getActionDisplayName(action: RateLimitAction): string {
  const displayNames: Record<RateLimitAction, string> = {
    review: 'Review',
    post: 'Post',
    badge_give: 'Badge Award',
    follow: 'Follow',
    scan: 'Scan'
  };

  return displayNames[action];
}
