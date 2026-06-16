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

export type RuntimeTaskPipelineSummary = {
  key: string;
  label: string;
  vendor: string;
  dataset: string;
  status: RuntimeTaskStatus | "stale";
  totalCount: number;
  runningCount: number;
  staleRunningCount: number;
  successCount: number;
  failedCount: number;
  latestTaskId: string;
  latestStartedAt: string | null;
  latestFinishedAt: string | null;
  latestDurationMs: number | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  latestErrorMessage: string | null;
};

export type TaskCenterResponse = {
  generatedAt: string;
  totalCount: number;
  runningCount: number;
  successCount: number;
  failedCount: number;
  staleRunningCount: number;
  latestTask: RuntimeTask | null;
  activeTasks: RuntimeTask[];
  recentFailures: RuntimeTask[];
  pipelineSummaries: RuntimeTaskPipelineSummary[];
  tasks: RuntimeTask[];
};
