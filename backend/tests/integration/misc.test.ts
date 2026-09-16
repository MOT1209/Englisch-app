import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { buildMockPrisma } from '../helpers/fakePrisma';
import { buildSeed } from '../helpers/seed';

const mockDb = { prisma: buildMockPrisma(buildSeed()) };
vi.mock('@/config/database', () => ({ prisma: mockDb.prisma }));

let app: import('express').Express;

beforeAll(async () => {
  app = (await import('@/app')).default;
});

describe('unknown routes', () => {
  it('404s under /api', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('404s at the root', async () => {
    const res = await request(app).get('/definitely-not-a-route');
    expect(res.status).toBe(404);
  });

  it('404s for a wrong method on a known path', async () => {
    const res = await request(app).delete('/api/languages');
    expect(res.status).toBe(404);
  });
});

describe('validation middleware', () => {
  it('returns a structured 400 for invalid payloads', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'a', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(typeof res.body.error).toBe('string');
  });
});