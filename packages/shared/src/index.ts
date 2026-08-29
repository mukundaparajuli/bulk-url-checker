export type BatchStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type UrlStatus =
  | "PENDING"
  | "QUEUED"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED";

export interface Batch {
  id: string;
  status: BatchStatus;
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
  status: UrlStatus;
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

export interface CreateBatchRequest {
  urls: string[];
}

export interface CreateBatchResponse {
  id: string;
}

export interface CancelBatchResponse {
  status: BatchStatus;
}

export interface RetryFailedResponse {
  retried: number;
}

export interface BatchIdParams {
  id: string;
}

export interface CheckResult {
  status: number;
  responseTimeMs: number;
  pageTitle: string | null;
  finalUrl: string;
}

export interface BatchUpdatedEvent {
  type: "batch.updated";
  batchId: string;
}

export interface ConnectedEvent {
  type: "connected";
  batchId: string;
}

export type SSEEvent = BatchUpdatedEvent | ConnectedEvent;
