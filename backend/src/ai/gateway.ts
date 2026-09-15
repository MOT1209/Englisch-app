import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { geminiProvider } from './providers/gemini';
import { createOpenAiCompatibleProvider } from './providers/openAiCompatible';
import type { AiAttempt, AiProvider, AiProviderId, AiTextRequest, AiTextResult } from './types';

/** Every provider the server knows about, keyed by the id used in `AI_PROVIDER_ORDER`. */
const registry: Record<AiProviderId, AiProvider> = {
  gemini: geminiProvider,
  groq: createOpenAiCompatibleProvider({
    id: 'groq',
    label: 'Groq',
    baseUrl: env.GROQ_BASE_URL,
    apiKey: env.GROQ_API_KEY,
    model: env.GROQ_MODEL,
  }),
  zen: createOpenAiCompatibleProvider({
    id: 'zen',
    label: 'OpenCode Zen',
    baseUrl: env.OPENCODE_ZEN_BASE_URL,
    apiKey: env.OPENCODE_ZEN_API_KEY,
    model: env.OPENCODE_ZEN_MODEL,
  }),
};

/** Providers in the order declared by `AI_PROVIDER_ORDER`; unknown ids are ignored. */
export function providerChain(): AiProvider[] {
  const ids = env.AI_PROVIDER_ORDER.split(',')
    .map((id) => id.trim().toLowerCase())
    .filter((id) => id.length > 0);

  if (ids.length === 0) ids.push('gemini');

  const chain: AiProvider[] = [];
  for (const id of ids) {
    if (!Object.prototype.hasOwnProperty.call(registry, id)) {
      console.warn(`[ai] ignoring unknown provider id in AI_PROVIDER_ORDER: "${id}"`);
      continue;
    }
    chain.push(registry[id as AiProviderId]);
  }
  return chain;
}

export interface ProviderStatus {
  order: AiProviderId[];
  providers: Array<{ id: AiProviderId; label: string; model: string; configured: boolean }>;
}

/** Safe to expose to the app: reports configuration, never the keys themselves. */
export function providerStatus(): ProviderStatus {
  const chain = providerChain();
  return {
    order: chain.map((p) => p.id),
    providers: chain.map((p) => ({
      id: p.id,
      label: p.label,
      model: p.model,
      configured: p.isConfigured(),
    })),
  };
}

/**
 * Calls the first provider that answers, falling over to the next one on any
 * failure. Failures are logged per provider instead of thrown, so one bad key
 * or one exhausted free tier degrades quality rather than breaking the feature.
 */
export async function generateText(request: AiTextRequest): Promise<AiTextResult> {
  const chain = providerChain().filter((p) => p.isConfigured());

  if (chain.length === 0) {
    throw new AppError('AI service is not configured on the server', 503);
  }

  const attempts: AiAttempt[] = [];

  for (const provider of chain) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);

    try {
      const text = await provider.generate({ ...request, signal: controller.signal });
      if (text.length > 0) {
        if (attempts.length > 0) {
          console.warn(`[ai] served by "${provider.id}" after ${attempts.length} failed provider(s)`);
        }
        return { text, provider: provider.id, model: provider.model, attempts };
      }
      attempts.push({ provider: provider.id, status: 502, message: 'empty response' });
      console.warn(`[ai] "${provider.id}" returned an empty response`);
    } catch (error) {
      const status = error instanceof AppError ? error.statusCode : 502;
      const message = error instanceof Error ? error.message : String(error);
      attempts.push({ provider: provider.id, status, message });
      console.warn(`[ai] "${provider.id}" failed (${status}): ${message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  // Only report a rate limit when that is genuinely all that went wrong, so the
  // app can tell "come back later" apart from "something is broken".
  const allRateLimited = attempts.every((a) => a.status === 429);
  const summary = attempts.map((a) => `${a.provider}: ${a.message}`).join(' | ');
  throw new AppError(
    allRateLimited
      ? 'AI service rate limit exceeded on every provider'
      : `All AI providers failed (${summary.slice(0, 400)})`,
    allRateLimited ? 429 : 502
  );
}
