import { Request, Response } from 'express';
import { env } from '../config/env';
import { consumeAiQuota } from '../utils/rateLimit';
import { AppError } from '../utils/errors';

interface GeminiPart {
  text?: string;
}
interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}
interface GeminiPayload {
  contents: GeminiContent[];
  systemInstruction?: GeminiContent;
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Calls Gemini.generateContent and returns the concatenated text of the first
 * candidate. The billing-attached key lives only here, read from server env.
 */
async function callGemini(payload: GeminiPayload): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new AppError('AI service is not configured on the server', 503);
  }

  const url = `${GEMINI_BASE}/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.status === 429) {
    throw new AppError('AI service rate limit exceeded (provider)', 429);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new AppError(`Gemini API error (${response.status}): ${body.slice(0, 200)}`, 502);
  }

  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  return text.trim();
}

function clientIdentity(req: Request): string | null {
  const deviceId = req.headers['x-device-id'];
  return typeof deviceId === 'string' && deviceId.length > 0 ? deviceId : null;
}

const CHAT_SYSTEM_PROMPT = (targetLanguage: string, cefrLevel: string): string =>
  `
You are LinguaVerse AI Teacher, a warm, supportive language tutor teaching ${targetLanguage} to a learner at level ${cefrLevel}.
Rules:
1. Respond in ${targetLanguage} appropriate for a ${cefrLevel} level learner, with English translation in parentheses if helpful.
2. If the user's input has grammar or spelling mistakes, point out a gentle correction.
3. Provide a better, more native sentence suggestion.
4. Keep responses conversational and encouraging.
5. Format your output strictly using this structure:
REPLY: <your tutor response>
CORRECTION: <gentle correction or NONE>
SUGGESTION: <better sentence suggestion or NONE>
EXPLANATION: <brief grammar note or NONE>
`.trim();

export async function chat(req: Request, res: Response): Promise<void> {
  if (!consumeAiQuota(clientIdentity(req), req.ip ?? '')) {
    throw new AppError('Daily AI request limit reached', 429);
  }

  const { messages, targetLanguage, cefrLevel } = req.body as {
    messages: Array<{ role: 'user' | 'tutor'; text: string }>;
    targetLanguage: string;
    cefrLevel: string;
  };

  const payload: GeminiPayload = {
    contents: messages.map((m) => ({
      role: m.role === 'tutor' ? 'model' : 'user',
      parts: [{ text: m.text }],
    })),
    systemInstruction: { parts: [{ text: CHAT_SYSTEM_PROMPT(targetLanguage, cefrLevel) }] },
  };

  const raw = await callGemini(payload);
  if (!raw) throw new AppError('AI returned an empty response', 502);

  let replyText = ''; // Default empty string, not null
  let correction: string | null = null;
  let suggestion: string | null = null;
  let grammarExplanation: string | null = null;

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    // Case-insensitive match for "reply:" prefix, allow extra whitespace
    if (/^reply:/i.test(trimmed)) {
      replyText = trimmed.replace(/^reply:\s*/i, '').trim();
    } else if (/^correction:/i.test(trimmed)) {
      const v = trimmed.replace(/^correction:\s*/i, '').trim();
      if (v.toUpperCase() !== 'NONE' && v.length > 0) correction = v;
    } else if (/^suggestion:/i.test(trimmed)) {
      const v = trimmed.replace(/^suggestion:\s*/i, '').trim();
      if (v.toUpperCase() !== 'NONE' && v.length > 0) suggestion = v;
    } else if (/^explanation:/i.test(trimmed)) {
      const v = trimmed.replace(/^explanation:\s*/i, '').trim();
      if (v.toUpperCase() !== 'NONE' && v.length > 0) grammarExplanation = v;
    }
  }
  // Ensure replyText is never empty - use raw as fallback
  if (!replyText.trim()) replyText = raw.trim();

  res.json({
    success: true,
    data: { replyText, correction, suggestion, grammarExplanation },
  });
}

const WRITE_SYSTEM_PROMPT = (targetLanguage: string, prompt: string): string =>
  `
Evaluate the following writing submission in ${targetLanguage} for the prompt: '${prompt}'.
Provide feedback strictly formatted as:
SCORE: <number 0-100>
CORRECTED: <corrected version of user text>
FEEDBACK: <detailed feedback on grammar, vocabulary, and style>
SUGGESTIONS: <suggestion 1> | <suggestion 2>
`.trim();

export async function write(req: Request, res: Response): Promise<void> {
  if (!consumeAiQuota(clientIdentity(req), req.ip ?? '')) {
    throw new AppError('Daily AI request limit reached', 429);
  }

  const { userText, prompt, targetLanguage } = req.body as {
    userText: string;
    prompt: string;
    targetLanguage: string;
  };

  const payload: GeminiPayload = {
    contents: [{ parts: [{ text: userText }] }],
    systemInstruction: { parts: [{ text: WRITE_SYSTEM_PROMPT(targetLanguage, prompt) }] },
  };

  const raw = await callGemini(payload);
  if (!raw) throw new AppError('AI returned an empty response', 502);

  let score = 85;
  let corrected = userText;
  let feedback = 'Good overall composition!';
  const suggestions: string[] = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (/^score:/i.test(trimmed)) {
      const parsed = trimmed.replace(/^score:\s*/i, '').match(/\d+/)?.[0];
      if (parsed !== undefined) score = Math.min(100, Math.max(0, Number(parsed)));
    } else if (/^corrected:/i.test(trimmed)) {
      corrected = trimmed.replace(/^corrected:\s*/i, '').trim() || corrected;
    } else if (/^feedback:/i.test(trimmed)) {
      feedback = trimmed.replace(/^feedback:\s*/i, '').trim() || feedback;
    } else if (/^suggestions:/i.test(trimmed)) {
      const items = trimmed
        .replace(/^suggestions:\s*/i, '')
        .split('|')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      suggestions.push(...items);
    }
  }

  res.json({
    success: true,
    data: {
      score,
      correctedText: corrected,
      feedback,
      suggestions: suggestions.length > 0 ? suggestions : ['Keep practicing daily'],
    },
  });
}