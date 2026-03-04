import { describe, it, expect } from 'vitest';
import { calculateReputationScore } from '../reputation';

describe('reputation', () => {
  describe('calculateReputationScore', () => {
    it('should calculate score for typical user', () => {
      const score = calculateReputationScore({
        reviewCount: 10,
        postCount: 5,
        badgeCount: 3,
        followersCount: 20,
        accountAgeMonths: 6,
      });

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle zero values', () => {
      const score = calculateReputationScore({
        reviewCount: 0,
        postCount: 0,
        badgeCount: 0,
        followersCount: 0,
        accountAgeMonths: 0,
      });

      expect(score).toBe(0);
    });

    it('should cap at 100', () => {
      const score = calculateReputationScore({
        reviewCount: 1000,
        postCount: 1000,
        badgeCount: 100,
        followersCount: 10000,
        accountAgeMonths: 120,
      });

      expect(score).toBeLessThanOrEqual(100);
    });

    it('should increase with more activity', () => {
      const lowScore = calculateReputationScore({
        reviewCount: 1,
        postCount: 1,
        badgeCount: 0,
        followersCount: 0,
        accountAgeMonths: 1,
      });

      const highScore = calculateReputationScore({
        reviewCount: 50,
        postCount: 30,
        badgeCount: 10,
        followersCount: 100,
        accountAgeMonths: 12,
      });

      expect(highScore).toBeGreaterThan(lowScore);
    });
  });
});
