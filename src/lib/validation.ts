export const VALIDATION = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  password: /.{8,}/,
  licensePlate: /^[A-Z0-9]{1,10}$/i,
};

export const FILE_VALIDATION = {
  maxSize: 10 * 1024 * 1024,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  allowedVideoTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
};

export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required';
  if (!VALIDATION.email.test(email)) return 'Invalid email format';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
}

export function validateUsername(username: string): string | null {
  if (!username) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (!VALIDATION.username.test(username)) return 'Username can only contain letters, numbers, and underscores';
  return null;
}

// Keep old function name for backward compatibility
export function validateHandle(handle: string): string | null {
  return validateUsername(handle);
}

export function validateFile(file: File, type: 'image' | 'video'): string | null {
  if (!file) return 'File is required';
  if (file.size > FILE_VALIDATION.maxSize) return 'File size must be under 10MB';

  const allowed = type === 'image' ? FILE_VALIDATION.allowedImageTypes : FILE_VALIDATION.allowedVideoTypes;
  if (!allowed.includes(file.type)) return 'Invalid file type';

  return null;
}
