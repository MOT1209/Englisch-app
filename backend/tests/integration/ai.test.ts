import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMockPrisma } from '../helpers/fakePrisma';
import { buildSeed } from '../helpers/seed';

const TUTOR_RAW = 'REPLY: ¡Hola! ¿Cómo estás?\nCORRECTION: NONE\nSUGGESTION: NONE\nEXPLANATION: NONE';
const WRITE_RAW = 'SCORE: 90\nCORRECTED: "Hola, amigo."\nFEEDBACK: Great start!\nSUGGESTIONS: Watch the accent | Add a greeting';

const mockAi = {
  generateText: vi.fn(async () => ({
    text: TUTOR_RAW,
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    attempts: [],
  })),
  providerStatus: () => ({
    order: ['gemini', 'groq', 'zen'],
    providers: [
      { id: 'gemini', label: 'Google Gemini', model: 'gemini-2.0-flash', configured: true },
      { id: 'groq', label: 'Groq', model: 'llama-3.1-70b', configured: true },
      { id: 'zen', label: 'OpenCode Zen', model: 'deepseek-v3', configured: true },
    ],
  }),
};
vi.mock('@/ai/gateway', () => mockAi);

const mockDb = { prisma: buildMockPrisma(buildSeed()) };
vi.mock('@/config/database', () => ({ prisma: mockDb.prisma }));

let app: import('express').Express;

const APP_TOKEN = 'test-app-token-1234';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

beforeAll(async () => {
  app = (await import('@/app')).default;
});

beforeEach(() => {
  mockDb.prisma.reset();
  mockAi.generateText.mockClear();
  mockAi.generateText.mockResolvedValue({
    text: TUTOR_RAW,
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    attempts: [],
  });
});

const chatBody = {
  messages: [{ role: 'user', text: 'hola, como estás' }],
  targetLanguage: 'es',
  cefrLevel: 'A1',
};

describe('app gate', () => {
  it('blocks /providers without an app token', async () => {
    const res = await request(app).get('/api/ai/providers');
    expect(res.status).toBe(401);
  });

  it('blocks /providers with a wrong token', async () => {
    const res = await request(app).get('/api/ai/providers').set('X-App-Token', 'wrong-token');
    expect(res.status).toBe(401);
  });

  it('admits /providers with the correct token', async () => {
    const res = await request(app).get('/api/ai/providers').set('X-App-Token', APP_TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.data.order).toEqual(['gemini', 'groq', 'zen']);
  });
});

describe('POST /api/ai/chat', () => {
  it('rejects a request without an app token', async () => {
    const res = await request(app).post('/api/ai/chat').send(chatBody);
    expect(res.status).toBe(401);
  });

  it('returns a structured tutor reply', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('X-App-Token', APP_TOKEN)
      .set('X-Device-Id', 'device-1')
      .send(chatBody);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      replyText: '¡Hola! ¿Cómo estás?',
      correction: null,
      suggestion: null,
      grammarExplanation: null,
    });
    expect(mockAi.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.7 })
    );
  });

  it('rejects an invalid body with 400', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('X-App-Token', APP_TOKEN)
      .set('X-Device-Id', 'device-1')
      .send({ messages: [], targetLanguage: 'es' });

    expect(res.status).toBe(400);
  });

  it('rejects a caller that burns through the daily quota with 429', async () => {
    mockDb.prisma.models['aiUsage'].push({
      id: 'quota-1',
      callerId: 'device-exhausted',
      day: todayKey(),
      count: 3,
    });

    const res = await request(app)
      .post('/api/ai/chat')
      .set('X-App-Token', APP_TOKEN)
      .set('X-Device-Id', 'device-exhausted')
      .send(chatBody);

    expect(res.status).toBe(429);
    expect(mockAi.generateText).not.toHaveBeenCalled();
  });

  it('allows a caller within the quota', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('X-App-Token', APP_TOKEN)
      .set('X-Device-Id', 'device-fresh')
      .send(chatBody);

    expect(res.status).toBe(200);
    expect(mockAi.generateText).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/ai/write', () => {
  it('returns structured writing feedback', async () => {
    mockAi.generateText.mockResolvedValueOnce({
      text: WRITE_RAW,
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      attempts: [],
    });

    const res = await request(app)
      .post('/api/ai/write')
      .set('X-App-Token', APP_TOKEN)
      .set('X-Device-Id', 'device-2')
      .send({ userText: 'hola amigo', prompt: 'Introduce yourself', targetLanguage: 'es' });

    expect(res.status).toBe(200);
    expect(res.body.data.score).toBe(90);
    expect(res.body.data.correctedText).toBe('"Hola, amigo."');
    expect(res.body.data.suggestions).toEqual(['Watch the accent', 'Add a greeting']);
    expect(mockAi.generateText).toHaveBeenCalledWith(expect.objectContaining({ temperature: 0.3 }));
  });
});