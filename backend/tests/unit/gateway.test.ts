import { afterEach, describe, expect, it, vi } from 'vitest';

type Gateway = typeof import('@/ai/gateway');

interface StubResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

interface Route {
  match: (url: string) => boolean;
  status: number;
  body?: unknown;
}

function stubFetch(routes: Route[]) {
  const calls: string[] = [];
  const stub = vi.fn(async (input: string | { url: string }) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push(url);
    const route = routes.find((r) => r.match(url));
    if (!route) {
      return {
        ok: false,
        status: 500,
        json: async () => ({}),
        text: async () => 'no stub route',
      } as StubResponse;
    }
    return {
      ok: route.status >= 200 && route.status < 300,
      status: route.status,
      json: async () => route.body ?? {},
      text: async () => (route.body ? JSON.stringify(route.body) : ''),
    } as StubResponse;
  });
  return { stub, calls };
}

const geminiUrl = (u: string) => u.includes('generativelanguage.googleapis.com');
const groqUrl = (u: string) => u.includes('api.groq.com');
const zenUrl = (u: string) => u.includes('zen') || (u.includes('chat/completions') && !u.includes('groq'));

const request = {
  systemPrompt: 'You are a strict tutor.',
  messages: [{ role: 'user' as const, text: 'hola' }],
  temperature: 0.7,
};

function resetEnv(order: string, keys: { gemini?: string; groq?: string; zen?: string }): void {
  process.env.AI_PROVIDER_ORDER = order;
  process.env.GEMINI_API_KEY = keys.gemini ?? 'test-gemini-key';
  process.env.GROQ_API_KEY = keys.groq ?? 'test-groq-key';
  process.env.OPENCODE_ZEN_API_KEY = keys.zen ?? 'test-zen-key';
}

async function freshGateway(): Promise<Gateway> {
  vi.resetModules();
  return import('@/ai/gateway');
}

describe('ai gateway provider chain', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses AI_PROVIDER_ORDER and ignores unknown ids', async () => {
    resetEnv('groq,gemini,not-a-provider', {});
    const gateway = await freshGateway();
    const status = gateway.providerStatus();
    expect(status.order).toEqual(['groq', 'gemini']);
    expect(status.providers.map((p) => p.id)).toEqual(['groq', 'gemini']);
    expect(status.providers.every((p) => p.configured)).toBe(true);
  });

  it('reports a provider as unconfigured when its key is empty', async () => {
    resetEnv('gemini,groq', { gemini: '  ' });
    const gateway = await freshGateway();
    const gemini = gateway.providerStatus().providers.find((p) => p.id === 'gemini')!;
    expect(gemini.configured).toBe(false);
  });

  it('serves from the first provider when it answers', async () => {
    resetEnv('gemini,groq', {});
    const { stub } = stubFetch([
      {
        match: geminiUrl,
        status: 200,
        body: { candidates: [{ content: { parts: [{ text: 'Hello from Gemini' }] } }] },
      },
    ]);
    vi.stubGlobal('fetch', stub);

    const gateway = await freshGateway();
    const result = await gateway.generateText(request);
    expect(result.text).toBe('Hello from Gemini');
    expect(result.provider).toBe('gemini');
    expect(result.attempts).toEqual([]);
  });

  it('fails over to the next provider when the first errors', async () => {
    resetEnv('gemini,groq', {});
    const { stub } = stubFetch([
      { match: geminiUrl, status: 500 },
      {
        match: groqUrl,
        status: 200,
        body: { choices: [{ message: { content: 'Hello from Groq' } }] },
      },
    ]);
    vi.stubGlobal('fetch', stub);

    const gateway = await freshGateway();
    const result = await gateway.generateText(request);
    expect(result.provider).toBe('groq');
    expect(result.text).toBe('Hello from Groq');
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0].provider).toBe('gemini');
    expect(result.attempts[0].status).toBe(502);
  });

  it('throws 502 when every provider fails', async () => {
    resetEnv('gemini,groq', {});
    const { stub } = stubFetch([
      { match: (u) => geminiUrl(u) || groqUrl(u), status: 500 },
    ]);
    vi.stubGlobal('fetch', stub);

    const gateway = await freshGateway();
    await expect(gateway.generateText(request)).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  it('throws 429 when every provider is rate limited', async () => {
    resetEnv('gemini,groq', {});
    const { stub } = stubFetch([
      { match: (u) => geminiUrl(u) || groqUrl(u), status: 429 },
    ]);
    vi.stubGlobal('fetch', stub);

    const gateway = await freshGateway();
    const error = await gateway.generateText(request).catch((e: unknown) => e);
    expect(error).toMatchObject({ statusCode: 429 });
  });

  it('throws 503 when no provider is configured', async () => {
    resetEnv('gemini', { gemini: '  ', groq: ' ', zen: ' ' });
    const gateway = await freshGateway();
    const error = await gateway.generateText(request).catch((e: unknown) => e);
    expect(error).toMatchObject({ statusCode: 503 });
  });

  it('chains through gemini and zen only (zen uses the OpenAI shape)', async () => {
    resetEnv('zen,gemini', {});
    const { stub, calls } = stubFetch([
      {
        match: zenUrl,
        status: 200,
        body: { choices: [{ message: { content: 'Hello from Zen' } }] },
      },
    ]);
    vi.stubGlobal('fetch', stub);

    const gateway = await freshGateway();
    const result = await gateway.generateText(request);
    expect(result.provider).toBe('zen');
    expect(calls.some((u) => u.includes('/chat/completions'))).toBe(true);
  });

  void warn;
});