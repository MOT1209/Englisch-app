import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import type { AiProvider, AiTextRequest } from '../types';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiContent {
  role?: string;
  parts: Array<{ text?: string }>;
}

interface GeminiPayload {
  contents: GeminiContent[];
  systemInstruction?: GeminiContent;
  generationConfig?: { temperature?: number };
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

/**
 * Gemini's native generateContent surface. Gemini spells the assistant role
 * `model` and takes the system prompt out of band, so both are mapped here and
 * the rest of the codebase never sees the difference.
 */
export const geminiProvider: AiProvider = {
  id: 'gemini',
  label: 'Google Gemini',
  model: env.GEMINI_MODEL,

  isConfigured: () => env.GEMINI_API_KEY.trim().length > 0,

  async generate({ systemPrompt, messages, temperature, signal }: AiTextRequest): Promise<string> {
    const key = env.GEMINI_API_KEY.trim();
    const payload: GeminiPayload = {
      contents: messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }],
      })),
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };
    if (temperature !== undefined) {
      payload.generationConfig = { temperature };
    }

    const url = `${GEMINI_BASE}/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(key)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });

    if (response.status === 429) {
      throw new AppError('Gemini rate limit exceeded', 429);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new AppError(`Gemini API error (${response.status}): ${body.slice(0, 200)}`, 502);
    }

    const json = (await response.json()) as GeminiResponse;
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    return text.trim();
  },
};
