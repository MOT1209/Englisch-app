import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  prisma: {
    aiUsage: { upsert: vi.fn() },
  },
};
vi.mock('@/config/database', () => ({ prisma: mockDb.prisma }));

let consumeAiQuota: typeof import('@/utils/rateLimit')['consumeAiQuota'];
let env: typeof import('@/config/env')['env'];

beforeAll(async () => {
  ({ consumeAiQuota } = await import('@/utils/rateLimit'));
  ({ env } = await import('@/config/env'));
});

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

describe('consumeAiQuota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.prisma.aiUsage.upsert.mockResolvedValue({ count: 1 });
  });

  it('allows the call when the counter is within the daily cap', async () => {
    const allowed = await consumeAiQuota('device-1', '1.2.3.4');
    expect(allowed).toBe(true);
  });

  it('rejects the call when the counter exceeds the daily cap', async () => {
    mockDb.prisma.aiUsage.upsert.mockResolvedValue({ count: env.AI_DAILY_REQUEST_CAP + 1 });
    const allowed = await consumeAiQuota('device-1', '1.2.3.4');
    expect(allowed).toBe(false);
  });

  it('uses the device id as the caller', async () => {
    await consumeAiQuota('device-1', '1.2.3.4');
    expect(mockDb.prisma.aiUsage.upsert).toHaveBeenCalledWith({
      where: { callerId_day: { callerId: 'device-1', day: todayKey() } },
      update: { count: { increment: 1 } },
      create: { callerId: 'device-1', day: todayKey(), count: 1 },
    });
  });

  it('falls back to the ip when no device id is sent', async () => {
    await consumeAiQuota(null, '9.9.9.9');
    expect(mockDb.prisma.aiUsage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { callerId_day: expect.objectContaining({ callerId: '9.9.9.9' }) },
      })
    );
  });

  it('falls back to "unknown" when there is neither a device id nor an ip', async () => {
    await consumeAiQuota(null, '');
    expect(mockDb.prisma.aiUsage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { callerId_day: expect.objectContaining({ callerId: 'unknown' }) },
      })
    );
  });

  it('slices the caller id to the schema limit', async () => {
    const longId = 'x'.repeat(500);
    await consumeAiQuota(longId, '');
    expect(mockDb.prisma.aiUsage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { callerId_day: expect.objectContaining({ callerId: 'x'.repeat(200) }) },
      })
    );
  });
});