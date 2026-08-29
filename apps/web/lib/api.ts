import type {
  Batch,
  BatchDetail,
  CreateBatchResponse,
  CancelBatchResponse,
  RetryFailedResponse,
} from "@repo/shared";

export type { Batch, BatchDetail, BatchUrl } from "@repo/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body != null;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export function createBatch(urls: string[]) {
  return api<CreateBatchResponse>("/api/batches", {
    method: "POST",
    body: JSON.stringify({ urls }),
  });
}

export function getBatches() {
  return api<Batch[]>("/api/batches");
}

export function getBatchById(id: string) {
  return api<BatchDetail>(`/api/batches/${id}`);
}

export function cancelBatch(id: string) {
  return api<CancelBatchResponse>(`/api/batches/${id}/cancel`, {
    method: "POST",
  });
}

export function retryFailed(id: string) {
  return api<RetryFailedResponse>(`/api/batches/${id}/retry-failed`, {
    method: "POST",
  });
}

export function batchEventsUrl(id: string) {
  return `${API_URL}/api/batches/${id}/events`;
}
