import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // --- AI providers (server-side only, never shipped inside the app APK) ---
  // Comma-separated failover order. Known ids: gemini, groq, zen.
  // Providers with no API key are skipped automatically.
  AI_PROVIDER_ORDER: z.string().default('gemini,groq,zen'),
  // Hard ceiling per single provider call, so one hung provider cannot stall a request.
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(25_000),

  // Google Gemini (native generateContent surface).
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),

  // Groq (OpenAI-compatible chat/completions).
  GROQ_API_KEY: z.string().default(''),
  GROQ_MODEL: z.string().default('openai/gpt-oss-120b'),
  GROQ_BASE_URL: z.string().default('https://api.groq.com/openai/v1'),

  // OpenCode Zen gateway. Zen exposes several surfaces per model; the
  // OpenAI-compatible `/chat/completions` one is used here, so the default
  // model must be one Zen serves there (DeepSeek/GLM/Kimi/MiniMax families).
  OPENCODE_ZEN_API_KEY: z.string().default(''),
  OPENCODE_ZEN_MODEL: z.string().default('deepseek-v4-flash'),
  OPENCODE_ZEN_BASE_URL: z.string().default('https://opencode.ai/zen/v1'),

  // Firebase App Check. When set, the AI proxy requires a verified App Check
  // token in `X-Firebase-AppCheck` and stops accepting the shared APP_TOKEN.
  FIREBASE_APP_CHECK_PROJECT_NUMBER: z.string().trim().max(100).optional(),

  // Shared secret the Android app sends in `X-App-Token` to reach the AI proxy.
  // Only accepted while FIREBASE_APP_CHECK_PROJECT_NUMBER is NOT set.
  APP_TOKEN: z.string().min(8).default('change-me-strong-app-token'),
  // Per-caller daily ceiling for AI calls (the free tier shrinks; abuse burns money).
  AI_DAILY_REQUEST_CAP: z.coerce.number().int().positive().default(300),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
