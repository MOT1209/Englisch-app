/**
 * Pure parsers for the tutor / writer line-delimited outputs.
 *
 * Kept outside the controllers so they can be unit-tested without a request,
 * a provider, or the network. The providers are prompted to emit specific
 * `<KEY>: <value>` lines; these parsers turn that into the structured shape the
 * app consumes, tolerating a model that drops a line or replies loose text.
 */

export interface TutorReply {
  replyText: string;
  correction: string | null;
  suggestion: string | null;
  grammarExplanation: string | null;
}

export function parseTutorReply(raw: string): TutorReply {
  let replyText = '';
  let correction: string | null = null;
  let suggestion: string | null = null;
  let grammarExplanation: string | null = null;

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (/^reply:/i.test(trimmed)) {
      replyText = trimmed.replace(/^reply:\s*/i, '').trim();
    } else if (/^correction:/i.test(trimmed)) {
      const value = trimmed.replace(/^correction:\s*/i, '').trim();
      if (value.toUpperCase() !== 'NONE' && value.length > 0) correction = value;
    } else if (/^suggestion:/i.test(trimmed)) {
      const value = trimmed.replace(/^suggestion:\s*/i, '').trim();
      if (value.toUpperCase() !== 'NONE' && value.length > 0) suggestion = value;
    } else if (/^explanation:/i.test(trimmed)) {
      const value = trimmed.replace(/^explanation:\s*/i, '').trim();
      if (value.toUpperCase() !== 'NONE' && value.length > 0) grammarExplanation = value;
    }
  }

  // A model that skipped the REPLY line entirely should not produce empty
  // tutor text; fall back to the raw output instead of a blank reply.
  if (!replyText.trim()) replyText = raw.trim();

  return { replyText, correction, suggestion, grammarExplanation };
}

export interface WritingFeedback {
  score: number;
  correctedText: string;
  feedback: string;
  suggestions: string[];
}

export function parseWritingFeedback(raw: string, fallbackText: string): WritingFeedback {
  let score = 85;
  let corrected = fallbackText;
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

  return {
    score,
    correctedText: corrected,
    feedback,
    suggestions: suggestions.length > 0 ? suggestions : ['Keep practicing daily'],
  };
}