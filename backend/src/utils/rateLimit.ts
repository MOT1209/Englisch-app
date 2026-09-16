import { prisma } from '../config/database';
import { env } from '../config/env';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Per-caller daily budget for AI calls, stored in Postgres.
 *
 * The old version kept a `Map` in process memory: a redeploy silently reset
 * every caller's budget to zero, and with more than one instance each process
 * enforced its own separate ceiling. Persisting the counters in the `ai_usage`
 * table makes the cap real across restarts and instances, and the unique
 * `(callerId, day)` key makes the upsert an atomic increment.
 */
export async function consumeAiQuota(deviceId: string | null, ip: string): Promise<boolean> {
  const callerId = (deviceId?.trim() || ip || 'unknown').slice(0, 200);
  const day = todayKey();

  const record = await prisma.aiUsage.upsert({
    where: { callerId_day: { callerId, day } },
    update: { count: { increment: 1 } },
    create: { callerId, day, count: 1 },
  });

  return record.count <= env.AI_DAILY_REQUEST_CAP;
}