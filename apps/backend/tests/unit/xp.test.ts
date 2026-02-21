import { getLevelFromXp, getXpForLevel, getProgressToNextLevel } from '../../src/utils/xp';

describe('XP utilities', () => {
  describe('getLevelFromXp', () => {
    it('should return level 1 for 0 XP', () => {
      expect(getLevelFromXp(0)).toBe(1);
    });

    it('should return level 2 for 100 XP', () => {
      expect(getLevelFromXp(100)).toBe(2);
    });

    it('should return level 3 for 400 XP', () => {
      expect(getLevelFromXp(400)).toBe(3);
    });

    it('should return level 11 for 10000 XP', () => {
      expect(getLevelFromXp(10000)).toBe(11);
    });
  });

  describe('getXpForLevel', () => {
    it('should return 0 for level 1', () => {
      expect(getXpForLevel(1)).toBe(0);
    });

    it('should return 100 for level 2', () => {
      expect(getXpForLevel(2)).toBe(100);
    });

    it('should return 400 for level 3', () => {
      expect(getXpForLevel(3)).toBe(400);
    });
  });

  describe('getProgressToNextLevel', () => {
    it('should return 0 progress for 0 XP', () => {
      expect(getProgressToNextLevel(0)).toBe(0);
    });

    it('should return 50 progress for halfway through level', () => {
      const progress = getProgressToNextLevel(50);
      expect(progress).toBe(50);
    });

    it('should return value between 0 and 100', () => {
      const progress = getProgressToNextLevel(250);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });
});
