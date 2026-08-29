import { Worker } from "bullmq";
import { processCheckUrl } from "./processors/check-url.processor";
import { env } from "./config/env";
import { db } from "@repo/db";

db.connect();

const worker = new Worker(
  "url-checks",
  processCheckUrl,
  {
    connection: {
      host: new URL(env.redisUrl).hostname,
      port: Number(new URL(env.redisUrl).port),
    },
    concurrency: 5,
  }
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
