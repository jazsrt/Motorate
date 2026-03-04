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
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Info logging - only shown in development
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Warning logging - shown in development, sent to Sentry in production
   */
  warn: (...args: any[]) => {
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
  error: (error: Error | string, context?: Record<string, any>) => {
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
  log: (...args: any[]) => {
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
    debug: (...args: any[]) => logger.debug(`[${namespace}]`, ...args),
    info: (...args: any[]) => logger.info(`[${namespace}]`, ...args),
    warn: (...args: any[]) => logger.warn(`[${namespace}]`, ...args),
    error: (error: Error | string, context?: Record<string, any>) =>
      logger.error(error, { ...context, namespace }),
    log: (...args: any[]) => logger.log(`[${namespace}]`, ...args),
  };
}
