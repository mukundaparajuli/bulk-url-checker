import { Redis } from "ioredis";
import type { BatchUpdatedEvent } from "@repo/shared";
import { env } from "../config/env";

const redis = new Redis(env.redisUrl);

export async function publishBatchEvent(batchId: string) {
  const event: BatchUpdatedEvent = { type: "batch.updated", batchId };
  await redis.publish("batch-events", JSON.stringify(event));
}

export async function publishCacheInvalidation() {
  await redis.publish("cache-invalidation", JSON.stringify({ type: "batches" }));
}
