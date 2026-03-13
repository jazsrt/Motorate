import * as Sentry from '@sentry/react';

export function initSentry() {
  // Only initialize in production or if explicitly enabled
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE;

  if (!sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive query parameters
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url);
          // Remove any auth tokens from URL
          url.searchParams.delete('token');
          url.searchParams.delete('key');
          url.searchParams.delete('api_key');
          event.request.url = url.toString();
        } catch (e) {
          // Invalid URL, leave as is
        }
      }

      // Remove localStorage/sessionStorage data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.category === 'console') {
            delete breadcrumb.data;
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Ignore common errors
    ignoreErrors: [
      // Network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',

      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',

      // Service Worker errors
      'ServiceWorker',

      // Third-party errors
      'ResizeObserver loop limit exceeded',
    ],
  });
}

// Set user context when authenticated
export function setSentryUser(user: { id: string; email?: string; handle?: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      username: user.handle,
      email: user.email,
    });
  } else {
    Sentry.setUser(null);
  }
}

// Capture exceptions manually
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

// Capture messages manually
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}
