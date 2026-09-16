/**
 * Test environment bootstrap. Runs before any test imports `src`, so the
 * `env` schema sees every variable it needs. Values are fake: nothing here ever
 * talks to a real database, provider, or Firebase project.
 */
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/linguaverse_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-that-is-long-enough';
process.env.APP_TOKEN = process.env.APP_TOKEN ?? 'test-app-token-1234';

// Small AI cap so quota tests can trigger 429 with a few calls.
process.env.AI_DAILY_REQUEST_CAP = process.env.AI_DAILY_REQUEST_CAP ?? '3';

// Keys present so the provider chain is "configured" for gateway tests. The
// gateway tests stub out `fetch`, so no real network traffic happens.
process.env.AI_PROVIDER_ORDER = process.env.AI_PROVIDER_ORDER ?? 'gemini,groq,zen';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? 'test-gemini-key';
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY ?? 'test-groq-key';
process.env.OPENCODE_ZEN_API_KEY = process.env.OPENCODE_ZEN_API_KEY ?? 'test-zen-key';

// Keep request logs off the test output unless explicitly wanted.
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'error';