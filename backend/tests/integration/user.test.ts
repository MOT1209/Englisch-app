import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMockPrisma } from '../helpers/fakePrisma';
import { buildSeed } from '../helpers/seed';

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

let cachedToken: string | null = null;

async function loginToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const res = await request(app).post('/api/auth/login').send({
    username: 'alice',
    password: 'secret123',
  });
  cachedToken = res.body.data.accessToken;
  return cachedToken;
}

describe('GET /api/users/me', () => {
  it('returns the profile without the password hash', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${await loginToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('alice');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });
});

describe('PUT /api/users/me', () => {
  it('updates the username', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${await loginToken()}`)
      .send({ username: 'alice2' });

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('alice2');
  });

  it('updates the daily XP goal', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${await loginToken()}`)
      .send({ dailyGoalXp: 70 });

    expect(res.status).toBe(200);
    expect(res.body.data.dailyGoalXp).toBe(70);
  });

  it('rejects attempts to grant economic fields (xp) — 400', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${await loginToken()}`)
      .send({ xp: 9999 });

    expect(res.status).toBe(400);
  });

  it('rejects a bad email — 400', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${await loginToken()}`)
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
  });

  it('rejects an unknown native language with 404', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${await loginToken()}`)
      .send({ nativeLanguageCode: 'zz' });

    expect(res.status).toBe(404);
  });
});

describe('user languages', () => {
  it('lists my languages', async () => {
    const res = await request(app)
      .get('/api/users/me/languages')
      .set('Authorization', `Bearer ${await loginToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].languageId).toBe('lang-1');
  });

  it('adds a language', async () => {
    const res = await request(app)
      .post('/api/users/me/languages')
      .set('Authorization', `Bearer ${await loginToken()}`)
      .send({ languageCode: 'ar', targetLevel: 'B1' });

    expect(res.status).toBe(201);
    expect(res.body.data.languageId).toBe('lang-2');
    expect(res.body.data.targetLevel).toBe('B1');
  });

  it('rejects an unknown language with 404', async () => {
    const res = await request(app)
      .post('/api/users/me/languages')
      .set('Authorization', `Bearer ${await loginToken()}`)
      .send({ languageCode: 'klingon' });

    expect(res.status).toBe(404);
  });
});

describe('lesson progress', () => {
  it('records progress once, then increments attempts', async () => {
    const token = await loginToken();

    const first = await request(app)
      .post('/api/users/me/progress/lessons/lesson-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ isCompleted: true, score: 90, xpEarned: 20 });

    expect(first.status).toBe(200);
    expect(first.body.data.attempts).toBe(1);
    expect(first.body.data.isCompleted).toBe(true);

    const second = await request(app)
      .post('/api/users/me/progress/lessons/lesson-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ score: 95 });

    expect(second.status).toBe(200);
    expect(second.body.data.attempts).toBe(2);
  });

  it('reports progress totals including the awarded XP', async () => {
    const token = await loginToken();

    await request(app)
      .post('/api/users/me/progress/lessons/lesson-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ isCompleted: true, score: 90, xpEarned: 20 });

    const res = await request(app)
      .get('/api/users/me/progress')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.lessonsCompleted).toBe(1);
    expect(res.body.data.totalLessons).toBe(2);
    expect(res.body.data.totalXp).toBe(120);
  });
});