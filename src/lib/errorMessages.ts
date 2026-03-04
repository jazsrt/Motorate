/**
 * Error Messages
 *
 * Provides user-friendly error messages for common error scenarios
 * instead of generic "Something went wrong" messages.
 */

import { PostgrestError } from '@supabase/supabase-js';

/**
 * Error categories for better organization
 */
export enum ErrorCategory {
  AUTH = 'Authentication',
  NETWORK = 'Network',
  VALIDATION = 'Validation',
  PERMISSION = 'Permission',
  NOT_FOUND = 'Not Found',
  RATE_LIMIT = 'Rate Limit',
  FILE_UPLOAD = 'File Upload',
  DATABASE = 'Database',
  UNKNOWN = 'Unknown',
}

/**
 * Structured error with category and user-friendly message
 */
export interface AppError {
  category: ErrorCategory;
  message: string;
  technicalDetails?: string;
  action?: string;
}

/**
 * Authentication error messages
 */
const AUTH_ERRORS: Record<string, AppError> = {
  'Invalid login credentials': {
    category: ErrorCategory.AUTH,
    message: 'The email or password you entered is incorrect.',
    action: 'Please check your credentials and try again.',
  },
  'Email not confirmed': {
    category: ErrorCategory.AUTH,
    message: 'Please verify your email address before logging in.',
    action: 'Check your inbox for a verification email.',
  },
  'User already registered': {
    category: ErrorCategory.AUTH,
    message: 'An account with this email already exists.',
    action: 'Try logging in or use the "Forgot Password" option.',
  },
  'Password should be at least 8 characters': {
    category: ErrorCategory.AUTH,
    message: 'Your password must be at least 8 characters long.',
    action: 'Please choose a longer password.',
  },
  'Invalid email': {
    category: ErrorCategory.AUTH,
    message: 'The email address format is invalid.',
    action: 'Please enter a valid email address.',
  },
  'User not found': {
    category: ErrorCategory.AUTH,
    message: 'No account found with this email address.',
    action: 'Please check your email or create a new account.',
  },
  'Token expired': {
    category: ErrorCategory.AUTH,
    message: 'Your session has expired.',
    action: 'Please log in again to continue.',
  },
};

/**
 * Network error messages
 */
const NETWORK_ERRORS: Record<string, AppError> = {
  'Failed to fetch': {
    category: ErrorCategory.NETWORK,
    message: 'Unable to connect to the server.',
    action: 'Please check your internet connection and try again.',
  },
  'Network request failed': {
    category: ErrorCategory.NETWORK,
    message: 'Network connection lost.',
    action: 'Please check your internet connection.',
  },
  'timeout': {
    category: ErrorCategory.NETWORK,
    message: 'The request took too long to complete.',
    action: 'Please try again.',
  },
};

/**
 * Database error messages
 */
const DATABASE_ERRORS: Record<string, AppError> = {
  '23505': {
    // Unique violation
    category: ErrorCategory.DATABASE,
    message: 'This record already exists.',
    action: 'Please use a different value.',
  },
  '23503': {
    // Foreign key violation
    category: ErrorCategory.DATABASE,
    message: 'Cannot complete this action due to related data.',
    action: 'Please try again or contact support.',
  },
  '42501': {
    // Insufficient privilege
    category: ErrorCategory.PERMISSION,
    message: 'You do not have permission to perform this action.',
    action: 'Please contact support if you believe this is an error.',
  },
  '42P01': {
    // Undefined table
    category: ErrorCategory.DATABASE,
    message: 'Database error: required data not found.',
    action: 'Please contact support.',
  },
};

/**
 * File upload error messages
 */
export const FILE_UPLOAD_ERRORS = {
  FILE_TOO_LARGE: {
    category: ErrorCategory.FILE_UPLOAD,
    message: 'The file you selected is too large.',
    action: 'Please choose a smaller file.',
  },
  INVALID_FILE_TYPE: {
    category: ErrorCategory.FILE_UPLOAD,
    message: 'This file type is not supported.',
    action: 'Please select a JPEG, PNG, or WebP image.',
  },
  UPLOAD_FAILED: {
    category: ErrorCategory.FILE_UPLOAD,
    message: 'Failed to upload the file.',
    action: 'Please try again or choose a different file.',
  },
} as const;

/**
 * Validation error messages
 */
export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: {
    category: ErrorCategory.VALIDATION,
    message: 'This field is required.',
    action: 'Please fill in all required fields.',
  },
  INVALID_EMAIL: {
    category: ErrorCategory.VALIDATION,
    message: 'Please enter a valid email address.',
    action: 'Check the format of your email.',
  },
  INVALID_URL: {
    category: ErrorCategory.VALIDATION,
    message: 'Please enter a valid URL.',
    action: 'URLs should start with http:// or https://',
  },
  TOO_SHORT: {
    category: ErrorCategory.VALIDATION,
    message: 'This value is too short.',
    action: 'Please enter more characters.',
  },
  TOO_LONG: {
    category: ErrorCategory.VALIDATION,
    message: 'This value is too long.',
    action: 'Please shorten your input.',
  },
  INVALID_LICENSE_PLATE: {
    category: ErrorCategory.VALIDATION,
    message: 'Please enter a valid license plate number.',
    action: 'License plates should be 2-10 alphanumeric characters.',
  },
  INVALID_VIN: {
    category: ErrorCategory.VALIDATION,
    message: 'Please enter a valid 17-character VIN.',
    action: 'VINs are exactly 17 characters (letters and numbers).',
  },
} as const;

