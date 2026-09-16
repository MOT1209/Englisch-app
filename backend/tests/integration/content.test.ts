import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMockPrisma } from '../helpers/fakePrisma';
import { buildSeed } from '../helpers/seed';

const mockDb = { prisma: buildMockPrisma(buildSeed()) };
vi.mock('@/config/database', () => ({ prisma: mockDb.prisma }));

let app: import('express').Express;

beforeAll(async () => {
  app = (await import('@/app')).default;
});

beforeEach(() => {
  mockDb.prisma.reset();
});

describe('GET /api/languages', () => {
  it('lists active languages', async () => {
    const res = await request(app).get('/api/languages');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.map((l: { code: string }) => l.code)).toEqual(expect.arrayContaining(['es', 'ar']));
  });
});

describe('GET /api/languages/:code', () => {
  it('returns a language by code', async () => {
    const res = await request(app).get('/api/languages/es');
    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe('es');
  });

  it('404s for an unknown code', async () => {
    const res = await request(app).get('/api/languages/zz');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/languages/:code/levels', () => {
  it('returns the CEFR levels available for a language', async () => {
    const res = await request(app).get('/api/languages/es/levels');
    expect(res.status).toBe(200);
    expect(res.body.data.map((l: { code: string }) => l.code)).toContain('A1');
  });
});

describe('remote content endpoints', () => {
  it('returns mapped remote languages (no internal columns)', async () => {
    const res = await request(app).get('/api/languages/remote/languages');
    expect(res.status).toBe(200);

    const spanish = res.body.data.find((l: { code: string }) => l.code === 'es');
    expect(spanish).toMatchObject({
      code: 'es',
      name: 'Spanish',
      native_name: 'Español',
      flag_emoji: '🇪🇸',
      is_default: false,
      total_lessons_count: 2,
      description: '',
    });
    expect(spanish).not.toHaveProperty('status');
    expect(spanish).not.toHaveProperty('id');
    expect(spanish).not.toHaveProperty('languageId');
  });

  it('returns only published remote lessons in the app contract', async () => {
    const res = await request(app).get('/api/languages/remote/lessons');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({
      id: 'lesson-1',
      language_code: 'es',
      level: 'A1',
      title: 'Hola',
      xp_reward: 20,
      is_locked: false,
      order_index: 1,
    });
  });

  it('returns only published exercises in the app contract', async () => {
    const res = await request(app).get('/api/languages/remote/exercises');
    expect(res.status).toBe(200);
    expect(res.body.data.map((e: { id: string }) => e.id)).toEqual(['ex-1']);
    expect(res.body.data[0]).toMatchObject({
      lesson_id: 'lesson-1',
      target_text: 'Hola',
      correct_answer: 'Hola',
      options_json: '[]',
      phonetic_text: 'o-la',
      image_res_name: '',
    });
  });

  it('returns all public vocabulary, flashcards, grammar rules and achievements', async () => {
    const vocab = await request(app).get('/api/languages/remote/vocabularies');
    expect(vocab.body.data).toHaveLength(2);
    expect(vocab.body.data.map((v: { word: string }) => v.word)).toEqual(['favorito', 'hola']);
    expect(vocab.body.data.every((v: { language_code: string }) => v.language_code === 'es')).toBe(
      true
    );

    const flashcards = await request(app).get('/api/languages/remote/flashcards');
    expect(flashcards.body.data).toHaveLength(1);
    expect(flashcards.body.data[0]).toMatchObject({ front_word: 'hola' });

    const rules = await request(app).get('/api/languages/remote/grammar-rules');
    expect(rules.body.data).toHaveLength(1);
    expect(rules.body.data[0]).toMatchObject({
      language_code: 'es',
      level: 'A1',
      full_rule_text: 'Spanish nouns have gender.',
    });

    const achievements = await request(app).get('/api/languages/remote/achievements');
    expect(achievements.body.data).toHaveLength(1);
    expect(achievements.body.data[0]).toMatchObject({
      icon_name: 'star',
      max_progress: 1,
      reward_xp: 10,
    });
  });

  it('filters lessons and vocabulary by language', async () => {
    const lessons = await request(app).get('/api/languages/remote/lessons/es');
    expect(lessons.body.data.map((l: { title: string }) => l.title)).toEqual(['Hola']);

    const vocab = await request(app).get('/api/languages/remote/vocabularies/es');
    expect(vocab.body.data).toHaveLength(2);

    const missing = await request(app).get('/api/languages/remote/lessons/zz');
    expect(missing.status).toBe(404);
  });
});

describe('units and lessons', () => {
  it('lists units for a language and level', async () => {
    const res = await request(app).get('/api/languages/es/levels/A1/units');
    expect(res.status).toBe(200);
    expect(res.body.data[0].title).toBe('Greetings');
  });

  it('404s when the level does not exist', async () => {
    const res = await request(app).get('/api/languages/es/levels/C2/units');
    expect(res.status).toBe(404);
  });

  it('lists published lessons of a unit', async () => {
    const res = await request(app).get('/api/units/unit-1/lessons');
    expect(res.status).toBe(200);
    expect(res.body.data.map((l: { id: string }) => l.id)).toEqual(['lesson-1']);
  });

  it('returns a single lesson', async () => {
    const res = await request(app).get('/api/lessons/lesson-1');
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Hola');
  });

  it('404s for an unknown lesson', async () => {
    const res = await request(app).get('/api/lessons/nope');
    expect(res.status).toBe(404);
  });

  it('lists published exercises of a lesson', async () => {
    const res = await request(app).get('/api/lessons/lesson-1/exercises');
    expect(res.status).toBe(200);
    expect(res.body.data.map((e: { id: string }) => e.id)).toEqual(['ex-1']);
  });
});

describe('vocabulary and flashcards by language', () => {
  it('lists vocabulary for a language, optionally filtered by category', async () => {
    const res = await request(app).get('/api/languages/es/vocabulary');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);

    const filtered = await request(app).get('/api/languages/es/vocabulary?category=Greetings');
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].word).toBe('hola');
  });

  it('404s for an unknown language', async () => {
    const res = await request(app).get('/api/languages/zz/vocabulary');
    expect(res.status).toBe(404);
  });

  it('lists non-mastered flashcards', async () => {
    const res = await request(app).get('/api/languages/es/flashcards');
    expect(res.status).toBe(200);
    expect(res.body.data.map((f: { id: string }) => f.id)).toEqual(['fc-1']);
  });
});