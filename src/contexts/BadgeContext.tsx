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
  } catch {
    // Silent failure
  }
  return new Set<string>();
}

function persistSeen(userId: string, ids: Set<string>) {
  try {
    localStorage.setItem(
      `${SEEN_BADGES_KEY}_${userId}`,
      JSON.stringify(Array.from(ids))
    );
  } catch {
    // Silent failure
  }
}

export function BadgeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unlockedBadge, setUnlockedBadge] = useState<Badge | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<Badge[]>([]);
  const seenBadgeIdsRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setBadgeQueue([]);
      setUnlockedBadge(null);
      readyRef.current = false;
      userIdRef.current = null;
      return;
    }

    if (userIdRef.current === user.id) {
      return;
    }
    userIdRef.current = user.id;

    const seen = loadSeenFromStorage(user.id);
    seenBadgeIdsRef.current = seen;
    readyRef.current = false;

    let isMounted = true;

    const initAndSubscribe = async () => {
      try {
        const { data } = await supabase
          .from('user_badges')
          .select('badge_id')
          .eq('user_id', user.id);

        if (!isMounted) return;

        if (data) {
          const existingIds = data.map(ub => ub.badge_id);
          for (const id of existingIds) {
            seenBadgeIdsRef.current.add(id);
          }
          persistSeen(user.id, seenBadgeIdsRef.current);
        }
      } catch {
        // Silent failure
      }

      if (!isMounted) return;
      readyRef.current = true;
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

          if (seenBadgeIdsRef.current.has(newBadge.badge_id)) {
            return;
          }

          if (!readyRef.current) {
            seenBadgeIdsRef.current.add(newBadge.badge_id);
            persistSeen(user.id, seenBadgeIdsRef.current);
            return;
          }

          try {
            // Check if notification for this badge has already been read
            const { data: notificationData } = await supabase
              .from('notifications')
              .select('is_read')
              .eq('user_id', user.id)
              .eq('type', 'badge_awarded')
              .eq('link_id', newBadge.badge_id)
              .maybeSingle();

            // If notification was already read, don't show the badge modal
            if (notificationData?.is_read) {
              seenBadgeIdsRef.current.add(newBadge.badge_id);
              persistSeen(user.id, seenBadgeIdsRef.current);
              return;
            }

            const { data: badgeData, error } = await supabase
              .from('badges')
              .select('*')
              .eq('id', newBadge.badge_id)
              .maybeSingle();

            if (error || !isMounted || !badgeData) return;

            seenBadgeIdsRef.current.add(newBadge.badge_id);
            persistSeen(user.id, seenBadgeIdsRef.current);

            setBadgeQueue(prev => [...prev, badgeData]);
          } catch {
            // Silent failure
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
      readyRef.current = false;
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

      // Mark the notification as read in the database to prevent it from reappearing
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userIdRef.current)
          .eq('type', 'badge_awarded')
          .eq('link_id', unlockedBadge.id)
          .eq('is_read', false);
      } catch (error) {
        console.error('Failed to mark badge notification as read:', error);
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
