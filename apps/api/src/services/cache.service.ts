import Redis from "ioredis";
import { env } from "../config/env";

const redis = new Redis(env.redisUrl);

const BATCH_LIST_KEY = "cache:batches:list";
const BATCH_LIST_TTL = 30;

export async function getCachedBatches() {
  const cached = await redis.get(BATCH_LIST_KEY);
  if (cached) {
    return JSON.parse(cached);
  }
  return null;
}

export async function setCachedBatches(batches: unknown) {
  await redis.set(BATCH_LIST_KEY, JSON.stringify(batches), "EX", BATCH_LIST_TTL);
}

export async function invalidateBatchCache() {
  await redis.del(BATCH_LIST_KEY);
}
