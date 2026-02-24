import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from '../../src/utils/jwt';

const testPayload = {
  userId: 'user123',
  email: 'test@example.com',
  username: 'testuser',
};

describe('JWT utilities', () => {
  describe('signAccessToken', () => {
    it('should create a valid access token', () => {
      const token = signAccessToken(testPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = signAccessToken(testPayload);
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.username).toBe(testPayload.username);
    });

    it('should throw for invalid token', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow();
    });
  });

  describe('signRefreshToken', () => {
    it('should create a valid refresh token', () => {
      const token = signRefreshToken(testPayload);
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = signRefreshToken(testPayload);
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(testPayload.userId);
    });

    it('should throw for invalid refresh token', () => {
      expect(() => verifyRefreshToken('invalid.token.here')).toThrow();
    });
  });
});
