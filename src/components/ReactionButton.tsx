import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Flame, Skull, HandMetal, Smile, AlertCircle, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { addReaction, getReactionCounts, getUserReaction, ReactionType, ReactionCounts } from '../lib/reactions';
import { sounds } from '../lib/sounds';
import { floatPoints, haptic } from '../utils/floatPoints';

const REACTION_ICONS: Record<ReactionType, React.ElementType> = {
  fire: Flame,
  heart: Heart,
  dead: Skull,
  applause: HandMetal,
  laugh: Smile,
  shock: AlertCircle,
  angry: Zap,
};
import { supabase } from '../lib/supabase';
import type { OnNavigate } from '../types/navigation';

interface ReactionUser {
  id: string;
  handle: string;
  avatar_url: string | null;
  reaction_type: ReactionType;
}

interface ReactionButtonProps {
  postId: string;
  initialCount?: number;
  onCountChange?: (newCount: number) => void;
  onNavigate?: OnNavigate;
}

export function ReactionButton({ postId, onCountChange, onNavigate }: ReactionButtonProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [counts, setCounts] = useState<ReactionCounts>({ fire: 0, heart: 0, dead: 0, applause: 0, laugh: 0, shock: 0, angry: 0 });
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [showReactors, setShowReactors] = useState(false);
  const [reactors, setReactors] = useState<ReactionUser[]>([]);
  const [reactorsTotal, setReactorsTotal] = useState(0);
  const [loadingReactors, setLoadingReactors] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const reactorsRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadReactions = useCallback(async () => {
    try {
      const reactionCounts = await getReactionCounts(postId);
      setCounts(reactionCounts);
      if (user) {
        const userReactionType = await getUserReaction(postId, user.id);
        setUserReaction(userReactionType);
      }
      const totalCount = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);
      if (onCountChange) onCountChange(totalCount);
    } catch {
      // intentionally empty
    }
  }, [postId, user, onCountChange]);

  useEffect(() => {
    loadReactions();
  }, [postId, user, loadReactions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current && buttonRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    }
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  const loadReactors = async () => {
    if (loadingReactors) return;
    setLoadingReactors(true);
    try {
      const { data, count } = await supabase
        .from('reactions')
        .select('user_id, reaction_type, profiles:profiles!user_id(id, handle, avatar_url)', { count: 'exact' })
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(5);

      const mapped: ReactionUser[] = (data || []).map((r) => {
        const profiles = r.profiles as any;
        return {
          id: r.user_id as string,
          handle: (profiles?.handle as string) || 'unknown',
          avatar_url: (profiles?.avatar_url as string) || null,
          reaction_type: r.reaction_type as ReactionType,
        };
      });
      setReactors(mapped);
      setReactorsTotal(count || 0);
    } catch {
      // intentionally empty
    } finally {
      setLoadingReactors(false);
    }
  };

  const handleReaction = async (reactionType: ReactionType) => {
    if (!user || loading) return;
    setLoading(true);
    setAnimating(true);
    try {
      const result = await addReaction(postId, user.id, reactionType);
      if (result.removed) {
        setUserReaction(null);
      } else {
        setUserReaction(reactionType);
        sounds.points();
        haptic(25);
        floatPoints(buttonRef.current, '+2');
        buttonRef.current?.classList.add('like-pop');
        setTimeout(() => buttonRef.current?.classList.remove('like-pop'), 350);
      }
      await loadReactions();
      setShowPicker(false);
      setTimeout(() => setAnimating(false), 300);
    } catch (err: unknown) {
      setAnimating(false);
      const errObj = err instanceof Error ? err : null;
      let errorMessage = 'Failed to update reaction';
      if (errObj?.message?.includes('row-level security')) {
        errorMessage = 'Authentication error. Please refresh and try again.';
      } else if (errObj?.message) {
        errorMessage = errObj.message;
      }
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = () => {
    if (!user) {
      showToast('Please sign in to react to posts', 'error');
      return;
    }
    if (userReaction) {
      handleReaction(userReaction);
    } else {
      setShowPicker(!showPicker);
    }
  };

  const handleLongPress = () => {
    if (!user) {
      showToast('Please sign in to react to posts', 'error');
      return;
    }
    setShowPicker(true);
  };

  const handleCountMouseEnter = () => {
    hoverTimerRef.current = setTimeout(async () => {
      setShowReactors(true);
      await loadReactors();
    }, 200);
  };

  const handleCountMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setTimeout(() => {
      if (!reactorsRef.current?.matches(':hover')) {
        setShowReactors(false);
      }
    }, 150);
  };

  const handleReactorClick = (userId: string) => {
    setShowReactors(false);
    if (onNavigate) {
      onNavigate('user-profile', { userId });
    } else {
      window.location.hash = `/user-profile/${userId}`;
    }
  };

  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const reactionTypes: ReactionType[] = ['heart', 'fire', 'dead', 'applause', 'laugh', 'shock', 'angry'];

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        onContextMenu={(e) => {
          e.preventDefault();
          handleLongPress();
        }}
        className={`min-h-[44px] flex items-center gap-1.5 transition-all duration-300 ${
          animating ? 'scale-125' : 'scale-100'
        } active:scale-90`}
        style={{ color: userReaction ? '#F97316' : 'var(--text-tertiary)' }}
        onMouseEnter={e => !userReaction && ((e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)')}
        onMouseLeave={e => !userReaction && ((e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)')}
        disabled={loading}
        title={userReaction ? 'Change or remove reaction' : 'React to this post'}
      >
        {userReaction && userReaction !== 'heart' ? (
          (() => { const Icon = REACTION_ICONS[userReaction]; return <Icon className="w-5 h-5" />; })()
        ) : (
          <Heart className={`w-5 h-5 ${userReaction ? 'fill-current' : ''}`} strokeWidth={1.5} />
        )}
      </button>

      {totalCount > 0 && (
        <div className="relative">
          <span
            className="text-[13px] cursor-default select-none"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={handleCountMouseEnter}
            onMouseLeave={handleCountMouseLeave}
          >
            {totalCount}
          </span>

          {showReactors && (
            <div
              ref={reactorsRef}
              onMouseEnter={() => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); }}
              onMouseLeave={() => setShowReactors(false)}
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-xl shadow-2xl z-50 py-2 min-w-[160px]"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-2)' }}
            >
              {loadingReactors ? (
                <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Loading...</div>
              ) : reactors.length === 0 ? (
                <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>No reactions yet</div>
              ) : (
                <>
                  {reactors.map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleReactorClick(r.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 transition-colors text-left"
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #F97316, #06b6d4)' }}>
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          r.handle?.[0]?.toUpperCase() || '?'
                        )}
                      </div>
                      <span className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        @{r.handle}
                      </span>
                      <span className="ml-auto flex-shrink-0">{(() => { const Icon = REACTION_ICONS[r.reaction_type]; return <Icon className="w-4 h-4" />; })()}</span>
                    </button>
                  ))}
                  {reactorsTotal > 5 && (
                    <div className="px-3 pt-1 pb-1.5 text-[10px]" style={{ color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)' }}>
                      and {reactorsTotal - 5} others
                    </div>
                  )}
                </>
              )}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                <div className="border-8 border-transparent" style={{ borderTopColor: 'var(--border-2)' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute bottom-full mb-2 left-0 bg-[var(--s1)] border border-[var(--border2)] rounded-lg shadow-xl p-2 flex gap-2 z-50"
        >
          {reactionTypes.map((type) => (
            <button
              key={type}
              onClick={() => handleReaction(type)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all hover:bg-[var(--s2)] ${
                userReaction === type ? 'bg-[var(--s2)] ring-2 ring-[#F97316]' : ''
              }`}
              disabled={loading}
            >
              {(() => { const Icon = REACTION_ICONS[type]; return <Icon className="w-6 h-6" />; })()}
              {counts[type] > 0 && (
                <span className="text-xs text-tertiary">{counts[type]}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
