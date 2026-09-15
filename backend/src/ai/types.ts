/**
 * Provider-agnostic AI contract.
 *
 * The tutor endpoints used to call Gemini directly, which meant a Gemini outage
 * (or an exhausted free-tier quota) was a hard outage for the whole app. Each
 * provider now implements this one interface, and `ai/gateway.ts` walks an
 * ordered chain of them, falling over to the next one on the first failure.
 */

export type AiProviderId = 'gemini' | 'groq' | 'zen';

/** Provider-neutral roles. Gemini calls the assistant side `model`, others `assistant`. */
export type AiRole = 'user' | 'assistant';

export interface AiMessage {
  role: AiRole;
  text: string;
}

export interface AiTextRequest {
  systemPrompt: string;
  messages: AiMessage[];
  /** Sampling temperature; each provider falls back to its own default. */
  temperature?: number;
  /** Aborted by the gateway when a provider exceeds `AI_REQUEST_TIMEOUT_MS`. */
  signal?: AbortSignal;
}

export interface AiProvider {
  readonly id: AiProviderId;
  /** Human label used in logs and in the `/api/ai/providers` status payload. */
  readonly label: string;
  readonly model: string;
  /** False when the provider has no API key, in which case it is skipped. */
  isConfigured(): boolean;
  /** Resolves to the raw completion text, or throws. */
  generate(request: AiTextRequest): Promise<string>;
}

export interface AiAttempt {
  provider: AiProviderId;
  status: number;
  message: string;
}

export interface AiTextResult {
  text: string;
  provider: AiProviderId;
  model: string;
  /** Every provider tried before the successful one, in order. */
  attempts: AiAttempt[];
}
