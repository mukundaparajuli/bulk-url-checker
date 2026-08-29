import { Batch, BatchUrl } from "@repo/db";
import type { CheckResult } from "@repo/shared";

export async function markProcessing(batchUrlId: string) {
  await BatchUrl.where({ id: batchUrlId, status: "PENDING" }).updateAll({
    status: "PROCESSING",
  });
  await BatchUrl.where({ id: batchUrlId, status: "QUEUED" }).updateAll({
    status: "PROCESSING",
  });
}

export async function markSuccess(
  batchUrlId: string,
  result: CheckResult
) {
  const item = await BatchUrl.where({ id: batchUrlId }).first();
  if (!item) return;
  if (item.status === "SUCCESS" || item.status === "FAILED" || item.status === "CANCELLED") return;

  await BatchUrl.where({ id: batchUrlId }).update({
    status: "SUCCESS",
    httpStatus: result.status,
    responseTimeMs: result.responseTimeMs,
    pageTitle: result.pageTitle,
    error: null,
  });
}

export async function markFailed(batchUrlId: string, error: string) {
  const item = await BatchUrl.where({ id: batchUrlId }).first();
  if (!item) return;
  if (item.status === "SUCCESS" || item.status === "FAILED" || item.status === "CANCELLED") return;

  await BatchUrl.where({ id: batchUrlId }).update({
    status: "FAILED",
    error,
  });
}

export async function markCancelled(batchUrlId: string) {
  const item = await BatchUrl.where({ id: batchUrlId }).first();
  if (!item) return;
  if (item.status === "SUCCESS" || item.status === "FAILED" || item.status === "CANCELLED") return;

  await BatchUrl.where({ id: batchUrlId }).update({
    status: "CANCELLED",
  });
}

export async function isBatchCancelled(batchId: string) {
  const batch = await Batch.where({ id: batchId }).select("status").first();
  return batch?.status === "CANCELLED";
}

export async function updateBatchProgress(batchId: string) {
  const urls = await BatchUrl.where({ batchId }).select("status").all();

  const counts = {
    totalUrls: urls.length,
    completedUrls: 0,
    failedUrls: 0,
    cancelledUrls: 0,
  };

  for (const u of urls) {
    if (u.status === "SUCCESS") counts.completedUrls++;
    if (u.status === "FAILED") counts.failedUrls++;
    if (u.status === "CANCELLED") counts.cancelledUrls++;
  }

  const allDone =
    counts.completedUrls + counts.failedUrls + counts.cancelledUrls ===
    counts.totalUrls;

  const status: "RUNNING" | "COMPLETED" | "FAILED" = allDone
    ? counts.failedUrls > 0
      ? "FAILED"
      : "COMPLETED"
    : "RUNNING";

  await Batch.where({ id: batchId }).update({
    ...counts,
    status,
  });
}
