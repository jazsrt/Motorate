import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FollowButton } from './FollowButton';
import type { OnNavigate } from '../types/navigation';

interface SuggestedUser {
  id: string;
  handle: string;
  avatar_url: string | null;
  reputation_score: number;
}

interface SuggestedUsersProps {
  onNavigate?: OnNavigate;
}

const DISMISSED_KEY = 'motorate_suggested_dismissed';

export function SuggestedUsers({ onNavigate }: SuggestedUsersProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
  });

  const loadSuggestedUsers = useCallback(async () => {
    try {
      if (!user) return;
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('status', 'accepted');

      const followingIds = followingData?.map(f => f.following_id) || [];

      const { data } = await supabase
        .from('profiles')
        .select('id, handle, avatar_url, reputation_score')
        .neq('id', user.id)
        .not('id', 'in', followingIds.length > 0 ? `(${followingIds.join(',')})` : '()')
        .order('reputation_score', { ascending: false })
        .limit(12);

      setUsers(data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !dismissed) loadSuggestedUsers();
  }, [user, dismissed, loadSuggestedUsers]);

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISSED_KEY, '1'); } catch {}
  };

  const handleFollowChange = (userId: string, isFollowing: boolean) => {
    if (isFollowing) setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleUserClick = (userId: string) => {
    if (onNavigate) {
      onNavigate('user-profile', { userId });
    } else {
      window.location.hash = `/user-profile/${userId}`;
    }
  };

  if (loading || users.length === 0 || !user || dismissed) return null;

  return (
    <div
      className="rounded-xl p-3 mb-4 relative"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          People You Might Know
        </span>
        <button
          onClick={handleDismiss}
          className="rounded-lg p-0.5 transition-colors"
          style={{ color: 'var(--text-quaternary)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-quaternary)'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        className="flex gap-3 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {users.map(suggestedUser => (
          <div
            key={suggestedUser.id}
            className="flex-shrink-0 flex flex-col items-center gap-1.5"
            style={{ width: 56 }}
          >
            <button
              onClick={() => handleUserClick(suggestedUser.id)}
              className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-white text-sm transition-opacity hover:opacity-80"
              style={{ background: 'linear-gradient(135deg, #F97316, #06b6d4)', border: '2px solid var(--border-2)' }}
            >
              {suggestedUser.avatar_url ? (
                <img
                  src={suggestedUser.avatar_url}
                  alt={suggestedUser.handle}
                  className="w-full h-full object-cover"
                  onError={e => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    (e.currentTarget.parentElement as HTMLElement).textContent = suggestedUser.handle?.[0]?.toUpperCase() || '?';
                  }}
                />
              ) : (
                suggestedUser.handle?.[0]?.toUpperCase() || '?'
              )}
            </button>

            <button
              onClick={() => handleUserClick(suggestedUser.id)}
              className="text-center w-full transition-opacity hover:opacity-80"
            >
              <div className="text-[11px] font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                {suggestedUser.handle}
              </div>
              <div className="text-[10px] leading-tight" style={{ color: 'var(--text-tertiary)' }}>
                {suggestedUser.reputation_score} rep
              </div>
            </button>

            <FollowButton
              targetUserId={suggestedUser.id}
              onFollowChange={(isFollowing) => handleFollowChange(suggestedUser.id, isFollowing)}
              size="xs"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
