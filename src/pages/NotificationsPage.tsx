import { useEffect, useState, useCallback } from 'react';
import { Bell, Check, Award, Heart, MessageCircle, UserPlus, Users, Shield, Car, Star, X, MapPin } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { type OnNavigate } from '../types/navigation';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { useSwipe } from '../hooks/useSwipe';
import { BadgeUnlockModal } from '../components/BadgeUnlockModal';
import { type Badge } from '../lib/badges';
import { formatTimeAgo } from '../lib/formatting';

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  body?: string;
  is_read: boolean;
  created_at: string;
  link_type?: string;
  link_id?: string;
  reference_type?: string;
  reference_id?: string;
  data?: Record<string, unknown>;
}

type NotificationFilter = 'all' | 'spots' | 'reactions' | 'comments' | 'badges' | 'social';

interface NotificationsPageProps {
  onNavigate: OnNavigate;
}

function getIcon(type: string) {
  switch (type) {
    case 'badge_received':
    case 'badge_unlocked':
    case 'badge_awarded':
    case 'badge_unlock':
      return { Icon: Award, color: '#f0a030' };
    case 'like':
      return { Icon: Heart, color: '#F97316' };
    case 'comment':
    case 'owner_reply':
      return { Icon: MessageCircle, color: '#7a8e9e' };
    case 'follow':
    case 'new_follower':
      return { Icon: UserPlus, color: '#7a8e9e' };
    case 'review':
    case 'spot':
    case 'new_spot':
      return { Icon: MapPin, color: '#F97316' };
    case 'milestone':
      return { Icon: Star, color: '#F97316' };
    case 'admin_action':
      return { Icon: Shield, color: '#F97316' };
    case 'friend_request': return { Icon: UserPlus, color: '#F97316' };
    case 'friend_accepted': return { Icon: Users, color: '#20c060' };
    case 'vehicle_follow': return { Icon: Heart, color: '#F97316' };
    case 'vehicle_follow_request': return { Icon: Car, color: '#f0a030' };
    case 'vehicle_follow_approved': return { Icon: Car, color: '#20c060' };
    default:
      return { Icon: Bell, color: '#5a6e7e' };
  }
}

function getDateGroup(dateString: string): 'today' | 'yesterday' | 'this_week' | 'older' {
  const now = new Date();
  const date = new Date(dateString);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays < 1) return 'today';
  if (diffDays < 2) return 'yesterday';
  if (diffDays < 7) return 'this_week';
  return 'older';
}

interface NotificationItemProps {
  notification: Notification;
  onDelete: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  onClick: (notification: Notification) => void;
  onAcceptFriend: (notification: Notification) => void;
  onApproveVehicleFollow: (notification: Notification) => void;
  isDeadLink: boolean;
  actionLoading: boolean;
}

