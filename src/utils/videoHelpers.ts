/**
 * Video compatibility and validation utilities
 */

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

export const VIDEO_CONSTRAINTS = {
  maxSize: 50 * 1024 * 1024, // 50MB
  maxDuration: 300, // 5 minutes
  supportedFormats: ['video/mp4', 'video/webm', 'video/ogg'],
  supportedExtensions: ['.mp4', '.webm', '.ogg']
};

/**
 * Check if the browser can play the video file
 * This validates codec compatibility before upload
 */
export async function ensureVideoCompatibility(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(true);
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(false);
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Extract video metadata (duration, dimensions)
 */
export function getVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const metadata: VideoMetadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      };
      window.URL.revokeObjectURL(video.src);
      resolve(metadata);
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Cannot read video metadata'));
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Validate video file before upload
 * Returns error message if invalid, null if valid
 */
export async function validateVideoFile(file: File): Promise<string | null> {
  // Check file size
  if (file.size > VIDEO_CONSTRAINTS.maxSize) {
    const sizeMB = (VIDEO_CONSTRAINTS.maxSize / (1024 * 1024)).toFixed(0);
    return `Video file is too large. Maximum size is ${sizeMB}MB.`;
  }

  // Check file type
  if (!VIDEO_CONSTRAINTS.supportedFormats.includes(file.type)) {
    return 'Unsupported file type. Please use MP4, WebM, or Ogg format.';
  }

  // Check browser compatibility
  const isCompatible = await ensureVideoCompatibility(file);
  if (!isCompatible) {
    return 'This video format is not supported by web browsers. Please use MP4 with H.264 codec. You can convert your video at https://cloudconvert.com/mp4-converter';
  }

  // Get and check metadata
  try {
    const metadata = await getVideoMetadata(file);

    if (metadata.duration > VIDEO_CONSTRAINTS.maxDuration) {
      const maxMinutes = Math.floor(VIDEO_CONSTRAINTS.maxDuration / 60);
      return `Video is too long. Maximum duration is ${maxMinutes} minutes.`;
    }
  } catch {
    return 'Error reading video file. The file may be corrupted. Please try a different file.';
  }

  // All validations passed
  return null;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format duration for display (seconds to MM:SS)
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
