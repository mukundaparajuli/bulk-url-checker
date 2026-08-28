import { db } from "@repo/db";

export async function markProcessing(batchUrlId: string) {
  await (db as any).batchUrl.updateMany({
    where: {
      id: batchUrlId,
      status: { in: ["PENDING", "QUEUED"] },
    },
    data: { status: "PROCESSING", attempts: { increment: 1 } },
  });
}

export async function markSuccess(batchUrlId: string, result: {
  status: number;
  responseTimeMs: number;
  pageTitle: string | null;
  finalUrl: string;
}) {
  await (db as any).batchUrl.updateMany({
    where: {
      id: batchUrlId,
      status: { in: ["PENDING", "QUEUED", "PROCESSING"] },
    },
    data: {
      status: "SUCCESS",
      httpStatus: result.status,
      responseTimeMs: result.responseTimeMs,
      pageTitle: result.pageTitle,
      error: null,
    },
  });
}

export async function markFailed(batchUrlId: string, error: string) {
  await (db as any).batchUrl.updateMany({
    where: {
      id: batchUrlId,
      status: { in: ["PENDING", "QUEUED", "PROCESSING"] },
    },
    data: { status: "FAILED", error },
  });
}

export async function markCancelled(batchUrlId: string) {
  await (db as any).batchUrl.updateMany({
    where: {
      id: batchUrlId,
      status: { in: ["PENDING", "QUEUED", "PROCESSING"] },
    },
    data: { status: "CANCELLED" },
  });
}

export async function isBatchCancelled(batchId: string) {
  const batch = await (db as any).batch.findUnique({
    where: { id: batchId },
    select: { status: true },
  });
  return batch?.status === "CANCELLED";
}

export async function updateBatchProgress(batchId: string) {
  const groups = await (db as any).batchUrl.groupBy({
    by: ["status"],
    where: { batchId },
    _count: { _all: true },
  });

  const counts = {
    totalUrls: 0,
    completedUrls: 0,
    failedUrls: 0,
    cancelledUrls: 0,
  };

  for (const g of groups) {
    counts.totalUrls += g._count._all;
    if (g.status === "SUCCESS") counts.completedUrls += g._count._all;
    if (g.status === "FAILED") counts.failedUrls += g._count._all;
    if (g.status === "CANCELLED") counts.cancelledUrls += g._count._all;
  }

  let status: "RUNNING" | "COMPLETED" | "FAILED" = "RUNNING";
  if (counts.completedUrls + counts.failedUrls + counts.cancelledUrls === counts.totalUrls) {
    status = counts.failedUrls > 0 ? "FAILED" : "COMPLETED";
  }

  await (db as any).batch.update({
    where: { id: batchId },
    data: {
      ...counts,
      status,
    },
  });
}
