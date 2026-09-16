import { describe, expect, it } from 'vitest';
import { parseTutorReply, parseWritingFeedback } from '@/utils/aiParsing';

describe('parseTutorReply', () => {
  it('extracts all four structured fields', () => {
    const raw = [
      'REPLY: ¡Hola! ¿Cómo estás hoy?',
      'CORRECTION: Use "cómo" instead of "como".',
      'SUGGESTION: ¿Cómo estás hoy?',
      'EXPLANATION: "Cómo" needs an accent when asking.',
    ].join('\n');

    expect(parseTutorReply(raw)).toEqual({
      replyText: '¡Hola! ¿Cómo estás hoy?',
      correction: 'Use "cómo" instead of "como".',
      suggestion: '¿Cómo estás hoy?',
      grammarExplanation: '"Cómo" needs an accent when asking.',
    });
  });

  it('treats NONE (any case) as null', () => {
    const raw = ['REPLY: Ok!', 'CORRECTION: NONE', 'SUGGESTION: none', 'EXPLANATION: None'].join('\n');

    expect(parseTutorReply(raw)).toEqual({
      replyText: 'Ok!',
      correction: null,
      suggestion: null,
      grammarExplanation: null,
    });
  });

  it('is case-insensitive about the key prefix', () => {
    const raw = ['reply:hallo', 'correction: NONE', 'suggestion: sag "hallo"', 'explanation: none'].join('\n');

    expect(parseTutorReply(raw)).toEqual({
      replyText: 'hallo',
      correction: null,
      suggestion: 'sag "hallo"',
      grammarExplanation: null,
    });
  });

  it('falls back to raw text when the model skips REPLY', () => {
    const raw = 'Just a loose reply with no format at all.';

    expect(parseTutorReply(raw)).toEqual({
      replyText: 'Just a loose reply with no format at all.',
      correction: null,
      suggestion: null,
      grammarExplanation: null,
    });
  });
});

describe('parseWritingFeedback', () => {
  it('parses a full valid reply', () => {
    const raw = [
      'SCORE: 92',
      'CORRECTED: "Hola, muchacho."',
      'FEEDBACK: Great vocabulary!',
      'SUGGESTIONS: Use "guapa" in informal settings | Add a salutation',
    ].join('\n');

    expect(parseWritingFeedback(raw, 'anything')).toEqual({
      score: 92,
      correctedText: '"Hola, muchacho."',
      feedback: 'Great vocabulary!',
      suggestions: ['Use "guapa" in informal settings', 'Add a salutation'],
    });
  });

  it('clamps the score into 0..100', () => {
    expect(parseWritingFeedback('SCORE: 150', 'x').score).toBe(100);
    expect(parseWritingFeedback('SCORE: 42', 'x').score).toBe(42);
  });

  it('falls back to the submitted text when CORRECTED is missing', () => {
    const result = parseWritingFeedback('SCORE: 70\nFEEDBACK: Nice try', 'original text');
    expect(result.correctedText).toBe('original text');
  });

  it('provides a default suggestion when none given', () => {
    const result = parseWritingFeedback('SCORE: 80\nFEEDBACK: Good', 'abc');
    expect(result.suggestions).toEqual(['Keep practicing daily']);
  });

  it('drops empty suggestion segments', () => {
    const result = parseWritingFeedback('SUGGESTIONS: one || three', 'abc');
    expect(result.suggestions).toEqual(['one', 'three']);
  });
});