/**
 * Permission error messages
 */
export const PERMISSION_ERRORS = {
  NOT_AUTHORIZED: {
    category: ErrorCategory.PERMISSION,
    message: 'You are not authorized to perform this action.',
    action: 'Please log in or contact support.',
  },
  BLOCKED_USER: {
    category: ErrorCategory.PERMISSION,
    message: 'You have been blocked from performing this action.',
    action: 'Please contact support for more information.',
  },
  PRIVATE_CONTENT: {
    category: ErrorCategory.PERMISSION,
    message: 'This content is private.',
    action: 'You need permission to view this content.',
  },
} as const;

/**
 * Rate limit error messages
 */
export const RATE_LIMIT_ERRORS = {
  TOO_MANY_REQUESTS: {
    category: ErrorCategory.RATE_LIMIT,
    message: 'You are making requests too quickly.',
    action: 'Please wait a moment and try again.',
  },
  DAILY_LIMIT_REACHED: {
    category: ErrorCategory.RATE_LIMIT,
    message: 'You have reached your daily limit.',
    action: 'Please try again tomorrow.',
  },
} as const;

/**
 * Default fallback error
 */
const DEFAULT_ERROR: AppError = {
  category: ErrorCategory.UNKNOWN,
  message: 'An unexpected error occurred.',
  action: 'Please try again. If the problem persists, contact support.',
};

/**
 * Parse a Supabase Postgrest error
 */
function parsePostgrestError(error: PostgrestError): AppError {
  // Check for specific error codes
  if (error.code && DATABASE_ERRORS[error.code]) {
    return {
      ...DATABASE_ERRORS[error.code],
      technicalDetails: error.message,
    };
  }

  // Check for permission errors
  if (error.message.toLowerCase().includes('permission') ||
      error.message.toLowerCase().includes('access denied')) {
    return {
      category: ErrorCategory.PERMISSION,
      message: 'You do not have permission to perform this action.',
      action: 'Please contact support if you believe this is an error.',
      technicalDetails: error.message,
    };
  }

  // Check for unique constraint violations
  if (error.message.toLowerCase().includes('duplicate') ||
      error.message.toLowerCase().includes('already exists')) {
    return {
      category: ErrorCategory.DATABASE,
      message: 'This item already exists.',
      action: 'Please use a different value.',
      technicalDetails: error.message,
    };
  }

  // Default database error
  return {
    category: ErrorCategory.DATABASE,
    message: 'A database error occurred.',
    action: 'Please try again or contact support.',
    technicalDetails: error.message,
  };
}

/**
 * Get user-friendly error message from any error
 *
 * @param error - The error to parse (can be Error, string, or PostgrestError)
 * @returns Structured AppError with user-friendly message
 */
export function getErrorMessage(error: unknown): AppError {
  // Handle null/undefined
  if (!error) {
    return DEFAULT_ERROR;
  }

  // Handle string errors
  if (typeof error === 'string') {
    // Check auth errors
    if (AUTH_ERRORS[error]) {
      return AUTH_ERRORS[error];
    }

    // Check network errors
    if (NETWORK_ERRORS[error]) {
      return NETWORK_ERRORS[error];
    }

    return {
      category: ErrorCategory.UNKNOWN,
      message: error,
      action: 'Please try again.',
    };
  }

  // Handle Error objects
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Check auth errors
    for (const [key, value] of Object.entries(AUTH_ERRORS)) {
      if (errorMessage.includes(key.toLowerCase())) {
        return { ...value, technicalDetails: error.message };
      }
    }

    // Check network errors
    for (const [key, value] of Object.entries(NETWORK_ERRORS)) {
      if (errorMessage.includes(key.toLowerCase())) {
        return { ...value, technicalDetails: error.message };
      }
    }

    // Check for rate limiting
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      return {
        ...RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS,
        technicalDetails: error.message,
      };
    }

    // Check for 404
    if (errorMessage.includes('not found')) {
      return {
        category: ErrorCategory.NOT_FOUND,
        message: 'The requested item was not found.',
        action: 'Please check and try again.',
        technicalDetails: error.message,
      };
    }

    return {
      ...DEFAULT_ERROR,
      technicalDetails: error.message,
    };
  }

  // Handle Postgrest errors
  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    return parsePostgrestError(error as PostgrestError);
  }

  // Fallback
  return DEFAULT_ERROR;
}

/**
 * Format an AppError for display in a toast or alert
 */
export function formatErrorForDisplay(error: AppError, includeAction: boolean = true): string {
  let message = error.message;

  if (includeAction && error.action) {
    message += ` ${error.action}`;
  }

  return message;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === 'string') {
    return Object.keys(NETWORK_ERRORS).some(key =>
      error.toLowerCase().includes(key.toLowerCase())
    );
  }

  if (error instanceof Error) {
    return Object.keys(NETWORK_ERRORS).some(key =>
      error.message.toLowerCase().includes(key.toLowerCase())
    );
  }

  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === 'string') {
    return Object.keys(AUTH_ERRORS).some(key =>
      error.toLowerCase().includes(key.toLowerCase())
    );
  }

  if (error instanceof Error) {
    return Object.keys(AUTH_ERRORS).some(key =>
      error.message.toLowerCase().includes(key.toLowerCase())
    );
  }

  return false;
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;

  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  return lowerMessage.includes('rate limit') ||
         lowerMessage.includes('too many') ||
         lowerMessage.includes('throttle');
}
