import { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, Heart, MessageCircle, User, Award, PartyPopper, Star, Mail, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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

interface NotificationBellProps {
  onNavigate?: (page: string, data?: any) => void;
}

function playVroomSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 0.8;
    const now = audioContext.currentTime;

    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    oscillator1.type = 'sawtooth';
    oscillator2.type = 'square';

    oscillator1.frequency.setValueAtTime(80, now);
    oscillator1.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    oscillator1.frequency.exponentialRampToValueAtTime(120, now + duration);

    oscillator2.frequency.setValueAtTime(40, now);
    oscillator2.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    oscillator2.frequency.exponentialRampToValueAtTime(60, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
    filter.frequency.exponentialRampToValueAtTime(400, now + duration);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.4);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    oscillator1.connect(filter);
    oscillator2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator1.start(now);
    oscillator2.start(now);
    oscillator1.stop(now + duration);
    oscillator2.stop(now + duration);
  } catch {
    // Audio not supported
  }
}

export function NotificationBell({ onNavigate }: NotificationBellProps = {}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  const triggerNotificationAlert = useCallback(() => {
    setIsAnimating(true);
    playVroomSound();
    setTimeout(() => setIsAnimating(false), 1000);
  }, []);

  useEffect(() => {
    if (!user) return;

    loadNotifications();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          triggerNotificationAlert();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, triggerNotificationAlert]);

  const loadNotifications = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(notifications.map(n =>
      n.id === notificationId ? { ...n, is_read: true } : n
    ));
    setUnreadCount(Math.max(0, unreadCount - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string, data?: any) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'like': return <Heart className={`${iconClass} text-[#ec4899]`} />;
      case 'comment': return <MessageCircle className={`${iconClass} text-accent-primary`} />;
      case 'follow': return <User className={`${iconClass} text-positive`} />;
      case 'badge_received': return <Award className={`${iconClass} text-orange`} />;
      case 'badge_unlocked': return <PartyPopper className={`${iconClass} text-accent-2`} />;
      case 'badge_awarded': return <PartyPopper className={`${iconClass} text-accent-2`} />;
      case 'review': return <Star className={`${iconClass} text-[#fbbf24]`} />;
      case 'message': return <Mail className={`${iconClass} text-accent-2`} />;
      case 'admin_action': return <Shield className={`${iconClass} text-[#aa5a5a]`} />;
      default: return <Bell className={`${iconClass} text-tertiary`} />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (onNavigate) {
      setShowDropdown(false);

      // Handle different notification types
      if (notification.link_type === 'admin') {
        onNavigate('admin');
      } else if (notification.type === 'badge_received' || notification.type === 'badge_unlocked' || notification.type === 'badge_awarded') {
        // Navigate to rankings page
        onNavigate('rankings');
      } else if (notification.link_type === 'post' && notification.link_id) {
        // Navigate to feed
        onNavigate('feed');
      } else if (notification.link_type === 'user' && notification.link_id) {
        // Navigate to user profile
        onNavigate('user-profile', notification.link_id);
      } else if (notification.link_type === 'vehicle' && notification.link_id) {
        // Navigate to vehicle detail
        onNavigate('vehicle-detail', notification.link_id);
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={() => onNavigate?.('notifications')}
        className={`relative p-2 rounded-xl transition-all active:scale-95 ${
          isAnimating ? 'animate-notification-pulse' : ''
        }`}
        style={{ color: 'var(--t4)' }}
      >
        <Bell size={17} strokeWidth={1.2} className={`transition-all ${isAnimating ? 'animate-bell-ring' : ''}`} style={{ color: isAnimating ? 'var(--orange)' : 'var(--t4)' }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full px-1"
            style={{
              background: 'var(--orange)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(251, 146, 60, 0.4)'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {isAnimating && (
          <span className="absolute inset-0 rounded-xl animate-ping" style={{ background: 'var(--orange)', opacity: 0.3 }} />
        )}
      </button>

    </div>
  );
}
