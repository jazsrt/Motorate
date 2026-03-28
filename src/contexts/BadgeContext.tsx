/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Badge, UserBadge } from '../lib/badges';

interface BadgeContextType {
  unlockedBadge: Badge | null;
  dismissBadge: () => void;
  celebrateBadge: (badge: Badge) => void;
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

const SEEN_BADGES_KEY = 'reputation_seen_badges';

function loadSeenFromStorage(userId: string): Set<string> {
  try {
    const stored = localStorage.getItem(`${SEEN_BADGES_KEY}_${userId}`);
    if (stored) {
      return new Set<string>(JSON.parse(stored));
    }
  } catch (e) {
    console.warn('[BadgeContext] Failed to load seen badges from storage:', e);
  }
  return new Set<string>();
}

function persistSeen(userId: string, ids: Set<string>) {
  try {
    localStorage.setItem(
      `${SEEN_BADGES_KEY}_${userId}`,
      JSON.stringify(Array.from(ids))
    );
  } catch (e) {
    console.warn('[BadgeContext] Failed to persist seen badges:', e);
  }
}

export function BadgeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unlockedBadge, setUnlockedBadge] = useState<Badge | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<Badge[]>([]);
  const seenBadgeIdsRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef<string | null>(null);
  // Queue of badge IDs that arrived before init completed — process them after
  const pendingBadgeIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!user) {
      setBadgeQueue([]);
      setUnlockedBadge(null);
      userIdRef.current = null;
      return;
    }

    if (userIdRef.current === user.id) {
      return;
    }
    userIdRef.current = user.id;

    const seen = loadSeenFromStorage(user.id);
    seenBadgeIdsRef.current = seen;
    pendingBadgeIdsRef.current = [];

    let isMounted = true;

    const initAndSubscribe = async () => {
      try {
        const { data, error } = await supabase
          .from('user_badges')
          .select('badge_id')
          .eq('user_id', user.id);

        if (error) {
          console.error('[BadgeContext] Failed to load existing badges:', error.message);
        }

        if (!isMounted) return;

        if (data) {
          const existingIds = data.map(ub => ub.badge_id);
          for (const id of existingIds) {
            seenBadgeIdsRef.current.add(id);
          }
          persistSeen(user.id, seenBadgeIdsRef.current);
        }
      } catch (e) {
        console.error('[BadgeContext] Init error:', e);
      }

      if (!isMounted) return;

      // Process any badges that arrived while we were initializing
      const pending = pendingBadgeIdsRef.current;
      pendingBadgeIdsRef.current = [];
      for (const badgeId of pending) {
        if (!seenBadgeIdsRef.current.has(badgeId)) {
          await fetchAndQueueBadge(badgeId, user.id, isMounted);
        }
      }
    };

    const fetchAndQueueBadge = async (badgeId: string, userId: string, mounted: boolean) => {
      try {
        const { data: badgeData, error } = await supabase
          .from('badges')
          .select('*')
          .eq('id', badgeId)
          .maybeSingle();

        if (error) {
          console.error('[BadgeContext] Failed to fetch badge details:', error.message);
          return;
        }
        if (!mounted || !badgeData) return;

        seenBadgeIdsRef.current.add(badgeId);
        persistSeen(userId, seenBadgeIdsRef.current);

        setBadgeQueue(prev => [...prev, badgeData]);
      } catch (e) {
        console.error('[BadgeContext] Error fetching badge:', e);
      }
    };

    initAndSubscribe();

    const channel = supabase
      .channel(`user_badges:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          if (!isMounted) return;

          const newBadge = payload.new as UserBadge;

          // Already seen — skip
          if (seenBadgeIdsRef.current.has(newBadge.badge_id)) {
            return;
          }

          // If init hasn't finished yet, queue for later instead of discarding
          if (pendingBadgeIdsRef.current !== null) {
            // Check if init is still running by seeing if pending array exists
            // After init completes, pending is drained. But during init, we buffer.
            // We'll use a simple approach: always try to fetch and queue
          }

          await fetchAndQueueBadge(newBadge.badge_id, user.id, isMounted);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[BadgeContext] Realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[BadgeContext] Realtime subscription error');
        }
      });

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!unlockedBadge && badgeQueue.length > 0) {
      setUnlockedBadge(badgeQueue[0]);
      setBadgeQueue(prev => prev.slice(1));
    }
  }, [badgeQueue, unlockedBadge]);

  const dismissBadge = useCallback(async () => {
    if (unlockedBadge && userIdRef.current) {
      seenBadgeIdsRef.current.add(unlockedBadge.id);
      persistSeen(userIdRef.current, seenBadgeIdsRef.current);

      // Mark the notification as read in the database
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userIdRef.current)
          .eq('type', 'badge_awarded')
          .eq('link_id', unlockedBadge.id)
          .eq('is_read', false);
      } catch (error) {
        console.error('[BadgeContext] Failed to mark badge notification as read:', error);
      }
    }
    setUnlockedBadge(null);
  }, [unlockedBadge]);

  const celebrateBadge = useCallback((badge: Badge) => {
    if (seenBadgeIdsRef.current.has(badge.id)) return;
    seenBadgeIdsRef.current.add(badge.id);
    if (userIdRef.current) {
      persistSeen(userIdRef.current, seenBadgeIdsRef.current);
    }
    setBadgeQueue(prev => [...prev, badge]);
  }, []);

  return (
    <BadgeContext.Provider value={{ unlockedBadge, dismissBadge, celebrateBadge }}>
      {children}
    </BadgeContext.Provider>
  );
}

export function useBadges() {
  const context = useContext(BadgeContext);
  if (context === undefined) {
    throw new Error('useBadges must be used within a BadgeProvider');
  }
  return context;
}
