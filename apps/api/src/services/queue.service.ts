import { Queue } from "bullmq";
import { BatchUrl } from "@repo/db";
import { env } from "../config/env";

export const urlQueue = new Queue("url-checks", {
  connection: {
    host: new URL(env.redisUrl).hostname,
    port: Number(new URL(env.redisUrl).port),
  },
});

export async function enqueueBatch(batchId: string) {
  const urls = await BatchUrl.where({ batchId }).select("id", "url").all();

  for (const item of urls) {
    await urlQueue.add(
      "check-url",
      {
        batchId,
        batchUrlId: item.id,
        url: item.url,
      },
      {
        jobId: `check-url-${item.id}`,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      }
    );
  }
}
