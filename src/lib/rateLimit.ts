/**
 * Server-side rate limiter to prevent spam and abuse.
 *
 * Uses database-backed rate limiting for security.
 * Falls back to client-side tracking if server check fails.
 */

import { supabase } from './supabase';

interface RateLimitEntry {
  timestamps: number[];
  lastCleanup: number;
}

interface RateLimitStore {
  [key: string]: RateLimitEntry;
}

// Client-side fallback store
const rateLimitStore: RateLimitStore = {};

// Cleanup interval (run every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastGlobalCleanup = Date.now();

/**
 * Performs global cleanup of old entries to prevent memory leaks.
 * Removes entries that haven't been accessed recently.
 */
function performGlobalCleanup(): void {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  Object.keys(rateLimitStore).forEach(key => {
    const entry = rateLimitStore[key];
    if (now - entry.lastCleanup > maxAge) {
      delete rateLimitStore[key];
    }
  });

  lastGlobalCleanup = now;
}

/**
 * Cleans up old timestamps from a specific entry based on the window.
 */
function cleanupEntry(entry: RateLimitEntry, windowMs: number): void {
  const now = Date.now();
  const cutoff = now - windowMs;

  entry.timestamps = entry.timestamps.filter(timestamp => timestamp > cutoff);
  entry.lastCleanup = now;
}

/**
 * Gets the remaining time (in milliseconds) until the user can perform the action again.
 * Returns 0 if the action is currently allowed.
 */
export function getRemainingTime(userId: string, action: string, limit: number, windowMs: number): number {
  const key = `${userId}:${action}`;
  const entry = rateLimitStore[key];

  if (!entry || entry.timestamps.length < limit) {
    return 0;
  }

  const now = Date.now();
  const oldestTimestamp = entry.timestamps[0];
  const timeUntilExpiry = (oldestTimestamp + windowMs) - now;

  return Math.max(0, timeUntilExpiry);
}

/**
 * Checks if a user has exceeded the rate limit for a specific action (server-side).
 *
 * @param userId - The unique identifier for the user
 * @param action - The action being performed (e.g., 'review', 'post', 'badge_give')
 * @param limit - Maximum number of requests allowed in the time window
 * @param windowMs - Time window in milliseconds
 * @returns true if the action is allowed, false if rate limited
 */
export async function checkRateLimitServer(
  userId: string,
  action: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt?: Date }> {
  try {
    const windowMinutes = Math.floor(windowMs / 60000);

    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_action_type: action,
      p_max_actions: limit,
      p_window_minutes: windowMinutes
    });

    if (error) {
      console.error('Server rate limit check failed:', error);
      return { allowed: checkRateLimitClient(userId, action, limit, windowMs), remaining: 0 };
    }

    return {
      allowed: data.allowed,
      remaining: data.remaining,
      resetAt: data.reset_at ? new Date(data.reset_at) : undefined
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    return { allowed: checkRateLimitClient(userId, action, limit, windowMs), remaining: 0 };
  }
}

/**
 * Records a rate-limited action on the server.
 *
 * @param userId - The unique identifier for the user
 * @param action - The action being performed
 */
export async function recordRateLimitServer(userId: string, action: string): Promise<void> {
  try {
    await supabase.rpc('record_rate_limit_action', {
      p_user_id: userId,
      p_action_type: action
    });
  } catch (error) {
    console.error('Failed to record rate limit:', error);
  }
}

/**
 * Client-side rate limit check (fallback).
 *
 * @param userId - The unique identifier for the user
 * @param action - The action being performed
 * @param limit - Maximum number of requests allowed in the time window
 * @param windowMs - Time window in milliseconds
 * @returns true if the action is allowed, false if rate limited
 */
function checkRateLimitClient(
  userId: string,
  action: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const key = `${userId}:${action}`;

  // Periodic global cleanup
  if (now - lastGlobalCleanup > CLEANUP_INTERVAL_MS) {
    performGlobalCleanup();
  }

  // Get or create entry
  let entry = rateLimitStore[key];
  if (!entry) {
    entry = {
      timestamps: [],
      lastCleanup: now
    };
    rateLimitStore[key] = entry;
  }

  // Clean up old timestamps for this entry
  cleanupEntry(entry, windowMs);

  // Check if limit is exceeded
  if (entry.timestamps.length >= limit) {
    return false;
  }

  return true;
}

/**
 * Legacy client-side rate limit check (deprecated, use checkRateLimitServer).
 */
export function checkRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowMs: number
): boolean {
  return checkRateLimitClient(userId, action, limit, windowMs);
}

/**
 * Records a request for rate limiting purposes.
 * Should be called after checkRateLimit returns true.
 *
 * @param userId - The unique identifier for the user
 * @param action - The action being performed
 */
export function recordRequest(userId: string, action: string): void {
  const now = Date.now();
  const key = `${userId}:${action}`;

  let entry = rateLimitStore[key];
  if (!entry) {
    entry = {
      timestamps: [],
      lastCleanup: now
    };
    rateLimitStore[key] = entry;
  }

  entry.timestamps.push(now);
}

/**
 * Gets the current request count for a user's action within the window.
 */
export function getCurrentCount(userId: string, action: string, windowMs: number): number {
  const key = `${userId}:${action}`;
  const entry = rateLimitStore[key];

  if (!entry) {
    return 0;
  }

  cleanupEntry(entry, windowMs);
  return entry.timestamps.length;
}

/**
 * Resets the rate limit for a specific user and action.
 * Useful for testing or administrative purposes.
 */
export function resetRateLimit(userId: string, action: string): void {
  const key = `${userId}:${action}`;
  delete rateLimitStore[key];
}
