import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildMockPrisma } from '../helpers/fakePrisma';
import { buildSeed } from '../helpers/seed';

const mockDb = { prisma: buildMockPrisma(buildSeed()) };
vi.mock('@/config/database', () => ({ prisma: mockDb.prisma }));

let app: import('express').Express;

beforeAll(async () => {
  app = (await import('@/app')).default;
});

afterEach(() => {
  mockDb.prisma.reset();
});

describe('GET /health', () => {
  it('reports ok when the database answers', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('linguaverse-api');
    expect(res.body.environment).toBe('test');
    expect(res.body.checks.database.status).toBe('up');
    expect(typeof res.body.uptimeSeconds).toBe('number');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('reports degraded (503) when the database is down', async () => {
    mockDb.prisma.$queryRaw = async () => {
      throw new Error('connection refused');
    };

    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.database.status).toBe('down');
  });

  it('reports the active AI gate mode and provider order without secrets', async () => {
    const res = await request(app).get('/health');
    expect(res.body.ai.mode).toBe('token');
    expect(res.body.ai.order).toEqual(['gemini', 'groq', 'zen']);
    expect(JSON.stringify(res.body)).not.toMatch(/api[_-]?key|secret|_secret_/i);
    expect(JSON.stringify(res.body)).not.toContain('test-app-token-1234');
    expect(JSON.stringify(res.body)).not.toMatch(/test-(gemini|groq|zen)-/i);
  });

  it('echoes a caller-supplied request id', async () => {
    const res = await request(app).get('/health').set('X-Request-Id', 'req-abc-123');
    expect(res.headers['x-request-id']).toBe('req-abc-123');
  });

  it('creates a request id when none is supplied', async () => {
    const res = await request(app).get('/health');
    expect(typeof res.headers['x-request-id']).toBe('string');
    expect((res.headers['x-request-id'] as string).length).toBeGreaterThan(0);
  });
});