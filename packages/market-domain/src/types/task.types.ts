export type RuntimeTaskStatus = "running" | "success" | "failed";

export type RuntimeTask = {
  id: string;
  vendor: string;
  dataset: string;
  label: string;
  status: RuntimeTaskStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  isRunning: boolean;
  isStale: boolean;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
};

export type TaskCenterResponse = {
  generatedAt: string;
  runningCount: number;
  successCount: number;
  failedCount: number;
  staleRunningCount: number;
  latestTask: RuntimeTask | null;
  tasks: RuntimeTask[];
};
