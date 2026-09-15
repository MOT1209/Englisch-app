import { AppError } from '../../utils/errors';
import type { AiProvider, AiProviderId, AiTextRequest } from '../types';

export interface OpenAiCompatibleOptions {
  id: AiProviderId;
  label: string;
  /** Gateway root without the trailing slash, e.g. `https://api.groq.com/openai/v1`. */
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Extra headers a gateway may require; bearer auth is always sent. */
  headers?: Record<string, string>;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

/**
 * Builds a provider for any gateway that speaks OpenAI's
 * `POST /chat/completions` shape. Groq and OpenCode Zen both do, so the only
 * per-provider difference that remains is the base URL, key and model id.
 */
export function createOpenAiCompatibleProvider(options: OpenAiCompatibleOptions): AiProvider {
  const baseUrl = options.baseUrl.trim().replace(/\/+$/, '');
  const model = options.model.trim();

  return {
    id: options.id,
    label: options.label,
    model,

    isConfigured: () => options.apiKey.trim().length > 0,

    async generate({ systemPrompt, messages, temperature, signal }: AiTextRequest): Promise<string> {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${options.apiKey.trim()}`,
          ...options.headers,
        },
        body: JSON.stringify({
          model,
          temperature: temperature ?? 0.7,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.text })),
          ],
        }),
        signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        const status = response.status === 429 ? 429 : 502;
        throw new AppError(`${options.label} API error (${response.status}): ${body.slice(0, 200)}`, status);
      }

      const json = (await response.json()) as ChatCompletionResponse;
      const text = json.choices?.[0]?.message?.content ?? '';
      return text.trim();
    },
  };
}
