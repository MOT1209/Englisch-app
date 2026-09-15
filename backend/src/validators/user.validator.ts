import { z } from 'zod';

/**
 * Whitelist for profile updates. Economic fields (xp, coins, streakCount,
 * todayXp) are server-managed and deliberately absent: accepting raw `req.body`
 * allowed a caller to grant themselves unlimited XP.
 */
export const updateProfileSchema = z.object({
  body: z
    .object({
      username: z.string().min(3).max(100).optional(),
      email: z.union([z.string().email(), z.literal('')]).optional(),
      avatarUrl: z
        .union([z.string().url().max(500), z.literal('')])
        .optional(),
      nativeLanguageCode: z.string().max(10).optional(),
      dailyGoalXp: z.number().int().positive().max(10_000).optional(),
    })
    .strict(),
});