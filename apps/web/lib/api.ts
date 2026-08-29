const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface Batch {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "CANCELLED" | "FAILED";
  totalUrls: number;
  completedUrls: number;
  failedUrls: number;
  cancelledUrls: number;
  createdAt: string;
  updatedAt: string;
}

export interface BatchUrl {
  id: string;
  batchId: string;
  url: string;
  status: "PENDING" | "QUEUED" | "PROCESSING" | "SUCCESS" | "FAILED" | "CANCELLED";
  httpStatus: number | null;
  responseTimeMs: number | null;
  pageTitle: string | null;
  error: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface BatchDetail extends Batch {
  urls: BatchUrl[];
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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
  return api<{ id: string }>("/api/batches", {
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
  return api<{ status: string }>(`/api/batches/${id}/cancel`, {
    method: "POST",
  });
}

export function retryFailed(id: string) {
  return api<{ retried: number }>(`/api/batches/${id}/retry-failed`, {
    method: "POST",
  });
}

export function batchEventsUrl(id: string) {
  return `${API_URL}/api/batches/${id}/events`;
}
