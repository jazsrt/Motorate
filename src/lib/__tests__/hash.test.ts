import { describe, it, expect } from 'vitest';
import { hashPlate, normalizePlate } from '../hash';

describe('hash', () => {
  describe('normalizePlate', () => {
    it('should convert to uppercase', () => {
      expect(normalizePlate('abc123')).toBe('ABC123');
    });

    it('should remove spaces', () => {
      expect(normalizePlate('ABC 123')).toBe('ABC123');
    });

    it('should remove hyphens', () => {
      expect(normalizePlate('ABC-123')).toBe('ABC123');
    });

    it('should handle mixed special characters', () => {
      expect(normalizePlate('abc-123 xyz')).toBe('ABC123XYZ');
    });
  });

  describe('hashPlate', () => {
    const pepper = 'test-pepper';

    it('should produce same hash for same input', async () => {
      const hash1 = await hashPlate('ABC123', pepper);
      const hash2 = await hashPlate('ABC123', pepper);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', async () => {
      const hash1 = await hashPlate('ABC123', pepper);
      const hash2 = await hashPlate('XYZ789', pepper);
      expect(hash1).not.toBe(hash2);
    });

    it('should normalize before hashing', async () => {
      const hash1 = await hashPlate('ABC123', pepper);
      const hash2 = await hashPlate('abc 123', pepper);
      const hash3 = await hashPlate('ABC-123', pepper);
      expect(hash1).toBe(hash2);
      expect(hash1).toBe(hash3);
    });

    it('should produce different hashes with different peppers', async () => {
      const hash1 = await hashPlate('ABC123', 'pepper1');
      const hash2 = await hashPlate('ABC123', 'pepper2');
      expect(hash1).not.toBe(hash2);
    });

    it('should throw if pepper is missing', async () => {
      await expect(hashPlate('ABC123', '')).rejects.toThrow();
    });
  });
});
