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

export async function processCheckUrl(job: Job) {
  const { batchId, batchUrlId, url } = job.data;

  const [item, batch] = await Promise.all([
    BatchUrl.where({ id: batchUrlId }).first(),
    Batch.where({ id: batchId }).select("status").first(),
  ]);

  if (!item || !batch) return;

  if (batch.status === "CANCELLED") {
    await markCancelled(batchUrlId);
    return;
  }

  if (["SUCCESS", "FAILED", "CANCELLED"].includes(item.status)) return;

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
