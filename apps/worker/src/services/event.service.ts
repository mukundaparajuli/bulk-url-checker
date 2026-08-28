import { Redis } from "ioredis";
import { env } from "../config/env";

const redis = new Redis(env.redisUrl);

export async function publishBatchEvent(batchId: string) {
  await redis.publish("batch-events", JSON.stringify({ type: "batch.updated", batchId }));
}
