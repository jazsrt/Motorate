import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';
import { Users, User, Star, VolumeX, Ban, Clock, Check, X } from 'lucide-react';
import { FollowButton } from '../components/FollowButton';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface FollowersPageProps {
  onNavigate: OnNavigate;
  viewingUserId?: string;
}

interface UserData {
  id: string;
  handle: string;
  avatar_url: string | null;
  profile_car_image: string | null;
  location: string | null;
  reputation_score: number;
  vehicle?: {
    year: number;
    make: string;
    model: string;
  };
  followData?: {
    muted: boolean;
    favorite: boolean;
  };
  isBlocked?: boolean;
}

type TabType = 'friends' | 'pending';

export function FollowersPage({ onNavigate, viewingUserId }: FollowersPageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [followers, setFollowers] = useState<UserData[]>([]);
  const [pendingRequests, setPendingRequests] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [_showMenuFor, setShowMenuFor] = useState<string | null>(null);

  const targetUserId = viewingUserId || user?.id;
  const isOwnProfile = targetUserId === user?.id;

  const loadFollowers = useCallback(async () => {
    if (!targetUserId) return;

    const { data: followData } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', targetUserId)
      .eq('status', 'accepted');

    if (!followData || followData.length === 0) {
      setFollowers([]);
      return;
    }

    const followerIds = followData.map((f) => f.follower_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followerIds);

    if (!profiles) {
      setFollowers([]);
      return;
    }

    const enrichedProfiles = await Promise.all(
      profiles.map(async (profile) => {
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('year, make, model')
          .eq('owner_id', profile.id)
          .eq('is_claimed', true)
          .maybeSingle();

        let isBlocked = false;
        if (user) {
          const { data: blockData } = await supabase
            .from('blocks')
            .select('id')
            .or(`blocker_id.eq.${user.id},blocker_id.eq.${profile.id}`)
            .or(`blocked_id.eq.${profile.id},blocked_id.eq.${user.id}`)
            .maybeSingle();
          isBlocked = !!blockData;
        }

        return {
          ...profile,
          vehicle: vehicle || undefined,
          isBlocked,
        };
      })
    );

    setFollowers(enrichedProfiles);
  }, [targetUserId, user]);

  const loadPendingRequests = useCallback(async () => {
    if (!targetUserId) return;

    const { data: followData } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', targetUserId)
      .eq('status', 'pending');

    if (!followData || followData.length === 0) {
      setPendingRequests([]);
      return;
    }

    const followerIds = followData.map((f) => f.follower_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followerIds);

    if (!profiles) {
      setPendingRequests([]);
      return;
    }

    const enrichedProfiles = await Promise.all(
      profiles.map(async (profile) => {
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('year, make, model')
          .eq('owner_id', profile.id)
          .eq('is_claimed', true)
          .maybeSingle();

        return {
          ...profile,
          vehicle: vehicle || undefined,
        };
      })
    );

    setPendingRequests(enrichedProfiles);
  }, [targetUserId]);

  const loadData = useCallback(async () => {
    if (!targetUserId) return;

    setLoading(true);

    if (activeTab === 'friends') {
      await loadFollowers();
    } else {
      await loadPendingRequests();
    }

    setLoading(false);
  }, [targetUserId, activeTab, loadFollowers, loadPendingRequests]);

  useEffect(() => {
    if (targetUserId) {
      loadData();
      if (isOwnProfile && activeTab !== 'pending') {
        loadPendingRequests();
      }
    }
  }, [targetUserId, activeTab, isOwnProfile, loadData, loadPendingRequests]);

  const handleApproveRequest = async (userId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('follows')
      .update({ status: 'accepted' })
      .eq('follower_id', userId)
      .eq('following_id', user.id);

    if (!error) {
      try {
        const { notifyFriendAccepted } = await import('../lib/notifications');
        await notifyFriendAccepted(userId, user.id);
      } catch { /* intentionally empty */ }
      await loadData();
    }
  };

  const handleDenyRequest = async (userId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', user.id);

    if (!error) {
      await loadData();
    }
  };

  const _handleMuteToggle = async (userId: string, currentlyMuted: boolean) => {
    if (!user) return;

    const { error } = await supabase
      .from('follows')
      .update({ muted: !currentlyMuted })
      .eq('follower_id', user.id)
      .eq('following_id', userId);

    if (!error) {
      await loadData();
      setShowMenuFor(null);
    }
  };

  const _handleFavoriteToggle = async (userId: string, currentlyFavorite: boolean) => {
    if (!user) return;

    const { error } = await supabase
      .from('follows')
      .update({ favorite: !currentlyFavorite })
      .eq('follower_id', user.id)
      .eq('following_id', userId);

    if (!error) {
      await loadData();
      setShowMenuFor(null);
    }
  };

  const _handleBlock = async (userId: string) => {
    if (!user) return;

    if (window.confirm('Are you sure you want to block this user? This will unfollow them and hide all their content.')) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId);

      await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', user.id);

      await supabase.from('blocks').insert({
        blocker_id: user.id,
        blocked_id: userId,
      });

      await loadData();
      setShowMenuFor(null);
    }
  };

  const handleUnblock = async (userId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId);

    if (!error) {
      await loadData();
      setShowMenuFor(null);
    }
  };

  const renderUserCard = (userData: UserData) => {
    const displayAvatar = userData.avatar_url || userData.profile_car_image;
    const isMuted = userData.followData?.muted || false;
    const isFavorite = userData.followData?.favorite || false;
    const isBlocked = userData.isBlocked || false;

    return (
      <div
        key={userData.id}
        style={{
          background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: 16, opacity: isBlocked ? 0.5 : 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => onNavigate('user-profile', { userId: userData.id })}
            disabled={isBlocked}
            style={{
              display: 'flex', alignItems: 'center', gap: 16, flex: 1,
              textAlign: 'left' as const, background: 'none', border: 'none',
              cursor: isBlocked ? 'default' : 'pointer', padding: 0,
              color: 'inherit', fontFamily: 'inherit',
            }}
          >
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={userData.handle || 'User'}
                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: '#0e1320',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User style={{ width: 24, height: 24, color: '#7a8e9e' }} />
              </div>
            )}

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{
                  fontWeight: 700, fontSize: 14, color: '#eef4f8',
                  fontFamily: "'Barlow', sans-serif", margin: 0,
                }}>
                  @{userData.handle || 'anonymous'}
                </h3>
                {isFavorite && (
                  <Star style={{ width: 16, height: 16, color: '#F97316', fill: '#F97316' }} />
                )}
                {isMuted && <VolumeX style={{ width: 16, height: 16, color: '#5a6e7e' }} />}
                {isBlocked && <Ban style={{ width: 16, height: 16, color: '#dc2626' }} />}
              </div>
              {userData.location && (
                <p style={{ fontSize: 14, color: '#7a8e9e', margin: '2px 0 0', fontFamily: "'Barlow', sans-serif" }}>
                  {userData.location}
                </p>
              )}
              {userData.vehicle && (
                <p style={{ fontSize: 12, color: '#7a8e9e', margin: '2px 0 0', fontFamily: "'Barlow', sans-serif" }}>
                  {userData.vehicle.year} {userData.vehicle.make} {userData.vehicle.model}
                </p>
              )}
              <p style={{ fontSize: 12, color: '#7a8e9e', margin: '2px 0 0', fontFamily: "'Barlow', sans-serif" }}>
                {userData.reputation_score} reputation
              </p>
            </div>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isBlocked ? (
              <button
                onClick={() => handleUnblock(userData.id)}
                style={{
                  padding: '8px 16px', background: '#0e1320',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
                  fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const,
                  letterSpacing: '0.08em', color: '#eef4f8', cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}
              >
                Unblock
              </button>
            ) : (
              <>
                {activeTab === 'friends' && isOwnProfile && (
                  <FollowButton
                    targetUserId={userData.id}
                    onFollowChange={() => loadData()}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPendingRequestCard = (userData: UserData) => {
    const displayAvatar = userData.avatar_url || userData.profile_car_image;

    return (
      <div
        key={userData.id}
        style={{
          background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => onNavigate('user-profile', { userId: userData.id })}
            style={{
              display: 'flex', alignItems: 'center', gap: 16, flex: 1,
              textAlign: 'left' as const, background: 'none', border: 'none',
              cursor: 'pointer', padding: 0, color: 'inherit', fontFamily: 'inherit',
            }}
          >
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={userData.handle || 'User'}
                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: '#0e1320',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User style={{ width: 24, height: 24, color: '#7a8e9e' }} />
              </div>
            )}

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{
                  fontWeight: 700, fontSize: 14, color: '#eef4f8',
                  fontFamily: "'Barlow', sans-serif", margin: 0,
                }}>
                  @{userData.handle || 'anonymous'}
                </h3>
                <Clock style={{ width: 16, height: 16, color: '#f0a030' }} />
              </div>
              {userData.location && (
                <p style={{ fontSize: 14, color: '#7a8e9e', margin: '2px 0 0', fontFamily: "'Barlow', sans-serif" }}>
                  {userData.location}
                </p>
              )}
              {userData.vehicle && (
                <p style={{ fontSize: 12, color: '#7a8e9e', margin: '2px 0 0', fontFamily: "'Barlow', sans-serif" }}>
                  {userData.vehicle.year} {userData.vehicle.make} {userData.vehicle.model}
                </p>
              )}
              <p style={{ fontSize: 12, color: '#7a8e9e', margin: '2px 0 0', fontFamily: "'Barlow', sans-serif" }}>
                {userData.reputation_score} reputation
              </p>
            </div>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => handleApproveRequest(userData.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', background: '#16a34a', border: 'none',
                borderRadius: 8, cursor: 'pointer',
                fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.08em', fontSize: 12, color: '#fff',
                fontFamily: "'Barlow Condensed', sans-serif",
              }}
            >
              <Check style={{ width: 16, height: 16 }} />
              Accept
            </button>
            <button
              onClick={() => handleDenyRequest(userData.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', background: '#0e1320',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
                cursor: 'pointer', fontWeight: 700,
                textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                fontSize: 12, color: '#7a8e9e',
                fontFamily: "'Barlow Condensed', sans-serif",
              }}
            >
              <X style={{ width: 16, height: 16 }} />
              Deny
            </button>
          </div>
        </div>
      </div>
    );
  };

  const currentList = activeTab === 'friends' ? followers : pendingRequests;

  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div style={{ maxWidth: 672, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h2 style={{
            fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#eef4f8',
            fontFamily: "'Rajdhani', sans-serif",
          }}>
            Followers
          </h2>
          <p style={{ color: '#7a8e9e', fontSize: 14, fontFamily: "'Barlow', sans-serif", margin: 0 }}>
            Manage your followers and requests
          </p>
        </div>

        <div style={{
          background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setActiveTab('friends')}
              style={{
                flex: 1, padding: '16px 24px', fontWeight: 700,
                textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                fontSize: 12, display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, cursor: 'pointer', border: 'none',
                fontFamily: "'Barlow Condensed', sans-serif",
                background: activeTab === 'friends' ? '#F97316' : '#0a0d14',
                color: activeTab === 'friends' ? '#fff' : '#7a8e9e',
              }}
            >
              <Users style={{ width: 16, height: 16 }} />
              Followers
              <span style={{
                padding: '2px 8px', borderRadius: 12, fontSize: 12,
                background: activeTab === 'friends' ? 'rgba(255,255,255,0.2)' : '#0e1320',
                color: activeTab === 'friends' ? '#fff' : '#7a8e9e',
              }}>
                {followers.length}
              </span>
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('pending')}
                style={{
                  flex: 1, padding: '16px 24px', fontWeight: 700,
                  textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                  fontSize: 12, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8, cursor: 'pointer', border: 'none',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  background: activeTab === 'pending' ? '#F97316' : '#0a0d14',
                  color: activeTab === 'pending' ? '#fff' : '#7a8e9e',
                }}
              >
                <Clock style={{ width: 16, height: 16 }} />
                Requests
                {pendingRequests.length > 0 && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 12,
                    background: activeTab === 'pending' ? 'rgba(255,255,255,0.2)' : '#f0a030',
                    color: activeTab === 'pending' ? '#fff' : '#070a0f',
                  }}>
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <LoadingSpinner size="lg" label="Loading..." />
        ) : currentList.length === 0 ? (
          <div style={{
            background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
          }}>
            <EmptyState
              icon={activeTab === 'friends' ? Users : Clock}
              title={activeTab === 'friends' ? 'No Followers Yet' : 'No Pending Requests'}
              description={
                activeTab === 'friends'
                  ? 'No followers yet — find car enthusiasts to connect with'
                  : 'No pending follow requests'
              }
              actionLabel={activeTab === 'friends' && isOwnProfile ? 'Find Users' : undefined}
              onAction={activeTab === 'friends' && isOwnProfile ? () => onNavigate('search') : undefined}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeTab === 'pending'
              ? currentList.map(renderPendingRequestCard)
              : currentList.map(renderUserCard)}
          </div>
        )}
      </div>
    </Layout>
  );
}
