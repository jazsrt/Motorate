/**
 * Application Constants
 *
 * Centralizes all magic numbers, thresholds, and configuration values
 * to improve maintainability and avoid hardcoded values throughout the codebase.
 */

// ============================================================================
// PRIVACY & SECURITY
// ============================================================================

export const LOCATION_PRIVACY = {
  /** Minimum fuzzing radius in kilometers (enforced for privacy) */
  MIN_FUZZ_RADIUS_KM: 1.0,
  /** Default fuzzing radius in kilometers */
  DEFAULT_FUZZ_RADIUS_KM: 1.5,
  /** Maximum fuzzing radius in kilometers */
  MAX_FUZZ_RADIUS_KM: 5.0,
  /** Minimum delay for location-based posts (in minutes) */
  MIN_POST_DELAY_MINUTES: 60,
} as const;

// ============================================================================
// REPUTATION & SCORING
// ============================================================================

export const REPUTATION_TIERS = {
  PERMIT:       { min: 0,     name: 'Permit' },
  LEARNER:      { min: 25,    name: 'Learner' },
  LICENSED:     { min: 100,   name: 'Licensed' },
  REGISTERED:   { min: 250,   name: 'Registered' },
  CERTIFIED:    { min: 500,   name: 'Certified' },
  ENDORSED:     { min: 1000,  name: 'Endorsed' },
  AUTHORITY:    { min: 2500,  name: 'Authority' },
  DISTINGUISHED:{ min: 5000,  name: 'Distinguished' },
  ELITE:        { min: 10000, name: 'Elite' },
  SOVEREIGN:    { min: 25000, name: 'Sovereign' },
  ICONIC:       { min: 50000, name: 'Iconic' },
} as const;

export const REPUTATION_POINTS = {
  /** Points earned for creating a post */
  POST_CREATE: 10,
  /** Points earned per reaction received on post */
  POST_REACTION: 2,
  /** Points earned for leaving a comment */
  COMMENT_CREATE: 5,
  /** Points earned per like received on comment */
  COMMENT_LIKE: 1,
  /** Points earned for verifying a vehicle */
  VEHICLE_VERIFY: 50,
  /** Points earned for reporting content (if approved) */
  REPORT_APPROVED: 25,
  /** Points lost for having content removed */
  CONTENT_REMOVED: -50,
  /** Points lost for being reported (if upheld) */
  REPORTED_UPHELD: -100,
} as const;

export const MOTORATE_SCORE = {
  /** Maximum MotoRate Score value */
  MAX_SCORE: 1000,
  /** Minimum MotoRate Score value */
  MIN_SCORE: 0,
  /** Default starting score for new users */
  DEFAULT_SCORE: 500,
  /** Multiplier for positive ratings */
  POSITIVE_MULTIPLIER: 2,
  /** Divisor for negative ratings */
  NEGATIVE_DIVISOR: 3,
} as const;

// ============================================================================
// BADGE THRESHOLDS
// ============================================================================

export const BADGE_THRESHOLDS = {
  CONTENT_CREATOR: { BRONZE: 1, SILVER: 10, GOLD: 50, PLATINUM: 150 },
  COMMENTER: { BRONZE: 1, SILVER: 10, GOLD: 50, PLATINUM: 200 },
  REACTOR: { BRONZE: 10, SILVER: 50, GOLD: 250, PLATINUM: 1000 },
  POPULAR: { BRONZE: 5, SILVER: 25, GOLD: 100, PLATINUM: 500 },
  GETTING_NOTICED: { BRONZE: 5, SILVER: 25, GOLD: 100, PLATINUM: 500 },
  HELPFUL_HAND: { BRONZE: 5, SILVER: 25, GOLD: 100, PLATINUM: 500 },
  PHOTOGRAPHER: { BRONZE: 5, SILVER: 25, GOLD: 100, PLATINUM: 500 },
  LOCATION_SCOUT: { BRONZE: 3, SILVER: 10, GOLD: 50, PLATINUM: 200 },
  BUILDER: { BRONZE: 1, SILVER: 5, GOLD: 10, PLATINUM: 20 },
  SPOTTER: { BRONZE: 3, SILVER: 10, GOLD: 50, PLATINUM: 250 },
  REVIEWER: { BRONZE: 3, SILVER: 10, GOLD: 50, PLATINUM: 200 },
  SOCIAL_STARTER_FOLLOWS: 5,
} as const;

