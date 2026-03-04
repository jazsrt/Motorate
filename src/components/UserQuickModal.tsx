import { useState, useEffect } from 'react';
import { X, ExternalLink, Star, Users, Eye, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FollowButton } from './FollowButton';
import { UserAvatar } from './UserAvatar';
import type { OnNavigate } from '../types/navigation';

interface UserQuickModalProps {
  userId: string;
  onClose: () => void;
  onNavigate?: OnNavigate;
}

interface UserPreview {
  id: string;
  handle: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  follower_count: number;
  following_count: number;
  spots_count: number;
  badges_count: number;
  avg_driver_rating: number;
  driver_rating_count: number;
}

export function UserQuickModal({ userId, onClose, onNavigate }: UserQuickModalProps) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [canViewPrivate, setCanViewPrivate] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      const [profileResult, countsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, handle, avatar_url, bio, is_private')
          .eq('id', userId)
          .maybeSingle(),
        Promise.all([
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId).eq('status', 'accepted'),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId).eq('status', 'accepted'),
          supabase.from('spot_history').select('*', { count: 'exact', head: true }).eq('spotter_id', userId),
          supabase.from('user_badges').select('*', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('driver_ratings').select('rating').eq('rated_user_id', userId),
        ]),
      ]);

      const [followers, following, spots, badges, ratingsData] = countsResult;
      const ratings = ratingsData.data || [];
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
        : 0;

      if (profileResult.data) {
        const p = profileResult.data;
        setProfile({
          id: p.id,
          handle: p.handle,
          avatar_url: p.avatar_url,
          bio: p.bio,
          is_private: p.is_private || false,
          follower_count: followers.count || 0,
          following_count: following.count || 0,
          spots_count: spots.count || 0,
          badges_count: badges.count || 0,
          avg_driver_rating: Math.round(avgRating * 10) / 10,
          driver_rating_count: ratings.length,
        });

        if (p.is_private && currentUser && currentUser.id !== userId) {
          const { data: followRow } = await supabase
            .from('follows')
            .select('status')
            .eq('follower_id', currentUser.id)
            .eq('following_id', userId)
            .maybeSingle();
          setCanViewPrivate(followRow?.status === 'accepted');
        } else {
          setCanViewPrivate(true);
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const handleViewFull = () => {
    if (profile && onNavigate) {
      onNavigate('user-profile', { userId: profile.id });
      onClose();
    }
  };

  const isOwnProfile = currentUser?.id === userId;
  const showFullProfile = !profile?.is_private || canViewPrivate || isOwnProfile;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end"
      style={{ background: 'rgba(20,28,38,0.92)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full animate-sheet-up"
        style={{
          background: 'var(--surface)',
          borderRadius: '14px 14px 0 0',
          borderTop: '1px solid var(--border-2)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="rounded-full" style={{ width: 28, height: 2, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-[15px] font-normal" style={{ color: 'var(--text-primary)', letterSpacing: '0.3px' }}>
            Profile
          </h2>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}
          >
            <X className="w-2.5 h-2.5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)' }} />
            </div>
          ) : !profile ? (
            <div className="py-10 text-center">
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>User not found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <UserAvatar avatarUrl={profile.avatar_url} handle={profile.handle} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    @{profile.handle}
                  </p>
                  {profile.is_private && !showFullProfile && (
                    <p className="text-[11px] mt-0.5 font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      Private Profile
                    </p>
                  )}
                </div>
                {!isOwnProfile && (
                  <FollowButton targetUserId={userId} size="sm" />
                )}
              </div>

              {showFullProfile ? (
                <>
                  {profile.bio && (
                    <p className="text-[13px] leading-[1.6]" style={{ color: 'var(--text-secondary)' }}>
                      {profile.bio}
                    </p>
                  )}

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Followers', value: profile.follower_count, icon: <Users className="w-3.5 h-3.5" /> },
                      { label: 'Following', value: profile.following_count, icon: <Users className="w-3.5 h-3.5" /> },
                      { label: 'Spots', value: profile.spots_count, icon: <Eye className="w-3.5 h-3.5" /> },
                      { label: 'Badges', value: profile.badges_count, icon: <Award className="w-3.5 h-3.5" /> },
                    ].map(stat => (
                      <div
                        key={stat.label}
                        className="flex flex-col items-center gap-1 py-3 rounded-xl"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                      >
                        <span style={{ color: 'var(--text-tertiary)' }}>{stat.icon}</span>
                        <span className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</span>
                        <span className="text-[9px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</span>
                      </div>
                    ))}
                  </div>

                  {profile.avg_driver_rating > 0 && (
                    <div
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                    >
                      <Star className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                      <div>
                        <span className="text-[14px] font-bold" style={{ color: '#f59e0b' }}>
                          {profile.avg_driver_rating.toFixed(1)}
                        </span>
                        <span className="text-[11px] ml-1.5" style={{ color: 'var(--text-tertiary)' }}>
                          Driver Rating ({profile.driver_rating_count} {profile.driver_rating_count === 1 ? 'review' : 'reviews'})
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div
                  className="py-8 text-center rounded-xl"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                  <Users className="w-8 h-8 mx-auto mb-2" strokeWidth={1} style={{ color: 'var(--text-quaternary)' }} />
                  <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>This profile is private</p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Follow to see their content</p>
                </div>
              )}
            </div>
          )}
        </div>

        {profile && onNavigate && (
          <div
            className="px-5 py-4"
            style={{ borderTop: '1px solid var(--border)', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={handleViewFull}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-bold uppercase transition-all active:scale-[0.98]"
              style={{ background: 'var(--accent)', color: 'var(--bg)', letterSpacing: '0.8px' }}
            >
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
              View Full Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
