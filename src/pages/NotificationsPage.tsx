import { useEffect, useState } from 'react';
import { Bell, Check, Trash2, Award, Heart, MessageCircle, UserPlus, Shield, Car, Star, Tag, Eye, X } from 'lucide-react';
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
  type: 'review' | 'badge_received' | 'badge_unlocked' | 'badge_awarded' | 'comment' | 'like' | 'follow' | 'message' | 'admin_action';
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
    case 'admin_action':
      return { Icon: Shield, color: 'var(--orange)' };
    default:
      return { Icon: Bell, color: 'var(--t4)' };
  }
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
      className={`card-v3 mb-2 p-3 relative flex items-start gap-3 transition-all duration-200 ${isDeleting ? 'opacity-0 -translate-x-8' : ''} ${isDeadLink ? 'opacity-40' : ''}`}
      style={{
        background: 'var(--carbon-1,#0a0d14)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '14px',
        borderLeft: (() => {
          if (notification.is_read) return '3px solid transparent';
          return `3px solid var(--accent,#F97316)`;
        })(),
        ...((!notification.is_read) ? { background: 'rgba(249,115,22,0.03)' } : {}),
      }}
      {...swipeHandlers}
    >
      {/* Icon circle */}
      <div
        className="rounded-full p-2 flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Icon className="w-4 h-4" strokeWidth={1.5} style={{ color }} />
      </div>

      {/* Unread dot */}
      {!notification.is_read && (
        <div className="notif-dot" style={{ background: 'var(--accent,#F97316)' }} />
      )}

      {/* Content */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onClick(notification)}
      >
        <p
          className="leading-snug"
          style={{
            fontFamily: "'Barlow',sans-serif",
            fontSize: '14px',
            color: isDeadLink ? 'var(--dim,#6a7486)' : 'var(--white,#eef4f8)',
          }}
        >
          {notification.title}
        </p>
        <p
          className="mt-0.5 leading-[1.5]"
          style={{
            fontFamily: "'Barlow',sans-serif",
            fontSize: '12px',
            color: 'var(--light,#a8bcc8)',
          }}
        >
          {notification.message}
        </p>
        <p
          className="mt-1.5"
          style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontWeight: 700,
            fontSize: '9px',
            textTransform: 'uppercase',
            color: 'var(--dim,#6a7486)',
            letterSpacing: '1px',
          }}
        >
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-0.5 flex-shrink-0">
        {!notification.is_read && (
          <button
            onClick={e => { e.stopPropagation(); onMarkAsRead(notification.id); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--accent,#F97316)' }}
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); setIsDeleting(true); setTimeout(() => onDelete(notification.id), 300); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--dim,#6a7486)' }}
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
    if (type === 'review') return 'vehicles';
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
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div className="max-w-3xl mx-auto animate-page-enter" style={{ background: 'var(--black,#030508)' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 stg">
          <div>
            <p
              style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 700,
                fontSize: '11px',
                textTransform: 'uppercase',
                color: 'var(--dim,#6a7486)',
                letterSpacing: '3px',
                marginBottom: '4px',
              }}
            >
              Activity
            </p>
            <h1
              style={{
                fontFamily: "'Rajdhani',sans-serif",
                fontWeight: 700,
                fontSize: '26px',
                color: 'var(--white,#eef4f8)',
                lineHeight: 1.1,
              }}
            >
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p
                style={{
                  fontFamily: "'Barlow',sans-serif",
                  fontSize: '11px',
                  marginTop: '2px',
                  color: 'var(--dim,#6a7486)',
                }}
              >
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all active:scale-95"
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                color: 'var(--light,#a8bcc8)',
                fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 700,
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
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
                className="px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0 transition-all"
                style={{
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontWeight: 700,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  background: isActive ? 'var(--accent,#F97316)' : 'rgba(255,255,255,0.04)',
                  color: isActive ? '#030508' : 'var(--dim,#6a7486)',
                  border: isActive ? 'none' : '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Notification list */}
        {filteredNotifications.length === 0 ? (
          <div
            className="py-16 text-center space-y-4"
            style={{
              background: 'var(--carbon-1,#0a0d14)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '14px',
            }}
          >
            <div
              className="w-12 h-12 mx-auto rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Bell className="w-5 h-5" strokeWidth={1.2} style={{ color: 'var(--dim,#6a7486)' }} />
            </div>
            <div>
              <p
                style={{
                  fontFamily: "'Barlow',sans-serif",
                  fontSize: '14px',
                  color: 'var(--light,#a8bcc8)',
                }}
              >
                {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
              </p>
              <p
                style={{
                  fontFamily: "'Barlow',sans-serif",
                  fontSize: '11px',
                  marginTop: '4px',
                  color: 'var(--dim,#6a7486)',
                }}
              >
                {filter === 'all'
                  ? "When someone interacts with your vehicles, you'll see it here"
                  : 'Try changing your filter to see more notifications'}
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* Today Header */}
            <div className="flex items-center justify-between px-4 py-2 mb-2">
              <span
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '2.5px',
                  color: 'var(--dim,#6a7486)',
                }}
              >
                Today
              </span>
            </div>

            {/* Badge Celebration Card */}
            {filteredNotifications.some(n => (n.type === 'badge_received' || n.type === 'badge_unlocked' || n.type === 'badge_awarded') && !n.is_read) && (
              <div
                className="card-v3 flex items-center gap-3.5 mb-2 px-4 py-4 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08), var(--s1) 50%)', border: '1px solid rgba(249,115,22,0.15)' }}
              >
                <div className="absolute top-0 left-[20%] right-[20%] h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--orange), transparent)' }} />
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(145deg, #806828, #a8883e 40%, #c8a45a 55%, #a8883e 70%, #806828)', boxShadow: '0 0 20px rgba(249,115,22,0.12)' }}>
                  <Award className="w-5 h-5" strokeWidth={1.2} style={{ color: '#1a1400' }} />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "'Barlow Condensed',sans-serif",
                      fontWeight: 700,
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      color: 'var(--accent,#F97316)',
                    }}
                  >
                    Badge Earned
                  </p>
                  <p
                    style={{
                      fontFamily: "'Barlow',sans-serif",
                      fontSize: '14px',
                      marginTop: '2px',
                      color: 'var(--white,#eef4f8)',
                    }}
                  >
                    {filteredNotifications.find(n => (n.type === 'badge_received' || n.type === 'badge_unlocked' || n.type === 'badge_awarded') && !n.is_read)?.title || 'New Badge'}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Barlow',sans-serif",
                      fontSize: '11px',
                      marginTop: '2px',
                      color: 'var(--dim,#6a7486)',
                    }}
                  >
                    Tap to view your achievement
                  </p>
                </div>
              </div>
            )}

            {filteredNotifications.map(notification => (
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
