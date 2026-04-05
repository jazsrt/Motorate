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
        className={`bg-surface border border-surfacehighlight rounded-xl p-4 ${
          isBlocked ? 'opacity-50' : ''
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('user-profile', { userId: userData.id })}
            className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
            disabled={isBlocked}
          >
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={userData.handle || 'User'}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-surfacehighlight flex items-center justify-center">
                <User className="w-6 h-6 text-secondary" />
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold">@{userData.handle || 'anonymous'}</h3>
                {isFavorite && (
                  <Star className="w-4 h-4 text-[#F97316] fill-[#F97316]" />
                )}
                {isMuted && <VolumeX className="w-4 h-4 text-gray-500" />}
                {isBlocked && <Ban className="w-4 h-4 text-red-500" />}
              </div>
              {userData.location && (
                <p className="text-sm text-secondary">{userData.location}</p>
              )}
              {userData.vehicle && (
                <p className="text-xs text-secondary">
                  {userData.vehicle.year} {userData.vehicle.make} {userData.vehicle.model}
                </p>
              )}
              <p className="text-xs text-secondary">
                {userData.reputation_score} reputation
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {isBlocked ? (
              <button
                onClick={() => handleUnblock(userData.id)}
                className="px-4 py-2 bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-xl text-sm font-bold uppercase tracking-wider transition-all"
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
        className="bg-surface border border-surfacehighlight rounded-xl p-4"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('user-profile', { userId: userData.id })}
            className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
          >
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={userData.handle || 'User'}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-surfacehighlight flex items-center justify-center">
                <User className="w-6 h-6 text-secondary" />
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold">@{userData.handle || 'anonymous'}</h3>
                <Clock className="w-4 h-4 text-yellow-500" />
              </div>
              {userData.location && (
                <p className="text-sm text-secondary">{userData.location}</p>
              )}
              {userData.vehicle && (
                <p className="text-xs text-secondary">
                  {userData.vehicle.year} {userData.vehicle.make} {userData.vehicle.model}
                </p>
              )}
              <p className="text-xs text-secondary">
                {userData.reputation_score} reputation
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleApproveRequest(userData.id)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-xl transition-all active:scale-95 font-bold uppercase tracking-wider text-sm text-white"
            >
              <Check className="w-4 h-4" />
              Accept
            </button>
            <button
              onClick={() => handleDenyRequest(userData.id)}
              className="flex items-center gap-2 px-4 py-2 bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-xl transition-all active:scale-95 font-bold uppercase tracking-wider text-sm text-secondary"
            >
              <X className="w-4 h-4" />
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
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">
            Followers
          </h2>
          <p className="text-secondary">Manage your followers and requests</p>
        </div>

        <div className="bg-surface border border-surfacehighlight rounded-xl overflow-hidden">
          <div className="flex border-b border-surfacehighlight">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 px-6 py-4 font-bold uppercase tracking-wider text-sm transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'friends'
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface text-secondary hover:bg-surfacehighlight'
              }`}
            >
              <Users className="w-4 h-4" />
              Friends
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'friends' ? 'bg-white/20' : 'bg-surfacehighlight'
              }`}>
                {followers.length}
              </span>
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex-1 px-6 py-4 font-bold uppercase tracking-wider text-sm transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'pending'
                    ? 'bg-accent-primary text-white'
                    : 'bg-surface text-secondary hover:bg-surfacehighlight'
                }`}
              >
                <Clock className="w-4 h-4" />
                Requests
                {pendingRequests.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'pending' ? 'bg-white/20' : 'bg-yellow-500 text-black'
                  }`}>
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
          <div className="bg-surface border border-surfacehighlight rounded-xl">
            <EmptyState
              icon={activeTab === 'friends' ? Users : Clock}
              title={activeTab === 'friends' ? 'No Followers Yet' : 'No Pending Requests'}
              description={
                activeTab === 'friends'
                  ? 'No friends yet — find car enthusiasts to connect with'
                  : 'No pending follow requests'
              }
              actionLabel={activeTab === 'friends' && isOwnProfile ? 'Find Users' : undefined}
              onAction={activeTab === 'friends' && isOwnProfile ? () => onNavigate('search') : undefined}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {activeTab === 'pending'
              ? currentList.map(renderPendingRequestCard)
              : currentList.map(renderUserCard)}
          </div>
        )}
      </div>
    </Layout>
  );
}
