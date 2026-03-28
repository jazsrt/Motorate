export class AppError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
  }
}

export const ERROR_MESSAGES: Record<string, string> = {
  'invalid_credentials': 'Invalid email or password',
  'user_not_found': 'No account found with this email',
  'email_taken': 'This email is already registered',
  'weak_password': 'Password must be at least 8 characters',
  'PGRST116': 'No records found',
  '23505': 'This record already exists',
  'storage_error': 'Failed to upload file',
  'file_too_large': 'File size must be under 10MB',
  'network_error': 'Network error. Please check your connection',
  'unknown_error': 'Something went wrong. Please try again',
  'unauthorized': 'You must be logged in to do this',
};

export function getErrorMessage(error: unknown): string {
  const err = error as { message?: string; code?: string } | null;
  if (err?.message) {
    const message = err.message.toLowerCase();

    if (message.includes('invalid login credentials')) {
      return ERROR_MESSAGES.invalid_credentials;
    }
    if (message.includes('user not found')) {
      return ERROR_MESSAGES.user_not_found;
    }
    if (message.includes('already registered') || message.includes('duplicate')) {
      return ERROR_MESSAGES.email_taken;
    }
    if (message.includes('password')) {
      return ERROR_MESSAGES.weak_password;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_MESSAGES.network_error;
    }
    if (message.includes('storage')) {
      return ERROR_MESSAGES.storage_error;
    }
  }

  if (err?.code) {
    const errorMsg = ERROR_MESSAGES[err.code];
    if (errorMsg) return errorMsg;
  }

  return ERROR_MESSAGES.unknown_error;
}
