import { env } from '../config/env';

interface Usage {
  day: string;
  count: number;
}

/**
 * In-memory per-caller daily budget for AI calls.
 *
 * The free Gemini tier is small and the key lives server-side now, so a leaked
 * endpoint could still burn the project's quota. This map caps each caller
 * (device id when the app provides one, otherwise IP) at a configurable number
 * of requests per calendar day. Good enough for a single instance and for the
 * current anonymous app; when accounts arrive, key by userId instead.
 */
const usage = new Map<string, Usage>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns true when the caller still has daily budget left. */
export function consumeAiQuota(deviceId: string | null, ip: string): boolean {
  const key = deviceId?.trim() || ip;
  const today = todayKey();

  // Cheap GC so the map cannot grow without bound.
  if (usage.size > 10_000) {
    for (const [k, v] of usage) {
      if (v.day !== today) usage.delete(k);
    }
  }

  const current = usage.get(key);
  if (!current || current.day !== today) {
    usage.set(key, { day: today, count: 1 });
    return true;
  }
  if (current.count >= env.AI_DAILY_REQUEST_CAP) return false;
  current.count += 1;
  return true;
}