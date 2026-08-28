import { db } from "@repo/db";

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
  return batch;
}

export async function getBatches() {
  return await (db as any).batch.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getBatchById(id: string) {
  return await (db as any).batch.findUnique({
    where: { id },
    include: { urls: true },
  });
}