function NotificationItem({ notification, onDelete, onMarkAsRead, onClick, onAcceptFriend, onApproveVehicleFollow, isDeadLink, actionLoading }: NotificationItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { Icon, color } = getIcon(notification.type);

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      setIsDeleting(true);
      setTimeout(() => onDelete(notification.id), 300);
    },
  });

  // Left border accent color
  const _getAccentBorder = () => {
    switch (notification.type) {
      case 'spot': case 'new_spot': case 'review': case 'milestone': case 'vehicle_follow': case 'vehicle_follow_request': case 'vehicle_follow_approved':
        return '2px solid rgba(249,115,22,0.55)';
      case 'badge_received': case 'badge_unlocked': case 'badge_awarded': case 'badge_unlock':
        return '2px solid rgba(240,160,48,0.45)';
      case 'friend_accepted':
        return '2px solid rgba(32,192,96,0.45)';
      case 'comment': case 'owner_reply': case 'message':
        return '2px solid rgba(56,136,238,0.4)';
      case 'follow': case 'new_follower': case 'friend_request': case 'like':
        return '2px solid rgba(255,255,255,0.08)';
      default:
        return '2px solid transparent';
    }
  };

  // Icon circle background
  const getIconBg = () => {
    switch (notification.type) {
      case 'spot': case 'new_spot': case 'review': case 'milestone': case 'vehicle_follow': case 'vehicle_follow_request': case 'vehicle_follow_approved': case 'like':
        return 'rgba(249,115,22,0.12)';
      case 'badge_received': case 'badge_unlocked': case 'badge_awarded': case 'badge_unlock':
        return 'rgba(240,160,48,0.12)';
      case 'friend_accepted':
        return 'rgba(32,192,96,0.12)';
      case 'comment': case 'owner_reply': case 'message':
        return 'rgba(56,136,238,0.1)';
      case 'follow': case 'new_follower': case 'friend_request':
        return 'rgba(255,255,255,0.06)';
      default:
        return 'rgba(255,255,255,0.06)';
    }
  };

  const isBadge = ['badge_received', 'badge_unlocked', 'badge_awarded', 'badge_unlock'].includes(notification.type);
  const isFriendRequest = notification.type === 'friend_request';
  const isVehicleFollowRequest = notification.type === 'vehicle_follow_request';
  const displayMessage = notification.message || notification.body || '';

  return (
    <div
      {...swipeHandlers}
      onClick={() => onClick(notification)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 16px',
        background: notification.is_read ? '#070a0f' : '#0d1117',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        opacity: isDeleting ? 0 : isDeadLink ? 0.4 : 1,
        transform: isDeleting ? 'translateX(-24px)' : 'none',
        transition: 'opacity 0.2s, transform 0.2s',
        cursor: 'pointer',
      }}
    >
      {/* Icon circle */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: getIconBg(),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon style={{ width: 14, height: 14, color }} strokeWidth={1.5} />
      </div>

      {/* Text content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7a8e9e', lineHeight: 1.4,
        }}>
          <span style={{ color: '#eef4f8', fontWeight: 600 }}>{notification.title}</span>
          {displayMessage && ` ${displayMessage}`}
        </div>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a4e60',
          marginTop: 3, display: 'block', fontVariantNumeric: 'tabular-nums',
        }}>
          {formatTimeAgo(notification.created_at)}
        </span>
      </div>

      {/* Friend request accept button */}
      {isFriendRequest && !notification.is_read && (
        <button
          onClick={e => { e.stopPropagation(); onAcceptFriend(notification); }}
          disabled={actionLoading}
          style={{
            padding: '5px 10px', borderRadius: 5, background: actionLoading ? '#7a4a10' : '#F97316', border: 'none',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700,
            textTransform: 'uppercase' as const, color: '#030508', cursor: actionLoading ? 'default' : 'pointer',
            flexShrink: 0, letterSpacing: '0.1em', opacity: actionLoading ? 0.6 : 1,
          }}
        >
          {actionLoading ? '...' : 'Accept'}
        </button>
      )}

      {/* Vehicle follow request approve button */}
      {isVehicleFollowRequest && !notification.is_read && (
        <button
          onClick={e => { e.stopPropagation(); onApproveVehicleFollow(notification); }}
          disabled={actionLoading}
          style={{
            padding: '5px 10px', borderRadius: 5, background: actionLoading ? '#7a4a10' : '#F97316', border: 'none',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700,
            textTransform: 'uppercase' as const, color: '#030508', cursor: actionLoading ? 'default' : 'pointer',
            flexShrink: 0, letterSpacing: '0.1em', opacity: actionLoading ? 0.6 : 1,
          }}
        >
          {actionLoading ? '...' : 'Approve'}
        </button>
      )}

      {/* Unread dot */}
      {!notification.is_read && !isFriendRequest && !isVehicleFollowRequest && (
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F97316', flexShrink: 0, marginTop: 6 }} />
      )}
    </div>
  );
}

