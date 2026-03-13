/**
 * Location Privacy Utilities
 *
 * CRITICAL: These functions enforce privacy by:
 * 1. Fuzzing coordinates to ~1km radius
 * 2. Adding posting delays to prevent real-time tracking
 *
 * NEVER store or display exact coordinates.
 */

export interface FuzzedLocation {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface DelayedPost {
  scheduledFor: string;
  canPostImmediately: boolean;
}

/**
 * Fuzz coordinates to a random point within a specified radius.
 *
 * CRITICAL P0 SECURITY: This prevents exact location tracking while maintaining general area info.
 *
 * MINIMUM RADIUS: 1km (enforced for privacy compliance)
 * - Default: 1.5km radius (good balance of privacy and utility)
 * - Never allows less than 1km radius
 * - Exact GPS coordinates MUST NEVER be stored in the database
 *
 * This prevents:
 * - Real-time stalking
 * - Home address discovery
 * - Pattern-based location profiling
 *
 * @param latitude - Original latitude
 * @param longitude - Original longitude
 * @param radiusKm - Fuzz radius in kilometers (minimum 1.0, default 1.5)
 * @returns Fuzzed coordinates safe for storage
 */
export function fuzzCoordinates(
  latitude: number,
  longitude: number,
  radiusKm: number = 1.5
): FuzzedLocation {
  // CRITICAL: Enforce minimum 1km radius for P0 security compliance
  const safeRadius = Math.max(radiusKm, 1.0);

  // Convert km to degrees (approximate)
  // 1 degree latitude ≈ 111 km
  // For longitude, we need to account for latitude (convergence at poles)
  const latRadians = (latitude * Math.PI) / 180;

  // Random angle and distance for uniform distribution
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.sqrt(Math.random()) * safeRadius; // Square root for uniform distribution

  // Calculate offsets
  const latOffset = (distance / 111) * Math.cos(angle);
  const lngOffset = (distance / (111 * Math.cos(latRadians))) * Math.sin(angle);

  const fuzzedLat = latitude + latOffset;
  const fuzzedLng = longitude + lngOffset;

  // Validate coordinates are within valid ranges
  const validLat = Math.max(-90, Math.min(90, fuzzedLat));
  const validLng = ((fuzzedLng + 180) % 360) - 180; // Wrap longitude to -180..180

  return {
    latitude: validLat,
    longitude: validLng,
  };
}

/**
 * Calculate when a post can be published
 * Enforces minimum delay to prevent real-time stalking
 */
export function calculatePostDelay(delayMinutes: number = 60): DelayedPost {
  const now = new Date();
  const scheduledFor = new Date(now.getTime() + delayMinutes * 60 * 1000);

  return {
    scheduledFor: scheduledFor.toISOString(),
    canPostImmediately: false,
  };
}

/**
 * Check if enough time has passed to publish a delayed post
 */
export function canPublishPost(scheduledFor: string): boolean {
  const scheduled = new Date(scheduledFor);
  const now = new Date();
  return now >= scheduled;
}

/**
 * Get user-friendly delay message
 */
export function getDelayMessage(scheduledFor: string): string {
  const scheduled = new Date(scheduledFor);
  const now = new Date();
  const diffMs = scheduled.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Your post is ready to publish!';
  }

  const diffMinutes = Math.ceil(diffMs / (1000 * 60));

  if (diffMinutes < 60) {
    return `Your post will be published in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  }

  const diffHours = Math.ceil(diffMinutes / 60);
  return `Your post will be published in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get current location with browser geolocation API
 */
export function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}
