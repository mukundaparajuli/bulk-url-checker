import Redis from "ioredis";
import { env } from "../config/env";

const redis = new Redis(env.redisUrl);

const RATE_LIMIT_KEY = "rate-limit:url-checks";
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 1000;

export async function acquireRateLimit(): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(RATE_LIMIT_KEY, "0", windowStart.toString());
  pipeline.zadd(RATE_LIMIT_KEY, now, `${now}-${Math.random()}`);
  pipeline.zcard(RATE_LIMIT_KEY);
  pipeline.pexpire(RATE_LIMIT_KEY, RATE_LIMIT_WINDOW_MS);

  const results = await pipeline.exec();
  if (!results) return false;

  const count = results[2][1] as number;
  if (count > RATE_LIMIT_MAX) {
    await redis.zrem(RATE_LIMIT_KEY, `${now}-${Math.random()}`);
    return false;
  }

  return true;
}

export async function getDelayMs(): Promise<number> {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const count = await redis.zcount(RATE_LIMIT_KEY, windowStart.toString(), now.toString());
  if (count < RATE_LIMIT_MAX) return 0;

  const oldest = await redis.zrange(RATE_LIMIT_KEY, "0", "0", "WITHSCORES");
  if (oldest.length < 2) return 0;

  const oldestTime = parseInt(oldest[1]);
  return Math.max(0, oldestTime + RATE_LIMIT_WINDOW_MS - now + 10);
}