export function NotificationsPage({ onNavigate }: NotificationsPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [deadLinkNotifications, setDeadLinkNotifications] = useState<Set<string>>(new Set());
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setNotifications((data as Notification[]) || []);
    } catch {
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    if (user) loadNotifications();
  }, [user, loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    } catch { /* intentionally empty */ }
  };

  const markAllAsRead = async () => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast('All marked as read', 'success');
    } catch {
      showToast('Failed to mark all as read', 'error');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase.from('notifications').delete().eq('id', notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch {
      showToast('Failed to delete notification', 'error');
    }
  };

  const handleAcceptFriend = async (notification: Notification) => {
    if (!user || actionLoadingId) return;
    const requesterId = notification.link_id || notification.reference_id;
    if (!requesterId) { showToast('Cannot determine requester', 'error'); return; }

    setActionLoadingId(notification.id);
    try {
      // 1) Accept the pending follow row (requester -> me)
      const { error: updateErr } = await supabase
        .from('follows')
        .update({ status: 'accepted' })
        .eq('follower_id', requesterId)
        .eq('following_id', user.id)
        .eq('status', 'pending');

      if (updateErr) throw updateErr;

      // 2) Create the reverse follow for mutual friendship (me -> requester)
      await supabase
        .from('follows')
        .upsert({
          follower_id: user.id,
          following_id: requesterId,
          status: 'accepted',
        }, { onConflict: 'follower_id,following_id' });

      // 3) Notify the requester that their request was accepted
      try {
        const { notifyFriendAccepted } = await import('../lib/notifications');
        await notifyFriendAccepted(requesterId, user.id);
      } catch { /* intentionally empty */ }

      // 4) Mark this notification as read
      await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));

      showToast('Friend request accepted', 'success');
    } catch (err) {
      console.error('Failed to accept friend request:', err);
      showToast('Failed to accept request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApproveVehicleFollow = async (notification: Notification) => {
    if (!user || actionLoadingId) return;
    const vehicleId = notification.link_id || notification.reference_id;
    const requesterId = (notification.data?.requesterUserId as string) || '';
    if (!vehicleId) { showToast('Cannot determine vehicle', 'error'); return; }

    setActionLoadingId(notification.id);
    try {
      // Find the pending vehicle_follows row for this vehicle + requester
      let query = supabase
        .from('vehicle_follows')
        .select('id, follower_id')
        .eq('vehicle_id', vehicleId)
        .eq('status', 'pending');

      if (requesterId) {
        query = query.eq('follower_id', requesterId);
      }

      const { data: pendingFollows } = await query.limit(1);

      if (!pendingFollows || pendingFollows.length === 0) {
        showToast('Request no longer pending', 'error');
        // Mark notification as read anyway
        await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
        setActionLoadingId(null);
        return;
      }

      const follow = pendingFollows[0];

      // 1) Approve the vehicle follow
      await supabase.from('vehicle_follows').update({ status: 'accepted' }).eq('id', follow.id);

      // 2) Notify the follower
      try {
        const { notifyVehicleFollowApproved } = await import('../lib/notifications');
        await notifyVehicleFollowApproved(follow.follower_id, vehicleId);
      } catch { /* intentionally empty */ }

      // 3) Mark notification as read
      await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));

      showToast('Fan request approved', 'success');
    } catch (err) {
      console.error('Failed to approve vehicle follow:', err);
      showToast('Failed to approve request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    markAsRead(notification.id);

    // Badge notifications → badges page or modal
    if (['badge_received', 'badge_unlocked', 'badge_awarded', 'badge_unlock'].includes(notification.type)) {
      const badgeId = notification.data?.badge_id || notification.link_id || notification.reference_id;
      if (badgeId) {
        try {
          const { data: badgeData } = await supabase
            .from('badges')
            .select('*')
            .eq('id', badgeId)
            .maybeSingle();
          if (badgeData) {
            setSelectedBadge(badgeData as Badge);
            return;
          }
        } catch { /* intentionally empty */ }
      }
      onNavigate('badges');
      return;
    }

    // Spot notifications → vehicle detail (look up vehicle_id from spot_history if needed)
    if (['spot', 'new_spot', 'owner_reply', 'milestone'].includes(notification.type)) {
      const refType = notification.link_type || notification.reference_type;
      const refId = notification.link_id || notification.reference_id;

      if (refType === 'vehicle' && refId) {
        onNavigate('vehicle-detail', { vehicleId: refId });
        return;
      }
      if (refType === 'spot_history' && refId) {
        // Look up the vehicle from spot_history
        try {
          const { data: spot } = await supabase.from('spot_history').select('vehicle_id').eq('id', refId).maybeSingle();
          if (spot?.vehicle_id) { onNavigate('vehicle-detail', { vehicleId: spot.vehicle_id }); return; }
        } catch { /* intentionally empty */ }
      }
      // Fallback: if we have any vehicle reference in the data
      if (notification.data?.vehicle_id) {
        onNavigate('vehicle-detail', { vehicleId: notification.data.vehicle_id as string });
        return;
      }
      return;
    }

    // Follower notifications → vehicle detail
    if (['new_follower', 'vehicle_follow', 'vehicle_follow_approved'].includes(notification.type)) {
      const refId = notification.link_id || notification.reference_id;
      if (refId) {
        onNavigate('vehicle-detail', { vehicleId: refId });
        return;
      }
    }

    // Generic link_type / reference_type routing
    const linkType = notification.link_type || notification.reference_type;
    const linkId = notification.link_id || notification.reference_id;
    if (!linkType || !linkId) return;

    try {
      switch (linkType) {
        case 'vehicle': {
          const { data } = await supabase.from('vehicles').select('id').eq('id', linkId).maybeSingle();
          if (data) onNavigate('vehicle-detail', { vehicleId: linkId });
          else { showToast('Vehicle no longer available', 'error'); setDeadLinkNotifications(prev => new Set(prev).add(notification.id)); }
          break;
        }
        case 'post': {
          const { data } = await supabase.from('posts').select('id').eq('id', linkId).maybeSingle();
          if (data) onNavigate('feed');
          else { showToast('Post no longer available', 'error'); setDeadLinkNotifications(prev => new Set(prev).add(notification.id)); }
          break;
        }
        case 'user':
        case 'profile': {
          const { data } = await supabase.from('profiles').select('id').eq('id', linkId).maybeSingle();
          if (data) onNavigate('user-profile', linkId);
          else { showToast('Profile no longer available', 'error'); setDeadLinkNotifications(prev => new Set(prev).add(notification.id)); }
          break;
        }
        case 'badge':
          onNavigate('badges'); break;
        default: break;
      }
    } catch {
      showToast('Unable to load content', 'error');
      setDeadLinkNotifications(prev => new Set(prev).add(notification.id));
    }
  };

  const getCategory = (type: string): NotificationFilter => {
    if (['badge_received', 'badge_unlocked', 'badge_awarded', 'badge_unlock'].includes(type)) return 'badges';
    if (type === 'like' || type === 'vehicle_follow' || type === 'new_follower') return 'reactions';
    if (type === 'comment' || type === 'owner_reply') return 'comments';
    if (['follow', 'friend_request', 'friend_accepted', 'vehicle_follow_request', 'vehicle_follow_approved'].includes(type)) return 'social';
    if (['spot', 'new_spot', 'review', 'milestone'].includes(type)) return 'spots';
    return 'all';
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    return getCategory(n.type) === filter;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const FILTERS: { id: NotificationFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'spots', label: 'Spots' },
    { id: 'reactions', label: 'Reactions' },
    { id: 'comments', label: 'Comments' },
    { id: 'badges', label: 'Badges' },
    { id: 'social', label: 'Social' },
  ];

  const groupLabels: Record<string, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    this_week: 'This Week',
    older: 'Earlier',
  };

  return (
    <Layout currentPage="notifications" onNavigate={onNavigate}>
      <div style={{ background: '#070a0f', minHeight: '100vh', paddingBottom: 100 }}>

        {/* Header */}
        <div style={{ padding: '52px 16px 14px', background: '#0a0d14', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#eef4f8' }}>
              Notifications
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                  background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
                  borderRadius: 5, cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700,
                  letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#F97316',
                }}
              >
                <Check style={{ width: 10, height: 10 }} strokeWidth={2.5} />
                Read all
              </button>
            )}
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 14px', background: '#0a0d14', borderBottom: '1px solid rgba(255,255,255,0.04)', overflowX: 'auto', scrollbarWidth: 'none' as const }}>
          {FILTERS.map(f => {
            const active = filter === f.id;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                flexShrink: 0, padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                background: active ? 'rgba(249,115,22,0.10)' : 'transparent',
                border: active ? '1px solid rgba(249,115,22,0.40)' : '1px solid rgba(255,255,255,0.06)',
                color: active ? '#F97316' : '#3a4e60',
              }}>
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading && <LoadingScreen />}

        {/* Empty state */}
        {!loading && filteredNotifications.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Bell style={{ width: 32, height: 32, color: '#1e2a38', margin: '0 auto 14px', display: 'block' }} strokeWidth={1.2} />
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8', marginBottom: 6 }}>
              No notifications yet
            </div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e', lineHeight: 1.5 }}>
              Spot vehicles and follow them to get updates.
            </div>
          </div>
        )}

        {/* Grouped notification list */}
        {!loading && filteredNotifications.length > 0 && (
          <div>
            {(() => {
              const groups: Record<string, Notification[]> = {};
              filteredNotifications.forEach(n => {
                const group = getDateGroup(n.created_at);
                if (!groups[group]) groups[group] = [];
                groups[group].push(n);
              });

              return (['today', 'yesterday', 'this_week', 'older'] as const)
                .filter(g => groups[g]?.length > 0)
                .map(g => (
                  <div key={g}>
                    <div style={{
                      padding: '10px 18px 4px',
                      fontFamily: 'Barlow Condensed, sans-serif', fontSize: 8, fontWeight: 700,
                      letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#5a6e7e',
                    }}>
                      {groupLabels[g]}
                    </div>
                    {groups[g].map(notification => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onDelete={deleteNotification}
                        onMarkAsRead={markAsRead}
                        onClick={handleNotificationClick}
                        onAcceptFriend={handleAcceptFriend}
                        onApproveVehicleFollow={handleApproveVehicleFollow}
                        isDeadLink={deadLinkNotifications.has(notification.id)}
                        actionLoading={actionLoadingId === notification.id}
                      />
                    ))}
                  </div>
                ));
            })()}
          </div>
        )}
      </div>

      {selectedBadge && (
        <BadgeUnlockModal
          badge={selectedBadge}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </Layout>
  );
}
