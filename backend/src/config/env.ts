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
  // Gemini ظ¤ server-side only, never shipped inside the app APK.
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  // Shared secret the Android app sends in `X-App-Token` to reach the AI proxy.
  APP_TOKEN: z.string().min(8).default('change-me-strong-app-token'),
  // Per-caller daily ceiling for AI calls (the free tier shrinks; abuse burns money).
  AI_DAILY_REQUEST_CAP: z.coerce.number().int().positive().default(300),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('ظإî Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
