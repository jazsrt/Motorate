/**
 * CRITICAL: These are the EXACT point values - DO NOT CHANGE
 */
export const REPUTATION_ACTIONS = {
  // One-Time Events (no limits)
  CLAIM_VEHICLE: {
    points: 50,
    description: 'Claimed vehicle ownership',
    maxPerDay: 1
  },

  // Spotting / Reviews
  SPOT_QUICK_REVIEW: {
    points: 15,
    description: 'Submitted a quick spot',
    maxPerDay: -1
  },

  SPOT_FULL_REVIEW: {
    points: 35,
    description: 'Submitted a full detailed review',
    maxPerDay: -1
  },

  SPOT_UPGRADE_TO_FULL: {
    points: 20,
    description: 'Upgraded quick spot to full spot',
    maxPerDay: -1
  },

  BADGE_EARNED: {
    points: 25,
    description: 'Earned badge or tier upgrade',
    maxPerDay: -1 // unlimited
  },

  // Content Creation (Daily Limit Logic)
  POST_CREATED: {
    basePoints: 15,
    fallbackPoints: 5,
    dailyLimit: 10,
    description: 'Created a post'
  },

  COMMENT_LEFT: {
    points: 5,
    description: 'Left a comment',
    maxPerDay: -1
  },

  // Social Engagement (Diminishing Returns)
  LIKE_RECEIVED: {
    basePoints: 2,
    fallbackPoints: 1,
    threshold: 10, // After 10 likes, only 1pt per like
    description: 'Received a like'
  },

  // Stickers (to vehicle owner)
  POSITIVE_STICKER_RECEIVED: {
    points: 2,
    description: 'Received positive sticker',
    maxPerDay: -1
  },

  NEGATIVE_STICKER_RECEIVED: {
    points: -3,
    description: 'Received negative sticker',
    maxPerDay: -1
  }
} as const;

export type ReputationAction = keyof typeof REPUTATION_ACTIONS;