// ============================================================================
// RATE LIMITING
// ============================================================================

export const RATE_LIMITS = {
  /** Maximum posts per hour */
  POSTS_PER_HOUR: 10,
  /** Maximum comments per hour */
  COMMENTS_PER_HOUR: 30,
  /** Maximum reactions per hour */
  REACTIONS_PER_HOUR: 100,
  /** Maximum reports per day */
  REPORTS_PER_DAY: 10,
  /** Maximum follows per hour */
  FOLLOWS_PER_HOUR: 20,
  /** Maximum profile views per hour */
  PROFILE_VIEWS_PER_HOUR: 50,
  /** Maximum search queries per minute */
  SEARCHES_PER_MINUTE: 10,
  /** Maximum vehicle claims per day */
  VEHICLE_CLAIMS_PER_DAY: 3,
} as const;

// ============================================================================
// FILE UPLOADS
// ============================================================================

export const FILE_UPLOAD = {
  /** Maximum file size for images (10MB) */
  MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024,
  /** Maximum file size for videos (100MB) */
  MAX_VIDEO_SIZE_BYTES: 100 * 1024 * 1024,
  /** Maximum file size for verification documents (10MB) */
  MAX_DOCUMENT_SIZE_BYTES: 10 * 1024 * 1024,
  /** Allowed image MIME types */
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  /** Allowed video MIME types */
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime', 'video/webm'],
  /** Allowed document MIME types */
  ALLOWED_DOCUMENT_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
} as const;

// ============================================================================
// PAGINATION
// ============================================================================

export const PAGINATION = {
  /** Default number of posts per page */
  POSTS_PER_PAGE: 20,
  /** Default number of comments per page */
  COMMENTS_PER_PAGE: 50,
  /** Default number of notifications per page */
  NOTIFICATIONS_PER_PAGE: 30,
  /** Default number of search results per page */
  SEARCH_RESULTS_PER_PAGE: 20,
  /** Default number of vehicles per page */
  VEHICLES_PER_PAGE: 12,
  /** Default number of users per page */
  USERS_PER_PAGE: 20,
} as const;

// ============================================================================
// MODERATION
// ============================================================================

export const MODERATION = {
  /** Minimum reports to auto-flag content */
  AUTO_FLAG_THRESHOLD: 3,
  /** Minimum reports to auto-hide content */
  AUTO_HIDE_THRESHOLD: 5,
  /** Days until content auto-expires */
  CONTENT_EXPIRY_DAYS: 365,
  /** Maximum content length for posts */
  MAX_POST_LENGTH: 2000,
  /** Maximum content length for comments */
  MAX_COMMENT_LENGTH: 1000,
  /** Maximum content length for bio */
  MAX_BIO_LENGTH: 500,
  /** Minimum username length */
  MIN_USERNAME_LENGTH: 3,
  /** Maximum username length */
  MAX_USERNAME_LENGTH: 30,
} as const;

// ============================================================================
// VEHICLE VERIFICATION
// ============================================================================

export const VERIFICATION = {
  /** Verification types */
  TYPES: ['registration', 'insurance', 'title', 'vin_photo'] as const,
  /** Verification statuses */
  STATUSES: ['pending', 'approved', 'rejected'] as const,
  /** Days until verification expires */
  EXPIRY_DAYS: 365,
  /** Maximum verification attempts per vehicle */
  MAX_ATTEMPTS: 3,
} as const;

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const NOTIFICATIONS = {
  /** Days to keep read notifications */
  READ_RETENTION_DAYS: 30,
  /** Days to keep unread notifications */
  UNREAD_RETENTION_DAYS: 90,
  /** Maximum notifications to fetch at once */
  MAX_FETCH_LIMIT: 100,
} as const;

// ============================================================================
// ANALYTICS
// ============================================================================

export const ANALYTICS = {
  /** Days to retain view data */
  VIEW_RETENTION_DAYS: 90,
  /** Minimum time to count as a view (seconds) */
  MIN_VIEW_DURATION_SECONDS: 3,
  /** Days to aggregate stats */
  STATS_AGGREGATION_DAYS: 30,
} as const;

// ============================================================================
// SOCIAL FEATURES
// ============================================================================

