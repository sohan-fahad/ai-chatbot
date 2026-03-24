export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

function utcDateKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function secondsUntilNextUtcDay(date = new Date()): number {
  const next = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(1, Math.ceil((next - date.getTime()) / 1000));
}

export async function consumeDailyLimit(
  kv: KVNamespace,
  scope: string,
  subject: string,
  limit: number,
): Promise<RateLimitResult> {
  const dayKey = utcDateKey();
  const key = `rl:${scope}:${subject}:${dayKey}`;
  const retryAfterSeconds = secondsUntilNextUtcDay();

  const existingRaw = await kv.get(key);
  const current = existingRaw ? Number(existingRaw) : 0;
  if (Number.isFinite(current) && current >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  const next = (Number.isFinite(current) ? current : 0) + 1;
  await kv.put(key, String(next), { expirationTtl: retryAfterSeconds });

  return {
    allowed: true,
    remaining: Math.max(0, limit - next),
    retryAfterSeconds,
  };
}
