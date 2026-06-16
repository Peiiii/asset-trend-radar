export type IngestionJobStatus = "running" | "success" | "failed";

export type IngestionJobSummary = {
  id: string;
  vendor: string;
  dataset: string;
  status: IngestionJobStatus;
  startedAt: number | null;
  finishedAt: number | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
};

export type IngestionJobStatusCounts = {
  totalCount: number;
  runningCount: number;
  successCount: number;
  failedCount: number;
  staleRunningCount: number;
};
