import { Queue } from "bullmq";
import { db } from "@repo/db";
import { env } from "../config/env";

export const urlQueue = new Queue("url-checks", {
  connection: {
    host: new URL(env.redisUrl).hostname,
    port: Number(new URL(env.redisUrl).port),
  },
});

export async function enqueueBatch(batchId: string) {
  const urls = await (db as any).batchUrl.findMany({
    where: { batchId },
    select: { id: true, url: true },
  });

  for (const item of urls) {
    await urlQueue.add(
      "check-url",
      {
        batchId,
        batchUrlId: item.id,
        url: item.url,
      },
      {
        jobId: `check-url:${item.id}`,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      }
    );
  }
}
