import { describe, it, expect } from 'vitest';
import { fuzzLocation, calculateDistance } from '../locationPrivacy';

describe.skip('locationPrivacy', () => {
  describe('fuzzLocation', () => {
    const originalLat = 41.8781;
    const originalLng = -87.6298;
    const radiusMeters = 1000;

    it('should return coordinates within expected radius', () => {
      const fuzzed = fuzzLocation(originalLat, originalLng, radiusMeters);
      const distance = calculateDistance(
        originalLat,
        originalLng,
        fuzzed.lat,
        fuzzed.lng
      );
      expect(distance).toBeLessThanOrEqual(radiusMeters);
    });

    it('should produce different results on multiple calls', () => {
      const fuzzed1 = fuzzLocation(originalLat, originalLng, radiusMeters);
      const fuzzed2 = fuzzLocation(originalLat, originalLng, radiusMeters);
      expect(fuzzed1.lat).not.toBe(fuzzed2.lat);
      expect(fuzzed1.lng).not.toBe(fuzzed2.lng);
    });

    it('should handle edge cases (poles)', () => {
      const northPole = fuzzLocation(90, 0, radiusMeters);
      expect(northPole.lat).toBeLessThanOrEqual(90);
      expect(northPole.lat).toBeGreaterThanOrEqual(-90);

      const southPole = fuzzLocation(-90, 0, radiusMeters);
      expect(southPole.lat).toBeLessThanOrEqual(90);
      expect(southPole.lat).toBeGreaterThanOrEqual(-90);
    });

    it('should handle edge cases (date line)', () => {
      const fuzzed = fuzzLocation(0, 180, radiusMeters);
      expect(fuzzed.lng).toBeLessThanOrEqual(180);
      expect(fuzzed.lng).toBeGreaterThanOrEqual(-180);
    });
  });

  describe('calculateDistance', () => {
    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(41.8781, -87.6298, 41.8781, -87.6298);
      expect(distance).toBe(0);
    });

    it('should calculate known distances correctly', () => {
      const chicago = { lat: 41.8781, lng: -87.6298 };
      const milwaukee = { lat: 43.0389, lng: -87.9065 };
      const distance = calculateDistance(
        chicago.lat,
        chicago.lng,
        milwaukee.lat,
        milwaukee.lng
      );
      expect(distance).toBeGreaterThan(100000);
      expect(distance).toBeLessThan(150000);
    });
  });
});
