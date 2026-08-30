import Redis from "ioredis";
import { env } from "../config/env";

const redis = new Redis(env.redisUrl);

const RATE_LIMIT_KEY = "rate-limit:url-checks";
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 1000;

export async function getAvailableSlot(): Promise<number> {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(RATE_LIMIT_KEY, "0", windowStart.toString());
  pipeline.zcard(RATE_LIMIT_KEY);
  pipeline.pexpire(RATE_LIMIT_KEY, RATE_LIMIT_WINDOW_MS);

  const results = await pipeline.exec();
  if (!results) return 100;

  const count = results[1][1] as number;

  if (count < RATE_LIMIT_MAX) {
    const uniqueId = `${now}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
    await redis.zadd(RATE_LIMIT_KEY, now.toString(), uniqueId);
    return 0;
  }

  const oldest = await redis.zrange(RATE_LIMIT_KEY, "0", "0", "WITHSCORES");
  if (oldest.length < 2) return 100;

  const oldestTime = parseInt(oldest[1]);
  const baseDelay = Math.max(0, oldestTime + RATE_LIMIT_WINDOW_MS - now + 10);
  const jitter = Math.floor(Math.random() * 50);
  return baseDelay + jitter;
}
