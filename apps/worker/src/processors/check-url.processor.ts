import { Job } from "bullmq";
import { db } from "@repo/db";
import { checkUrl } from "../services/url-checker.service";
import {
  markProcessing,
  markSuccess,
  markFailed,
  markCancelled,
  isBatchCancelled,
  updateBatchProgress,
} from "../services/batch-state.service";
import { publishBatchEvent } from "../services/event.service";

export async function processCheckUrl(job: Job) {
  const { batchId, batchUrlId, url } = job.data;

  const item = await (db as any).batchUrl.findUnique({
    where: { id: batchUrlId },
  });

  if (!item) return;

  if (["SUCCESS", "FAILED", "CANCELLED"].includes(item.status)) return;

  const batch = await (db as any).batch.findUnique({
    where: { id: batchId },
    select: { status: true },
  });

  if (batch?.status === "CANCELLED") {
    await markCancelled(batchUrlId);
    return;
  }

  await markProcessing(batchUrlId);

  try {
    const result = await checkUrl(url);

    if (await isBatchCancelled(batchId)) {
      await markCancelled(batchUrlId);
      return;
    }

    await markSuccess(batchUrlId, result);
    await updateBatchProgress(batchId);
    await publishBatchEvent(batchId);
  } catch (error) {
    if (job.attemptsMade < (job.opts.attempts || 3)) {
      throw error;
    }

    await markFailed(batchUrlId, String(error));
    await updateBatchProgress(batchId);
    await publishBatchEvent(batchId);
  }
}
