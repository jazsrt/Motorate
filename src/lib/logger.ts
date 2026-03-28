/**
 * Production-safe logging utility
 * In production, only errors are logged and sent to Sentry
 * In development, all logs are shown in console
 */

import { captureException, captureMessage } from './sentry';

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Debug logging - only shown in development
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Info logging - only shown in development
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Warning logging - shown in development, sent to Sentry in production
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    } else {
      const message = args.map(arg =>
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');
      captureMessage(message, 'warning');
    }
  },

  /**
   * Error logging - shown in development, sent to Sentry in production
   */
  error: (error: Error | string, context?: Record<string, unknown>) => {
    if (isDev) {
      console.error(error, context);
    } else {
      if (error instanceof Error) {
        captureException(error, context);
      } else {
        captureMessage(error, 'error');
      }
    }
  },

  /**
   * Log method - only shown in development
   * Use this instead of console.log
   */
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
};

/**
 * Create a namespace logger for better organization
 */
export function createLogger(namespace: string) {
  return {
    debug: (...args: unknown[]) => logger.debug(`[${namespace}]`, ...args),
    info: (...args: unknown[]) => logger.info(`[${namespace}]`, ...args),
    warn: (...args: unknown[]) => logger.warn(`[${namespace}]`, ...args),
    error: (error: Error | string, context?: Record<string, unknown>) =>
      logger.error(error, { ...context, namespace }),
    log: (...args: unknown[]) => logger.log(`[${namespace}]`, ...args),
  };
}
