import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { generateAccessToken, generateRefreshToken, verifyToken } from '@/utils/jwt';

describe('jwt utils', () => {
  const payload = { userId: 'user-1', username: 'alice' };

  it('signs and verifies an access token', () => {
    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');
    expect(verifyToken(token)).toMatchObject(payload);
  });

  it('signs and verifies a refresh token', () => {
    const token = generateRefreshToken(payload);
    expect(verifyToken(token)).toMatchObject(payload);
  });

  it('rejects a tampered token', () => {
    const token = generateAccessToken(payload);
    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
    expect(() => verifyToken(tampered)).toThrow();
  });

  it('rejects a token signed with a different secret', () => {
    const token = jwt.sign(payload, 'some-other-secret-that-is-long-enough');
    expect(() => verifyToken(token)).toThrow();
  });

  it('rejects an expired token', () => {
    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '-1s' });
    expect(() => verifyToken(token)).toThrow();
  });
});