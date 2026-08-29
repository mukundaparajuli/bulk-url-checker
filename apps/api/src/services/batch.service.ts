import { db } from "@repo/db";
import { enqueueBatch, urlQueue } from "./queue.service";
import { getCachedBatches, setCachedBatches, invalidateBatchCache } from "./cache.service";

export async function createBatch(urls: string[]) {
  const batch = await db.transaction(async (tx) => {
    const created = await (tx as any).batch.create({
      data: {
        status: "PENDING",
        totalUrls: urls.length,
        completedUrls: 0,
        failedUrls: 0,
        cancelledUrls: 0,
        urls: {
          create: urls.map((url) => ({
            url,
            status: "PENDING" as const,
          })),
        },
      },
    });
    return created;
  });

  await enqueueBatch(batch.id);
  await invalidateBatchCache();

  return batch;
}

export async function getBatches() {
  const cached = await getCachedBatches();
  if (cached) return cached;

  const batches = await (db as any).batch.findMany({
    orderBy: { createdAt: "desc" },
  });

  await setCachedBatches(batches);

  return batches;
}

export async function getBatchById(id: string) {
  return await (db as any).batch.findUnique({
    where: { id },
    include: { urls: true },
  });
}

export async function cancelBatch(id: string) {
  const batch = await (db as any).batch.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!batch) {
    throw new Error("Batch not found");
  }

  if (batch.status === "COMPLETED" || batch.status === "CANCELLED") {
    return batch;
  }

  await (db as any).batch.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  const pendingUrls = await (db as any).batchUrl.findMany({
    where: {
      batchId: id,
      status: { in: ["PENDING", "QUEUED"] },
    },
    select: { id: true },
  });

  for (const url of pendingUrls) {
    await urlQueue.remove(`check-url:${url.id}`);
  }

  await (db as any).batchUrl.updateMany({
    where: {
      batchId: id,
      status: { in: ["PENDING", "QUEUED"] },
    },
    data: { status: "CANCELLED" },
  });

  await invalidateBatchCache();

  return batch;
}

export async function retryFailedUrls(id: string) {
  const batch = await (db as any).batch.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!batch) {
    throw new Error("Batch not found");
  }

  const failedUrls = await (db as any).batchUrl.findMany({
    where: {
      batchId: id,
      status: "FAILED",
    },
    select: { id: true, url: true },
  });

  if (failedUrls.length === 0) {
    return { retried: 0 };
  }

  await (db as any).batchUrl.updateMany({
    where: {
      batchId: id,
      status: "FAILED",
    },
    data: { status: "QUEUED", error: null },
  });

  await (db as any).batch.update({
    where: { id },
    data: { status: "RUNNING" },
  });

  for (const item of failedUrls) {
    await urlQueue.add(
      "check-url",
      {
        batchId: id,
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

  await invalidateBatchCache();

  return { retried: failedUrls.length };
}
