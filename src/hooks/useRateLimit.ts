import { useState, useCallback, useEffect } from 'react';
import { checkRateLimit, recordRequest, getRemainingTime, getCurrentCount } from '../lib/rateLimit';
import { getRateLimitConfig, type RateLimitAction } from '../lib/rateLimitConfig';
import { useAuth } from '../contexts/AuthContext';

interface UseRateLimitReturn {
  isAllowed: boolean;
  checkAndConsume: () => boolean;
  remainingTime: number;
  currentCount: number;
  limit: number;
  reset: () => void;
}

/**
 * Custom hook for rate limiting user actions.
 *
 * @param action - The action type to rate limit
 * @returns Object with rate limit state and control functions
 *
 * @example
 * const { isAllowed, checkAndConsume, remainingTime } = useRateLimit('post');
 *
 * if (!isAllowed) {
 *   return <RateLimitError action="post" remainingTime={remainingTime} />;
 * }
 *
 * const handleSubmit = () => {
 *   if (checkAndConsume()) {
 *     // Proceed with action
 *   }
 * };
 */
export function useRateLimit(action: RateLimitAction): UseRateLimitReturn {
  const { user } = useAuth();
  const config = getRateLimitConfig(action);

  const [isAllowed, setIsAllowed] = useState(true);
  const [remainingTime, setRemainingTime] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);

  // Update state based on current rate limit status
  const updateStatus = useCallback(() => {
    if (!user) {
      setIsAllowed(true);
      setRemainingTime(0);
      setCurrentCount(0);
      return;
    }

    const allowed = checkRateLimit(user.id, action, config.limit, config.windowMs);
    const remaining = getRemainingTime(user.id, action, config.limit, config.windowMs);
    const count = getCurrentCount(user.id, action, config.windowMs);

    setIsAllowed(allowed);
    setRemainingTime(remaining);
    setCurrentCount(count);
  }, [user, action, config.limit, config.windowMs]);

  // Check rate limit and consume a request if allowed
  const checkAndConsume = useCallback((): boolean => {
    if (!user) {
      return false;
    }

    const allowed = checkRateLimit(user.id, action, config.limit, config.windowMs);

    if (allowed) {
      recordRequest(user.id, action);
      updateStatus();
      return true;
    }

    updateStatus();
    return false;
  }, [user, action, config.limit, config.windowMs, updateStatus]);

  // Reset function for testing or administrative purposes
  const reset = useCallback(() => {
    updateStatus();
  }, [updateStatus]);

  // Update status on mount and when dependencies change
  useEffect(() => {
    updateStatus();
  }, [updateStatus]);

  // Update remaining time countdown every second when rate limited
  useEffect(() => {
    if (!isAllowed && remainingTime > 0) {
      const interval = setInterval(() => {
        updateStatus();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isAllowed, remainingTime, updateStatus]);

  return {
    isAllowed,
    checkAndConsume,
    remainingTime,
    currentCount,
    limit: config.limit,
    reset
  };
}
