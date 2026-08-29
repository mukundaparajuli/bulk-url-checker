import { Job } from "bullmq";
import { db } from "@repo/db";
import { checkUrl, HttpError } from "../services/url-checker.service";
import {
  markProcessing,
  markSuccess,
  markFailed,
  markCancelled,
  isBatchCancelled,
  updateBatchProgress,
} from "../services/batch-state.service";
import { publishBatchEvent } from "../services/event.service";

function isRetryableError(error: unknown): boolean {
  if (error instanceof HttpError) {
    return error.statusCode >= 500;
  }
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return true;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("econnrefused")) return true;
    if (msg.includes("econnreset")) return true;
    if (msg.includes("enotfound")) return true;
    if (msg.includes("socket hang up")) return true;
    if (msg.includes("network")) return true;
  }
  return false;
}

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
    if (isRetryableError(error)) {
      throw error;
    }

    const isFinalAttempt =
      job.attemptsMade >= (job.opts.attempts ?? 3);

    if (!isFinalAttempt) {
      throw error;
    }

    await markFailed(batchUrlId, String(error));
    await updateBatchProgress(batchId);
    await publishBatchEvent(batchId);
  }
}
