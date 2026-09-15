import { z } from 'zod';

export const chatSchema = z.object({
  body: z
    .object({
      messages: z
        .array(
          z.object({
            role: z.enum(['user', 'tutor']),
            text: z.string().min(1).max(4000),
          })
        )
        .min(1)
        .max(20),
      targetLanguage: z.string().min(2).max(10),
      cefrLevel: z.string().max(4).default('A1'),
    })
    .strict(),
});

export const writeSchema = z.object({
  body: z
    .object({
      userText: z.string().min(1).max(4000),
      prompt: z.string().min(1).max(1000),
      targetLanguage: z.string().min(2).max(10),
    })
    .strict(),
});