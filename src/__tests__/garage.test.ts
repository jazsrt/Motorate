import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateProfileCompletionLevel,
  calculateProfileCompletion,
  PROFILE_COMPLETION_BADGES,
} from '../lib/profileCompletion';
import type { GarageProfile } from '../types/garage';

describe.skip('Profile Completion System', () => {
  let mockProfile: GarageProfile;

  beforeEach(() => {
    mockProfile = {
      id: 'user-123',
      handle: null,
      avatar_url: null,
      bio: null,
      location: null,
      profile_photo_url: null,
      is_private: false,
      reputation_score: 100,
      avg_driver_rating: 4.5,
      driver_rating_count: 10,
      created_at: new Date().toISOString(),
    };
  });

  describe('Profile Completion Levels', () => {
    it('should return "none" for empty profile', () => {
      const level = calculateProfileCompletionLevel(mockProfile);
      expect(level).toBe('none');
    });

    it('should return "starter" with handle only', () => {
      mockProfile.handle = 'coolcar';
      const level = calculateProfileCompletionLevel(mockProfile);
      expect(level).toBe('starter');
    });

    it('should return "complete" with handle and location', () => {
      mockProfile.handle = 'coolcar';
      mockProfile.location = 'Los Angeles, CA';
      const level = calculateProfileCompletionLevel(mockProfile);
      expect(level).toBe('complete');
    });

    it('should return "pro" with all fields', () => {
      mockProfile.handle = 'coolcar';
      mockProfile.location = 'Los Angeles, CA';
      mockProfile.bio = 'Car enthusiast';
      mockProfile.profile_photo_url = 'https://example.com/photo.jpg';
      const level = calculateProfileCompletionLevel(mockProfile);
      expect(level).toBe('pro');
    });

    it('should ignore whitespace-only fields', () => {
      mockProfile.handle = '   ';
      mockProfile.location = '   ';
      const level = calculateProfileCompletionLevel(mockProfile);
      expect(level).toBe('none');
    });
  });

  describe('Profile Completion Calculation', () => {
    it('should calculate 0% completion for empty profile', () => {
      const completion = calculateProfileCompletion(mockProfile);
      expect(completion.percentage).toBe(0);
      expect(completion.level).toBe('none');
    });

    it('should calculate 25% completion with handle', () => {
      mockProfile.handle = 'coolcar';
      const completion = calculateProfileCompletion(mockProfile);
      expect(completion.percentage).toBe(25);
    });

    it('should calculate 50% completion with handle and location', () => {
      mockProfile.handle = 'coolcar';
      mockProfile.location = 'Los Angeles, CA';
      const completion = calculateProfileCompletion(mockProfile);
      expect(completion.percentage).toBe(50);
    });

    it('should calculate 75% completion with handle, location, and bio', () => {
      mockProfile.handle = 'coolcar';
      mockProfile.location = 'Los Angeles, CA';
      mockProfile.bio = 'Car enthusiast';
      const completion = calculateProfileCompletion(mockProfile);
      expect(completion.percentage).toBe(75);
    });

    it('should calculate 100% completion with all fields', () => {
      mockProfile.handle = 'coolcar';
      mockProfile.location = 'Los Angeles, CA';
      mockProfile.bio = 'Car enthusiast';
      mockProfile.profile_photo_url = 'https://example.com/photo.jpg';
      const completion = calculateProfileCompletion(mockProfile);
      expect(completion.percentage).toBe(100);
      expect(completion.level).toBe('pro');
    });

    it('should list missing fields correctly', () => {
      mockProfile.handle = 'coolcar';
      const completion = calculateProfileCompletion(mockProfile);
      expect(completion.missingFields).toContain('location');
      expect(completion.missingFields).toContain('bio');
      expect(completion.missingFields).toContain('profile_photo_url');
      expect(completion.missingFields).not.toContain('handle');
    });

    it('should return correct next badge', () => {
      mockProfile.handle = 'coolcar';
      const completion = calculateProfileCompletion(mockProfile);
      expect(completion.nextBadge?.name).toBe('Complete Profile');
    });

    it('should not have next badge at pro level', () => {
      mockProfile.handle = 'coolcar';
      mockProfile.location = 'Los Angeles, CA';
      mockProfile.bio = 'Car enthusiast';
      mockProfile.profile_photo_url = 'https://example.com/photo.jpg';
      const completion = calculateProfileCompletion(mockProfile);
      expect(completion.nextBadge).toBeUndefined();
    });

    it('should unlock badges progressively', () => {
      mockProfile.handle = 'coolcar';
      const completion1 = calculateProfileCompletion(mockProfile);
      expect(completion1.badges).toHaveLength(1);
      expect(completion1.badges[0].name).toBe('Starter Profile');

      mockProfile.location = 'Los Angeles, CA';
      const completion2 = calculateProfileCompletion(mockProfile);
      expect(completion2.badges).toHaveLength(2);
      expect(completion2.badges.map(b => b.name)).toContain('Starter Profile');
      expect(completion2.badges.map(b => b.name)).toContain('Complete Profile');

      mockProfile.bio = 'Car enthusiast';
      mockProfile.profile_photo_url = 'https://example.com/photo.jpg';
      const completion3 = calculateProfileCompletion(mockProfile);
      expect(completion3.badges).toHaveLength(3);
    });
  });

  describe('Profile Completion Badges', () => {
    it('should have all badge definitions', () => {
      expect(PROFILE_COMPLETION_BADGES.starter).toBeDefined();
      expect(PROFILE_COMPLETION_BADGES.complete).toBeDefined();
      expect(PROFILE_COMPLETION_BADGES.pro).toBeDefined();
    });

    it('should have correct required fields', () => {
      expect(PROFILE_COMPLETION_BADGES.starter.requiredFields).toEqual(['handle']);
      expect(PROFILE_COMPLETION_BADGES.complete.requiredFields).toEqual(['handle', 'location']);
      expect(PROFILE_COMPLETION_BADGES.pro.requiredFields).toEqual([
        'handle',
        'location',
        'bio',
        'profile_photo_url',
      ]);
    });

    it('should have unique keys', () => {
      const keys = Object.values(PROFILE_COMPLETION_BADGES).map(b => b.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('should have proper metadata', () => {
      for (const badge of Object.values(PROFILE_COMPLETION_BADGES)) {
        expect(badge.name).toBeTruthy();
        expect(badge.description).toBeTruthy();
        expect(badge.icon_name).toBeTruthy();
        expect(Array.isArray(badge.requiredFields)).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle null profile', () => {
      const completion = calculateProfileCompletion(null);
      expect(completion.percentage).toBe(0);
      expect(completion.level).toBe('none');
      expect(completion.badges).toHaveLength(0);
    });

    it('should handle partial fields at pro level', () => {
      mockProfile.handle = 'coolcar';
      mockProfile.location = 'Los Angeles, CA';
      mockProfile.bio = 'Car enthusiast';
      // Missing profile_photo_url
      const completion = calculateProfileCompletion(mockProfile);
      expect(completion.level).toBe('complete');
      expect(completion.percentage).toBe(75);
    });

    it('should handle fields with only whitespace', () => {
      mockProfile.handle = '  \t\n  ';
      mockProfile.location = '  ';
      const completion = calculateProfileCompletion(mockProfile);
      expect(completion.percentage).toBe(0);
      expect(completion.missingFields).toContain('handle');
    });
  });
});

describe.skip('Garage UI Components', () => {
  describe('Profile Completion Badge Levels', () => {
    it('should correctly categorize completion levels', () => {
      const profiles = [
        { ...mockProfile, handle: null } as GarageProfile,
        { ...mockProfile, handle: 'user1' } as GarageProfile,
        { ...mockProfile, handle: 'user2', location: 'NYC' } as GarageProfile,
      ];

      const levels = profiles.map(p => calculateProfileCompletionLevel(p));
      expect(levels).toEqual(['none', 'starter', 'complete']);
    });
  });

  describe('Vehicle Privacy', () => {
    it('should toggle privacy correctly', () => {
      const initialState = { is_private: false };
      const newState = { ...initialState, is_private: !initialState.is_private };
      expect(newState.is_private).toBe(true);

      const toggled = { ...newState, is_private: !newState.is_private };
      expect(toggled.is_private).toBe(false);
    });
  });

  describe('Garage Stats Calculation', () => {
    it('should calculate stats correctly', () => {
      const vehicles = [
        { id: '1', is_claimed: true, verification_status: 'verified' as const },
        { id: '2', is_claimed: true, verification_status: 'standard' as const },
        { id: '3', is_claimed: false, verification_status: 'shadow' as const },
      ];

      const claimed = vehicles.filter(v => v.is_claimed).length;
      const verified = vehicles.filter(v => v.verification_status === 'verified').length;

      expect(claimed).toBe(2);
      expect(verified).toBe(1);
    });
  });
});

describe.skip('Profile Completion Integration', () => {
  it('should properly track progression through completion tiers', () => {
    let profile = { ...mockProfile };

    // Start: none
    expect(calculateProfileCompletionLevel(profile)).toBe('none');

    // Add handle: starter
    profile = { ...profile, handle: 'coolcar' };
    expect(calculateProfileCompletionLevel(profile)).toBe('starter');

    // Add location: complete
    profile = { ...profile, location: 'Los Angeles, CA' };
    expect(calculateProfileCompletionLevel(profile)).toBe('complete');

    // Add bio: still complete (need photo for pro)
    profile = { ...profile, bio: 'Car enthusiast' };
    expect(calculateProfileCompletionLevel(profile)).toBe('complete');

    // Add photo: pro
    profile = { ...profile, profile_photo_url: 'https://example.com/photo.jpg' };
    expect(calculateProfileCompletionLevel(profile)).toBe('pro');
  });

  it('should correctly identify unlocked and locked badges', () => {
    const profile: GarageProfile = {
      ...mockProfile,
      handle: 'coolcar',
      location: 'Los Angeles, CA',
    };

    const completion = calculateProfileCompletion(profile);

    expect(completion.badges.filter(b => b.earned)).toHaveLength(2);
    expect(completion.badges.map(b => b.name)).toContain('Starter Profile');
    expect(completion.badges.map(b => b.name)).toContain('Complete Profile');
  });
});

/**
 * Notes for future test expansion:
 *
 * TODO: Add integration tests for:
 * 1. Profile update triggering badge awards
 * 2. Vehicle privacy toggle persistence
 * 3. CSV export functionality
 * 4. Vehicle deletion with proper RLS checks
 * 5. Profile completion badge notifications
 * 6. Pagination/virtualization for large garages (100+ vehicles)
 * 7. Search and filter performance
 * 8. Mobile responsive layout
 * 9. Accessibility features (ARIA labels, keyboard navigation)
 * 10. Race conditions in concurrent updates
 *
 * Last Updated: 2026-01-29
 * Reference: docs/architecture/README.md
 */
