import { Batch, BatchUrl } from "@repo/db";
import type { Contract } from "@repo/db/src/prisma/contract";
import { enqueueBatch, urlQueue } from "./queue.service";
import { getCachedBatches, setCachedBatches, invalidateBatchCache } from "./cache.service";

type BatchModel = ReturnType<typeof Batch.where> extends infer Q ? Q : never;

export async function createBatch(urls: string[]) {
  const created = await (Batch as any).create({
    status: "PENDING",
    totalUrls: urls.length,
    completedUrls: 0,
    failedUrls: 0,
    cancelledUrls: 0,
  });

  await (BatchUrl as any).createAll(
    urls.map((url: string) => ({
      batchId: created.id,
      url,
      status: "PENDING",
    }))
  );

  await enqueueBatch(created.id);
  await invalidateBatchCache();

  return created;
}

export async function getBatches() {
  const cached = await getCachedBatches();
  if (cached) return cached;

  const batches = await (Batch as any).orderBy((m: any) => m.createdAt.desc()).all();

  await setCachedBatches(batches);

  return batches;
}

export async function getBatchById(id: string) {
  return await (Batch as any).where({ id }).include("urls").first();
}

export async function cancelBatch(id: string) {
  const batch = await (Batch as any).where({ id }).select("status").first();

  if (!batch) {
    throw new Error("Batch not found");
  }

  if (batch.status === "COMPLETED" || batch.status === "CANCELLED") {
    return batch;
  }

  await (Batch as any).where({ id }).update({ status: "CANCELLED" });

  const pendingUrls = await (BatchUrl as any).where({
    batchId: id,
  }).select("id", "status").all();

  const toCancel = pendingUrls.filter(
    (u: any) => u.status === "PENDING" || u.status === "QUEUED"
  );

  for (const url of toCancel) {
    await urlQueue.remove(`check-url-${url.id}`);
  }

  await (BatchUrl as any).where({ batchId: id, status: "PENDING" }).updateAll({ status: "CANCELLED" });
  await (BatchUrl as any).where({ batchId: id, status: "QUEUED" }).updateAll({ status: "CANCELLED" });

  await invalidateBatchCache();

  return batch;
}

export async function retryFailedUrls(id: string) {
  const batch = await (Batch as any).where({ id }).select("status").first();

  if (!batch) {
    throw new Error("Batch not found");
  }

  const failedUrls = await (BatchUrl as any).where({
    batchId: id,
    status: "FAILED",
  }).select("id", "url").all();

  if (failedUrls.length === 0) {
    return { retried: 0 };
  }

  await (BatchUrl as any).where({ batchId: id, status: "FAILED" }).updateAll({
    status: "QUEUED",
    error: null,
  });

  await (Batch as any).where({ id }).update({ status: "RUNNING" });

  for (const item of failedUrls) {
    const jobId = `check-url-${item.id}`;
    await urlQueue.remove(jobId).catch(() => {});
    await urlQueue.add(
      "check-url",
      {
        batchId: id,
        batchUrlId: item.id,
        url: item.url,
      },
      {
        jobId,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      }
    );
  }

  await invalidateBatchCache();

  return { retried: failedUrls.length };
}
