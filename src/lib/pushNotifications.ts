import { supabase } from './supabase';

/**
 * Detect if the device is iOS
 */
export function isIOS(): boolean {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

/**
 * Detect if the device is running iOS 16.4+ (supports web push)
 */
export function isIOSWithPushSupport(): boolean {
  if (!isIOS()) return false;

  const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  if (!match) return false;

  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);

  return major > 16 || (major === 16 && minor >= 4);
}

/**
 * Check if push notifications are supported in this browser
 */
export function isPushSupported(): boolean {
  const hasBasicSupport = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  if (isIOS()) {
    return hasBasicSupport && isIOSWithPushSupport();
  }

  return hasBasicSupport;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    return registration;
  } catch (error) {
    console.warn('Service Worker registration failed (this is expected in some environments):', error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Request permission and get subscription
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.ready;

  // Get VAPID public key from environment
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.error('VITE_VAPID_PUBLIC_KEY not configured');
    return null;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
  });

  return subscription;
}

/**
 * Subscribe to push notifications (combined flow)
 */
export async function subscribeToPushNotifications(userId: string): Promise<boolean> {
  try {
    const subscription = await subscribeToPush();
    if (!subscription) return false;

    await saveSubscription(userId, subscription);
    return true;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return false;
  }
}

/**
 * Save subscription to database
 */
export async function saveSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  const subscriptionJSON = subscription.toJSON();
  const deviceInfo = `${navigator.userAgent} - ${new Date().toISOString()}`;

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscriptionJSON.keys?.p256dh || '',
      auth: subscriptionJSON.keys?.auth || '',
      device_info: deviceInfo,
      active: true
    }, {
      onConflict: 'endpoint'
    });

  if (error) throw error;
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
  }

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId);
}

/**
 * Unsubscribe (alias for compatibility)
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint);

      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

export async function checkPushNotificationStatus(): Promise<{
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  isIOS: boolean;
  iosVersion?: string;
}> {
  const supported = isPushSupported();
  const deviceIsIOS = isIOS();

  let iosVersion: string | undefined;
  if (deviceIsIOS) {
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
    if (match) {
      iosVersion = `${match[1]}.${match[2]}`;
    }
  }

  if (!supported) {
    return {
      supported: false,
      permission: 'denied',
      subscribed: false,
      isIOS: deviceIsIOS,
      iosVersion
    };
  }

  const permission = Notification.permission;

  let subscribed = false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    subscribed = subscription !== null;
  } catch (error) {
    console.error('Error checking subscription status:', error);
  }

  return { supported, permission, subscribed, isIOS: deviceIsIOS, iosVersion };
}
