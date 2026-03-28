import { useState, useEffect, useCallback } from 'react';
import { Users, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FollowButton } from './FollowButton';
import { UserAvatar } from './UserAvatar';
import type { OnNavigate } from '../types/navigation';
import { ModalShell, modalButtonPrimary } from './ui/ModalShell';

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

  const loadProfile = useCallback(async () => {
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
  }, [userId, currentUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleViewFull = () => {
    if (profile && onNavigate) {
      onNavigate('user-profile', { userId: profile.id });
      onClose();
    }
  };

  const isOwnProfile = currentUser?.id === userId;
  const showFullProfile = !profile?.is_private || canViewPrivate || isOwnProfile;

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      eyebrow="Driver"
      title={profile ? `@${profile.handle}` : 'Loading...'}
      footer={profile && onNavigate ? (
        <button onClick={handleViewFull} style={{ ...modalButtonPrimary, width: '100%' }}>
          View Full Profile
        </button>
      ) : undefined}
    >
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.1)',
            borderTopColor: '#F97316',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : !profile ? (
        <div style={{ padding: '40px 0', textAlign: 'center' as const }}>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7a8e9e' }}>User not found</p>
        </div>
      ) : (
        <>
          {/* Avatar + handle + follow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <UserAvatar avatarUrl={profile.avatar_url} handle={profile.handle} size="lg" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'Rajdhani', sans-serif", fontSize: 17, fontWeight: 700,
                color: '#eef4f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
              }}>
                @{profile.handle}
              </div>
              {profile.bio && (
                <div style={{
                  fontFamily: "'Barlow', sans-serif", fontSize: 12,
                  color: '#7a8e9e', marginTop: 2, lineHeight: 1.4,
                }}>
                  {profile.bio}
                </div>
              )}
            </div>
            {!isOwnProfile && (
              <FollowButton targetUserId={userId} size="sm" />
            )}
          </div>

          {showFullProfile ? (
            <>
              {/* Stats row */}
              <div style={{
                display: 'flex', borderRadius: 8, overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: 14,
              }}>
                {[
                  { label: 'Followers', value: profile.follower_count },
                  { label: 'Spots', value: profile.spots_count },
                  { label: 'Badges', value: profile.badges_count },
                ].map((stat, i, arr) => (
                  <div key={stat.label} style={{
                    flex: 1, padding: '12px 0', textAlign: 'center' as const,
                    background: '#131920',
                    borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    <div style={{
                      fontFamily: "'Rajdhani', sans-serif", fontSize: 17, fontWeight: 700,
                      color: '#eef4f8', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                    }}>
                      {stat.value}
                    </div>
                    <div style={{
                      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700,
                      letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#445566',
                      marginTop: 3,
                    }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Driver rating */}
              {profile.avg_driver_rating > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 8,
                  background: '#131920', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <Star style={{ width: 16, height: 16, color: '#f0a030', fill: '#f0a030', flexShrink: 0 }} />
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600,
                    color: '#f0a030', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {profile.avg_driver_rating.toFixed(1)}
                  </span>
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7a8e9e' }}>
                    Driver Rating ({profile.driver_rating_count} {profile.driver_rating_count === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              )}
            </>
          ) : (
            <div style={{
              padding: '32px 0', textAlign: 'center' as const,
              background: '#131920', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <Users style={{ width: 28, height: 28, color: '#445566', margin: '0 auto 8px', display: 'block' }} strokeWidth={1} />
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 600, color: '#a8bcc8' }}>This profile is private</p>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7a8e9e', marginTop: 4 }}>Follow to see their content</p>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </ModalShell>
  );
}
