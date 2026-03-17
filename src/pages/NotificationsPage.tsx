import { useEffect, useState } from 'react';
import { Bell, Check, Trash2, Award, Heart, MessageCircle, UserPlus, Users, Shield, Car, Star, Tag, Eye, X, MapPin } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { type OnNavigate } from '../types/navigation';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { useSwipe } from '../hooks/useSwipe';
import { BadgeUnlockModal } from '../components/BadgeUnlockModal';
import { type Badge } from '../lib/badges';

interface Notification {
  id: string;
  type: 'review' | 'badge_received' | 'badge_unlocked' | 'badge_awarded' | 'comment' | 'like' | 'follow' | 'spot' | 'message' | 'admin_action' | 'friend_request' | 'friend_accepted' | 'vehicle_follow' | 'vehicle_follow_request' | 'vehicle_follow_approved';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link_type?: string;
  link_id?: string;
  data?: any;
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
      return { Icon: Award, color: 'var(--gold-m)' };
    case 'like':
      return { Icon: Heart, color: 'var(--orange)' };
    case 'comment':
      return { Icon: MessageCircle, color: 'var(--t3)' };
    case 'follow':
      return { Icon: UserPlus, color: 'var(--t3)' };
    case 'review':
      return { Icon: Star, color: 'var(--orange)' };
    case 'spot':
      return { Icon: MapPin, color: 'var(--accent)' };
    case 'admin_action':
      return { Icon: Shield, color: 'var(--orange)' };
    case 'friend_request': return { Icon: UserPlus, color: 'var(--accent)' };
    case 'friend_accepted': return { Icon: Users, color: 'var(--green)' };
    case 'vehicle_follow': return { Icon: Heart, color: 'var(--accent)' };
    case 'vehicle_follow_request': return { Icon: Car, color: 'var(--gold)' };
    case 'vehicle_follow_approved': return { Icon: Car, color: 'var(--green)' };
    default:
      return { Icon: Bell, color: 'var(--t4)' };
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

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
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

  return (
    <div
      className={`relative flex items-start gap-3 transition-all duration-200 ${isDeleting ? 'opacity-0 -translate-x-8' : ''} ${isDeadLink ? 'opacity-40' : ''}`}
      style={{
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        borderLeft: (() => {
          switch(notification.type) {
            case 'review': case 'like': case 'spot': return '3px solid var(--accent)';
            case 'badge_received': case 'badge_unlocked': case 'badge_awarded': return '3px solid var(--gold)';
            case 'follow': return '3px solid var(--steel)';
            case 'comment': return '3px solid var(--blue)';
            case 'friend_request': return '3px solid var(--accent)';
            case 'friend_accepted': return '3px solid var(--green)';
            case 'vehicle_follow': return '3px solid var(--accent)';
            case 'vehicle_follow_request': return '3px solid var(--gold)';
            case 'vehicle_follow_approved': return '3px solid var(--green)';
            default: return '3px solid transparent';
          }
        })(),
        background: !notification.is_read ? 'rgba(249,115,22,0.03)' : undefined,
      }}
      {...swipeHandlers}
    >
      {/* Icon circle */}
      <div
        className="flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: (() => {
            switch(notification.type) {
              case 'review': case 'like': case 'spot': return 'rgba(249,115,22,0.12)';
              case 'badge_received': case 'badge_unlocked': case 'badge_awarded': return 'rgba(240,160,48,0.12)';
              case 'follow': return 'rgba(255,255,255,0.06)';
              case 'comment': return 'rgba(56,136,238,0.1)';
              case 'friend_request': return 'rgba(249,115,22,0.12)';
              case 'friend_accepted': return 'rgba(32,192,96,0.12)';
              case 'vehicle_follow': return 'rgba(249,115,22,0.12)';
              case 'vehicle_follow_request': return 'rgba(240,160,48,0.12)';
              case 'vehicle_follow_approved': return 'rgba(32,192,96,0.12)';
              default: return 'rgba(255,255,255,0.06)';
            }
          })(),
        }}
      >
        <Icon className="w-4 h-4" strokeWidth={1.5} style={{ color }} />
      </div>

      {/* Unread dot */}
      {!notification.is_read && (
        <div className="notif-dot" />
      )}

      {/* Content */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onClick(notification)}
      >
        <p
          className={`leading-snug ${isDeadLink ? '' : ''}`}
          style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: isDeadLink ? 'var(--dim)' : 'var(--bright)' }}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 leading-[1.5]" style={{ fontSize: '11px', color: 'var(--dim)' }}>
          {notification.message}
        </p>
        <p className="mt-1.5 text-right" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-0.5 flex-shrink-0">
        {!notification.is_read && (
          <button
            onClick={e => { e.stopPropagation(); onMarkAsRead(notification.id); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-surface-2 text-positive"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); setIsDeleting(true); setTimeout(() => onDelete(notification.id), 300); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-surface-2 hover:text-negative text-quaternary"
          title="Delete"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
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

  useEffect(() => {
    if (user) loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
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
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    } catch {}
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
        } catch {}
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

  if (loading) return <LoadingScreen />;

  const FILTERS: { id: NotificationFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'badges', label: 'Badges' },
    { id: 'social', label: 'Social' },
    { id: 'vehicles', label: 'Vehicles' },
  ];

  return (
    <Layout currentPage="notifications" onNavigate={onNavigate}>
      <div className="max-w-3xl mx-auto page-enter">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 stg">
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700 }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-[11px] mt-0.5 text-tertiary">
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[10px] font-semibold uppercase transition-all active:scale-95 bg-orange-500/15 text-orange-400 border border-orange-500/20"
              style={{ letterSpacing: '1px' }}
            >
              <Check className="w-3 h-3" strokeWidth={2.5} />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 stg" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map(f => {
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                  isActive
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                    : 'text-quaternary border border-white/5'
                }`}
                style={{ letterSpacing: '1.5px' }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Notification list */}
        {filteredNotifications.length === 0 ? (
          <div className="card-v3 py-16 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-surface-2 border border-white/[0.06]">
              <Bell className="w-5 h-5 text-quaternary" strokeWidth={1.2} />
            </div>
            <div>
              <p className="text-[14px] font-medium text-secondary">
                {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
              </p>
              <p className="text-[11px] mt-1 text-tertiary">
                {filter === 'all'
                  ? "When someone interacts with your vehicles, you'll see it here"
                  : 'Try changing your filter to see more notifications'}
              </p>
            </div>
          </div>
        ) : (
          <div>
            {(() => {
              const groups: Record<string, Notification[]> = {};
              filteredNotifications.forEach(n => {
                const group = getDateGroup(n.created_at);
                if (!groups[group]) groups[group] = [];
                groups[group].push(n);
              });

              const groupLabels: Record<string, string> = {
                today: 'Today',
                yesterday: 'Yesterday',
                this_week: 'This Week',
                older: 'Earlier',
              };

              return (['today', 'yesterday', 'this_week', 'older'] as const)
                .filter(g => groups[g]?.length > 0)
                .map(g => (
                  <div key={g}>
                    <div style={{
                      padding: '10px 20px 4px',
                      fontFamily: 'var(--font-cond)', fontSize: '10px', fontWeight: 700,
                      letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)',
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