export const SOCIAL = {
  /** Maximum characters for a status update */
  MAX_STATUS_LENGTH: 280,
  /** Maximum number of hashtags per post */
  MAX_HASHTAGS: 10,
  /** Maximum number of mentions per post */
  MAX_MENTIONS: 10,
  /** Default privacy setting for new posts */
  DEFAULT_PRIVACY: 'public' as const,
  /** Maximum number of photos in a post */
  MAX_PHOTOS_PER_POST: 10,
} as const;

// ============================================================================
// MESSAGING
// ============================================================================

export const MESSAGING = {
  /** Maximum message length */
  MAX_MESSAGE_LENGTH: 1000,
  /** Maximum messages per conversation to load */
  MESSAGES_PER_LOAD: 50,
  /** Days to keep messages */
  MESSAGE_RETENTION_DAYS: 365,
  /** Maximum conversations to show in sidebar */
  MAX_CONVERSATIONS_DISPLAYED: 20,
} as const;

// ============================================================================
// SEARCH
// ============================================================================

export const SEARCH = {
  /** Minimum query length for search */
  MIN_QUERY_LENGTH: 2,
  /** Maximum query length for search */
  MAX_QUERY_LENGTH: 100,
  /** Maximum search results to return */
  MAX_RESULTS: 100,
  /** Search debounce delay (ms) */
  DEBOUNCE_DELAY_MS: 300,
} as const;

// ============================================================================
// UI/UX
// ============================================================================

export const UI = {
  /** Toast notification duration (ms) */
  TOAST_DURATION_MS: 5000,
  /** Error toast duration (ms) */
  ERROR_TOAST_DURATION_MS: 8000,
  /** Success toast duration (ms) */
  SUCCESS_TOAST_DURATION_MS: 3000,
  /** Modal animation duration (ms) */
  MODAL_ANIMATION_DURATION_MS: 200,
  /** Skeleton loading rows */
  SKELETON_ROWS: 5,
  /** Infinite scroll trigger distance (px) */
  INFINITE_SCROLL_THRESHOLD_PX: 500,
} as const;

// ============================================================================
// PERFORMANCE
// ============================================================================

export const PERFORMANCE = {
  /** Image optimization quality (0-100) */
  IMAGE_QUALITY: 85,
  /** Thumbnail width (px) */
  THUMBNAIL_WIDTH_PX: 400,
  /** Maximum image width before compression (px) */
  MAX_IMAGE_WIDTH_PX: 1920,
  /** Maximum image height before compression (px) */
  MAX_IMAGE_HEIGHT_PX: 1080,
  /** Lazy load threshold (px) */
  LAZY_LOAD_THRESHOLD_PX: 300,
} as const;

// ============================================================================
// VALIDATION
// ============================================================================

export const VALIDATION = {
  /** Password minimum length */
  PASSWORD_MIN_LENGTH: 8,
  /** Password maximum length */
  PASSWORD_MAX_LENGTH: 128,
  /** Email regex pattern */
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  /** Username regex pattern (alphanumeric, underscore, hyphen) */
  USERNAME_PATTERN: /^[a-zA-Z0-9_-]+$/,
  /** License plate regex pattern (flexible for various formats) */
  LICENSE_PLATE_PATTERN: /^[A-Z0-9\s-]{2,10}$/i,
  /** VIN regex pattern (17 alphanumeric characters) */
  VIN_PATTERN: /^[A-HJ-NPR-Z0-9]{17}$/i,
} as const;

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API = {
  /** NHTSA VIN decoder API */
  NHTSA_VIN_DECODER: 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin',
  /** NHTSA make/model API */
  NHTSA_MAKES: 'https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType',
  /** Timeout for API requests (ms) */
  REQUEST_TIMEOUT_MS: 10000,
  /** Maximum retry attempts */
  MAX_RETRIES: 3,
  /** Retry delay (ms) */
  RETRY_DELAY_MS: 1000,
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURES = {
  /** Enable real-time notifications */
  REALTIME_NOTIFICATIONS: true,
  /** Enable push notifications */
  PUSH_NOTIFICATIONS: true,
  /** Enable service worker */
  SERVICE_WORKER: true,
  /** Enable analytics */
  ANALYTICS: true,
  /** Enable Sentry error tracking */
  ERROR_TRACKING: true,
  /** Enable PWA install prompt */
  PWA_INSTALL_PROMPT: true,
  /** Enable crime map integration */
  CRIME_MAP: false,
  /** Enable premium features */
  PREMIUM_FEATURES: false,
  /** Enable messaging (under development) */
  MESSAGING: false,
} as const;
