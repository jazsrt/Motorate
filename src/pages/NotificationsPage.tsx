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
  type: 'review' | 'badge_received' | 'badge_unlocked' | 'badge_awarded' | 'comment' | 'like' | 'follow' | 'spot' | 'message' | 'admin_action' | 'friend_request' | 'friend_accepted' | 'vehicle_follow' | 'vehicle_follow_request' | 'vehicle_follow_approved';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link_type?: string;
  link_id?: string;
  data?: Record<string, unknown>;
}

type NotificationFilter = 'all' | 'badges' | 'social' | 'vehicles' | 'unread';

interface NotificationsPageProps {
  onNavigate: OnNavigate;
}

function getIcon(type: Notification['type']) {
  switch (type) {
    case 'badge_received':
    case 'badge_unlocked':
    case 'badge_awarded':
      return { Icon: Award, color: '#f0a030' };
    case 'like':
      return { Icon: Heart, color: '#F97316' };
    case 'comment':
      return { Icon: MessageCircle, color: '#7a8e9e' };
    case 'follow':
      return { Icon: UserPlus, color: '#7a8e9e' };
    case 'review':
      return { Icon: Star, color: '#F97316' };
    case 'spot':
      return { Icon: MapPin, color: '#F97316' };
    case 'admin_action':
      return { Icon: Shield, color: '#F97316' };
    case 'friend_request': return { Icon: UserPlus, color: '#F97316' };
    case 'friend_accepted': return { Icon: Users, color: '#20c060' };
    case 'vehicle_follow': return { Icon: Heart, color: '#F97316' };
    case 'vehicle_follow_request': return { Icon: Car, color: '#f0a030' };
    case 'vehicle_follow_approved': return { Icon: Car, color: '#20c060' };
    default:
      return { Icon: Bell, color: '#445566' };
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
  isDeadLink: boolean;
}

function NotificationItem({ notification, onDelete, onMarkAsRead, onClick, isDeadLink }: NotificationItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { Icon, color } = getIcon(notification.type);

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      setIsDeleting(true);
      setTimeout(() => onDelete(notification.id), 300);
    },
  });

  // Left border accent color
  const getAccentBorder = () => {
    switch (notification.type) {
      case 'spot': case 'review': case 'vehicle_follow': case 'vehicle_follow_request': case 'vehicle_follow_approved':
        return '2px solid rgba(249,115,22,0.55)';
      case 'badge_received': case 'badge_unlocked': case 'badge_awarded':
        return '2px solid rgba(240,160,48,0.45)';
      case 'friend_accepted':
        return '2px solid rgba(32,192,96,0.45)';
      case 'comment': case 'message':
        return '2px solid rgba(56,136,238,0.4)';
      case 'follow': case 'friend_request': case 'like':
        return '2px solid rgba(255,255,255,0.08)';
      default:
        return '2px solid transparent';
    }
  };

  // Icon circle background
  const getIconBg = () => {
    switch (notification.type) {
      case 'spot': case 'review': case 'vehicle_follow': case 'vehicle_follow_request': case 'vehicle_follow_approved': case 'like':
        return 'rgba(249,115,22,0.12)';
      case 'badge_received': case 'badge_unlocked': case 'badge_awarded':
        return 'rgba(240,160,48,0.12)';
      case 'friend_accepted':
        return 'rgba(32,192,96,0.12)';
      case 'comment': case 'message':
        return 'rgba(56,136,238,0.1)';
      case 'follow': case 'friend_request':
        return 'rgba(255,255,255,0.06)';
      default:
        return 'rgba(255,255,255,0.06)';
    }
  };

  return (
    <div
      {...swipeHandlers}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 11,
        padding: '10px 16px 10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        borderLeft: getAccentBorder(),
        background: !notification.is_read ? 'rgba(249,115,22,0.025)' : 'transparent',
        opacity: isDeleting ? 0 : isDeadLink ? 0.4 : 1,
        transform: isDeleting ? 'translateX(-24px)' : 'none',
        transition: 'opacity 0.2s, transform 0.2s',
        cursor: 'pointer',
      }}
    >
      {/* Icon circle */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: getIconBg(),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
      }}>
        <Icon style={{ width: 14, height: 14, color }} strokeWidth={1.5} />
      </div>

      {/* Unread dot */}
      {!notification.is_read && (
        <div style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#F97316',
          flexShrink: 0, alignSelf: 'center',
          boxShadow: '0 0 6px rgba(249,115,22,0.6)',
        }} />
      )}

      {/* Text content */}
      <div
        style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
        onClick={() => onClick(notification)}
      >
        <div style={{
          fontFamily: 'Barlow, sans-serif', fontSize: 13, fontWeight: 500,
          color: isDeadLink ? '#7a8e9e' : '#d8e8f0',
          lineHeight: 1.35, marginBottom: 2,
        }}>
          {notification.title}
        </div>
        {notification.message && (
          <div style={{
            fontFamily: 'Barlow, sans-serif', fontSize: 11,
            color: '#5a6e7e', lineHeight: 1.45,
          }}>
            {notification.message}
          </div>
        )}
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
          color: '#3a4e60', marginTop: 4,
          fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em',
        }}>
          {formatTimeAgo(notification.created_at)}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 2, flexShrink: 0, alignItems: 'center' }}>
        {!notification.is_read && (
          <button
            onClick={e => { e.stopPropagation(); onMarkAsRead(notification.id); }}
            style={{
              width: 28, height: 28, borderRadius: 5,
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#20c060',
            }}
            title="Mark as read"
          >
            <Check style={{ width: 12, height: 12 }} strokeWidth={2.5} />
          </button>
        )}
        <button
          onClick={e => {
            e.stopPropagation();
            setIsDeleting(true);
            setTimeout(() => onDelete(notification.id), 250);
          }}
          style={{
            width: 28, height: 28, borderRadius: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#445566',
          }}
          title="Dismiss"
        >
          <X style={{ width: 12, height: 12 }} strokeWidth={1.5} />
        </button>
      </div>
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

  const handleNotificationClick = async (notification: Notification) => {
    markAsRead(notification.id);
    if (['badge_received', 'badge_unlocked', 'badge_awarded'].includes(notification.type)) {
      // Try to load badge data and show unlock modal
      const badgeId = notification.data?.badge_id || notification.link_id;
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
      // Fallback: navigate to badges page
      onNavigate('badges');
      return;
    }
    if (!notification.link_type || !notification.link_id) return;
    try {
      switch (notification.link_type) {
        case 'vehicle': {
          const { data } = await supabase.from('vehicles').select('id').eq('id', notification.link_id).maybeSingle();
          if (data) onNavigate('vehicle-detail', notification.link_id);
          else { showToast('Vehicle no longer available', 'error'); setDeadLinkNotifications(prev => new Set(prev).add(notification.id)); }
          break;
        }
        case 'post': {
          const { data } = await supabase.from('posts').select('id').eq('id', notification.link_id).maybeSingle();
          if (data) onNavigate('feed');
          else { showToast('Post no longer available', 'error'); setDeadLinkNotifications(prev => new Set(prev).add(notification.id)); }
          break;
        }
        case 'user':
        case 'profile': {
          const { data } = await supabase.from('profiles').select('id').eq('id', notification.link_id).maybeSingle();
          if (data) onNavigate('user-profile', notification.link_id);
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

  const getCategory = (type: Notification['type']): NotificationFilter => {
    if (['badge_received', 'badge_unlocked', 'badge_awarded'].includes(type)) return 'badges';
    if (['like', 'comment', 'follow'].includes(type)) return 'social';
    if (['friend_request', 'friend_accepted'].includes(type)) return 'social';
    if (['vehicle_follow', 'vehicle_follow_request', 'vehicle_follow_approved'].includes(type)) return 'vehicles';
    if (type === 'review' || type === 'spot') return 'vehicles';
    return 'all';
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'all') return true;
    return getCategory(n.type) === filter;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const FILTERS: { id: NotificationFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'badges', label: 'Badges' },
    { id: 'social', label: 'Social' },
    { id: 'vehicles', label: 'Vehicles' },
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

        {/* Sticky header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'rgba(6,9,14,0.97)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          padding: '48px 18px 0',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <div>
              <div style={{
                fontFamily: 'Rajdhani, sans-serif', fontSize: 26, fontWeight: 700,
                color: '#eef4f8', lineHeight: 1,
              }}>
                Notifications
              </div>
              {unreadCount > 0 && (
                <div style={{
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.2em', textTransform: 'uppercase' as const,
                  color: '#F97316', marginTop: 4,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {unreadCount} unread
                </div>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px',
                  background: 'rgba(249,115,22,0.08)',
                  border: '1px solid rgba(249,115,22,0.2)',
                  borderRadius: 6, cursor: 'pointer',
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: '#F97316',
                }}
              >
                <Check style={{ width: 11, height: 11 }} strokeWidth={2.5} />
                Mark all read
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' as const,
            paddingBottom: 12,
          }}>
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  flexShrink: 0, padding: '5px 12px',
                  background: filter === f.id ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
                  border: filter === f.id ? '1px solid rgba(249,115,22,0.35)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 4, cursor: 'pointer',
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.14em', textTransform: 'uppercase' as const,
                  color: filter === f.id ? '#F97316' : '#7a8e9e',
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && <LoadingScreen />}

        {/* Empty state */}
        {!loading && filteredNotifications.length === 0 && (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <Bell
              style={{ width: 28, height: 28, color: '#3a4e60', margin: '0 auto 14px', display: 'block' }}
              strokeWidth={1}
            />
            <div style={{
              fontFamily: 'Rajdhani, sans-serif', fontSize: 17, fontWeight: 700,
              color: '#7a8e9e', marginBottom: 6,
            }}>
              {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
            </div>
            <div style={{
              fontFamily: 'Barlow, sans-serif', fontSize: 12, color: '#445566', lineHeight: 1.5,
            }}>
              {filter === 'all'
                ? 'Activity from your vehicles will appear here'
                : 'Try a different filter'}
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
                      letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#445566',
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
                        isDeadLink={deadLinkNotifications.has(notification.id)}
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
