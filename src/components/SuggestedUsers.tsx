import { useEffect, useState, useCallback } from 'react';
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
    } catch { // intentionally empty
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !dismissed) loadSuggestedUsers();
  }, [user, dismissed, loadSuggestedUsers]);

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISSED_KEY, '1'); } catch { /* intentionally empty */ }
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
    <div style={{
      margin: '4px 0', padding: '12px 14px',
      background: '#0a0d14', borderTop: '1px solid rgba(249,115,22,0.12)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
          letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#445566',
        }}>
          People You Might Know
        </span>
        <button
          onClick={handleDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#3a4e60' }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollbarWidth: 'none' as const, paddingBottom: 2 }}>
        {users.map(suggestedUser => (
          <div key={suggestedUser.id} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6, width: 60 }}>
            <button
              onClick={() => handleUserClick(suggestedUser.id)}
              style={{
                width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #F97316, #fb923c)',
                border: '2px solid rgba(255,255,255,0.08)',
                fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#fff',
                cursor: 'pointer',
              }}
            >
              {suggestedUser.avatar_url ? (
                <img src={suggestedUser.avatar_url} alt={suggestedUser.handle}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                suggestedUser.handle?.[0]?.toUpperCase() || '?'
              )}
            </button>

            <button onClick={() => handleUserClick(suggestedUser.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' as const, width: '100%', padding: 0 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600, color: '#eef4f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                {suggestedUser.handle}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#5a6e7e' }}>
                {suggestedUser.reputation_score} RP
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
