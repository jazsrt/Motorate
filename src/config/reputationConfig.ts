/**
 * MotoRate Reputation Point Values
 * Updated 2026-03-11
 */
export const REPUTATION_ACTIONS = {
  // Vehicle Claiming
  CLAIM_VEHICLE: {
    points: 25,
    description: 'Claimed vehicle ownership',
    maxPerDay: 1
  },

  // Spotting / Reviews
  SPOT_QUICK_REVIEW: {
    points: 10,
    description: 'Submitted a quick spot',
    maxPerDay: -1
  },

  SPOT_FULL_REVIEW: {
    points: 15,
    description: 'Submitted a full detailed review',
    maxPerDay: -1
  },

  SPOT_UPGRADE_TO_FULL: {
    points: 5,
    description: 'Upgraded quick spot to full spot',
    maxPerDay: -1
  },

  // Bonus: First time a plate is entered into the system
  NEW_PLATE_BONUS: {
    points: 2,
    description: 'Entered a new plate not previously spotted',
    maxPerDay: -1
  },

  // Badges
  BADGE_EARNED: {
    points: 10,
    description: 'Earned badge or tier upgrade',
    maxPerDay: -1
  },

  // Content Creation
  POST_CREATED: {
    basePoints: 5,
    fallbackPoints: 2,
    dailyLimit: 10,
    description: 'Created a post'
  },

  COMMENT_LEFT: {
    points: 2,
    description: 'Left a comment',
    maxPerDay: -1
  },

  // Social Engagement
  LIKE_RECEIVED: {
    basePoints: 0,
    fallbackPoints: 0,
    threshold: 0,
    description: 'Received a like'
  },

  // Stickers (to vehicle owner)
  POSITIVE_STICKER_RECEIVED: {
    points: 1,
    description: 'Received positive sticker',
    maxPerDay: -1
  },

  NEGATIVE_STICKER_RECEIVED: {
    points: -1,
    description: 'Received negative sticker',
    maxPerDay: -1
  }
} as const;

export type ReputationAction = keyof typeof REPUTATION_ACTIONS;
