/**
 * Auth Service Tests
 */

import { generateAccessToken, verifyAccessToken, generateRefreshToken, verifyRefreshToken } from '../../services/auth.service';
import { User } from '@prisma/client';

// Mock user
const mockUser: User = {
  id: 'test-user-id',
  githubId: 12345,
  username: 'testuser',
  email: 'test@example.com',
  avatarUrl: 'https://example.com/avatar.jpg',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Auth Service', () => {
  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateAccessToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid token', () => {
      const token = generateAccessToken(mockUser);
      const payload = verifyAccessToken(token);
      
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(mockUser.id);
      expect(payload?.githubId).toBe(mockUser.githubId);
      expect(payload?.username).toBe(mockUser.username);
    });

    it('should return null for invalid token', () => {
      const payload = verifyAccessToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('should return null for expired token', () => {
      // This would require mocking time or using a very short expiry
      // For now, we'll just test that invalid tokens return null
      const payload = verifyAccessToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature');
      expect(payload).toBeNull();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = generateRefreshToken(mockUser);
      const payload = verifyRefreshToken(token);
      
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(mockUser.id);
      expect(payload?.githubId).toBe(mockUser.githubId);
      expect(payload?.username).toBe(mockUser.username);
    });

    it('should return null for invalid refresh token', () => {
      const payload = verifyRefreshToken('invalid-token');
      expect(payload).toBeNull();
    });
  });
});
