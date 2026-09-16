import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMockPrisma } from '../helpers/fakePrisma';
import { buildSeed } from '../helpers/seed';

// bcrypt hashing is slow on purpose; in tests a prefix scheme is enough.
vi.mock('bcryptjs', () => ({
  default: {
    hash: async (plain: string) => `hashed:${plain}`,
    compare: async (plain: string, hash: string) => hash === `hashed:${plain}`,
  },
}));

const mockDb = { prisma: buildMockPrisma(buildSeed()) };
vi.mock('@/config/database', () => ({ prisma: mockDb.prisma }));

let app: import('express').Express;

beforeAll(async () => {
  app = (await import('@/app')).default;
});

beforeEach(() => {
  mockDb.prisma.reset();
});

describe('POST /api/auth/register', () => {
  it('creates a user and returns tokens', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'bob',
      email: 'bob@example.com',
      password: 'secret123',
      nativeLanguageCode: 'es',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe('bob');
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
  });

  it('rejects a taken username with 409', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'alice',
      email: 'other@example.com',
      password: 'secret123',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects an invalid payload with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'x',
      password: '123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in a seeded user', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'alice',
      password: 'secret123',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe('alice');
    expect(typeof res.body.data.accessToken).toBe('string');
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'alice',
      password: 'wrong-password',
    });

    expect(res.status).toBe(401);
  });

  it('rejects an unknown user with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'ghost',
      password: 'whatever111',
    });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user with a valid token', async () => {
    const login = await request(app).post('/api/auth/login').send({
      username: 'alice',
      password: 'secret123',
    });
    const token = login.body.data.accessToken;

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('alice');
  });

  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues a new access token from a valid refresh token', async () => {
    const login = await request(app).post('/api/auth/login').send({
      username: 'alice',
      password: 'secret123',
    });

    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: login.body.data.refreshToken,
    });
    expect(res.status).toBe(200);
    expect(typeof res.body.data.accessToken).toBe('string');
  });

  it('rejects an invalid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: 'garbage-not-a-jwt',
    });
    expect(res.status).toBe(401);
  });
});