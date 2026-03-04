import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  checkPushNotificationStatus,
  requestNotificationPermission,
  subscribeToPushNotifications
} from '../lib/pushNotifications';

export function PushNotificationPrompt() {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowPrompt(false);
      return;
    }

    checkIfShouldPrompt();
  }, [user]);

  const checkIfShouldPrompt = async () => {
    const dismissed = localStorage.getItem('push-notification-dismissed');
    if (dismissed === 'true') {
      return;
    }

    const status = await checkPushNotificationStatus();

    if (status.supported && status.permission === 'default' && !status.subscribed) {
      setTimeout(() => setShowPrompt(true), 3000);
    }
  };

  const handleEnable = async () => {
    if (!user) return;

    setIsSubscribing(true);

    try {
      const permission = await requestNotificationPermission();

      if (permission === 'granted') {
        const subscribed = await subscribeToPushNotifications(user.id);

        if (subscribed) {
          setShowPrompt(false);
          localStorage.setItem('push-notification-dismissed', 'true');
        } else {
          alert('Failed to enable notifications. Please try again.');
        }
      } else {
        alert('Notification permission denied. You can enable it later in your browser settings.');
        setShowPrompt(false);
        localStorage.setItem('push-notification-dismissed', 'true');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      alert('Failed to enable notifications. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('push-notification-dismissed', 'true');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-surface border-2 border-accent-primary rounded-xl shadow-2xl p-4 z-50 animate-slide-up">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-surfacehighlight rounded-lg transition"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-accent-primary rounded-xl flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm mb-1">Stay Updated</h3>
          <p className="text-xs text-secondary">
            Get instant notifications when someone likes or comments on your posts
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleEnable}
          disabled={isSubscribing}
          className="flex-1 bg-accent-primary hover:bg-accent-hover text-black font-bold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
        >
          {isSubscribing ? 'Enabling...' : 'Enable'}
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 hover:bg-surfacehighlight rounded-lg transition text-sm text-secondary uppercase tracking-wider font-bold"
        >
          Not Now
        </button>
      </div>
    </div>
  );
}
