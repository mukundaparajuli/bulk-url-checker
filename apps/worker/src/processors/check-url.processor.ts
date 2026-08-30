import { Job } from "bullmq";
import { Batch, BatchUrl } from "@repo/db";
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
import { getAvailableSlot } from "../services/rate-limiter.service";

export async function processCheckUrl(job: Job) {
  const { batchId, batchUrlId, url } = job.data;

  const [item, batch] = await Promise.all([
    BatchUrl.where({ id: batchUrlId }).first(),
    Batch.where({ id: batchId }).select("status").first(),
  ]);

  if (!item || !batch) return;

  if (batch.status === "CANCELLED") {
    await markCancelled(batchUrlId);
    await updateBatchProgress(batchId);
    await publishBatchEvent(batchId);
    return;
  }

  if (["SUCCESS", "FAILED", "CANCELLED"].includes(item.status)) return;

  const delayMs = await getAvailableSlot();
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  await markProcessing(batchUrlId);

  try {
    const result = await checkUrl(url);

    if (await isBatchCancelled(batchId)) {
      await markCancelled(batchUrlId);
      await updateBatchProgress(batchId);
      await publishBatchEvent(batchId);
      return;
    }

    await markSuccess(batchUrlId, result);
    await updateBatchProgress(batchId);
    await publishBatchEvent(batchId);
  } catch (error) {
    const isFinalAttempt =
      job.attemptsMade >= (job.opts.attempts ?? 3) - 1;

    if (isFinalAttempt) {
      await markFailed(batchUrlId, String(error));
      await updateBatchProgress(batchId);
      await publishBatchEvent(batchId);
    } else {
      throw error;
    }
  }
}
