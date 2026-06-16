import type { SqliteIngestionJobRepository } from "@gold-insights/data-storage";
import type { IngestionJobSummary } from "@gold-insights/data-storage";
import type { RuntimeTask, RuntimeTaskAction, RuntimeTaskActionKey, RuntimeTaskPipelineSummary, TaskCenterResponse } from "@gold-insights/market-domain";
import { toIsoDateTime } from "@gold-insights/market-domain";

const staleRunningMs = 30 * 60 * 1000;

type RuntimeTaskActionDefinition = {
  key: RuntimeTaskActionKey;
  label: string;
  description: string;
  vendor: string;
  dataset: string;
};

export class TaskCenterService {
  private readonly actionDefinitions: RuntimeTaskActionDefinition[] = [
    {
      key: "refresh-global-bars",
      label: "全市场行情同步",
      description: "拉取走势池内资产的最新 K 线、指标和机会事件。",
      vendor: "multi-source",
      dataset: "global-bars-1d"
    },
    {
      key: "sync-fund-catalog",
      label: "东方财富基金目录同步",
      description: "更新基金目录、轻量涨跌幅快照和可导入基金范围。",
      vendor: "eastmoney",
      dataset: "fund-catalog"
    }
  ];

  public constructor(private readonly ingestionJobRepository: SqliteIngestionJobRepository) {}

  public getTaskCenter = (limit = 80): TaskCenterResponse => {
    const staleRunningStartedBefore = Date.now() - staleRunningMs;
    const counts = this.ingestionJobRepository.getStatusCounts(staleRunningStartedBefore);
    const jobs = this.ingestionJobRepository.listRecentJobs(limit);
    const tasks = jobs.map(this.toRuntimeTask);
    const activeTasks = this.ingestionJobRepository.listRunningJobs(24).map(this.toRuntimeTask);
    const recentFailures = this.ingestionJobRepository.listRecentJobsByStatus("failed", 8).map(this.toRuntimeTask);

    return {
      generatedAt: new Date().toISOString(),
      totalCount: counts.totalCount,
      runningCount: counts.runningCount,
      successCount: counts.successCount,
      failedCount: counts.failedCount,
      staleRunningCount: counts.staleRunningCount,
      latestTask: tasks[0] ?? null,
      activeTasks,
      recentFailures,
      pipelineSummaries: this.buildPipelineSummaries(tasks),
      actions: this.buildTaskActions(),
      tasks
    };
  };

  private toRuntimeTask = (job: IngestionJobSummary): RuntimeTask => {
    const now = Date.now();
    const startedAt = job.startedAt;
    const finishedAt = job.finishedAt;
    const endAt = finishedAt ?? (job.status === "running" ? now : null);
    const durationMs = startedAt && endAt ? Math.max(endAt - startedAt, 0) : null;
    const isStale = job.status === "running" && startedAt !== null && now - startedAt > staleRunningMs;

    return {
      id: job.id,
      vendor: job.vendor,
      dataset: job.dataset,
      label: this.getTaskLabel(job),
      status: job.status,
      startedAt: toIsoDateTime(startedAt),
      finishedAt: toIsoDateTime(finishedAt),
      durationMs,
      isRunning: job.status === "running" && !isStale,
      isStale,
      errorMessage: job.errorMessage,
      metadata: job.metadata
    };
  };

  private buildPipelineSummaries = (tasks: RuntimeTask[]): RuntimeTaskPipelineSummary[] => {
    const groups = new Map<string, RuntimeTask[]>();

    for (const task of tasks) {
      const key = `${task.vendor}:${task.dataset}`;
      groups.set(key, [...(groups.get(key) ?? []), task]);
    }

    return Array.from(groups.entries())
      .map(([key, groupTasks]) => this.toPipelineSummary(key, groupTasks))
      .sort((left, right) => Date.parse(right.latestStartedAt ?? "0") - Date.parse(left.latestStartedAt ?? "0"));
  };

  private toPipelineSummary = (key: string, tasks: RuntimeTask[]): RuntimeTaskPipelineSummary => {
    const latestTask = tasks[0];
    const runningCount = tasks.filter((task) => task.status === "running" && !task.isStale).length;
    const staleRunningCount = tasks.filter((task) => task.isStale).length;
    const failedTasks = tasks.filter((task) => task.status === "failed");
    const successTasks = tasks.filter((task) => task.status === "success");

    return {
      key,
      label: latestTask.label,
      vendor: latestTask.vendor,
      dataset: latestTask.dataset,
      status: staleRunningCount > 0 ? "stale" : latestTask.status,
      totalCount: tasks.length,
      runningCount,
      staleRunningCount,
      successCount: successTasks.length,
      failedCount: failedTasks.length,
      latestTaskId: latestTask.id,
      latestStartedAt: latestTask.startedAt,
      latestFinishedAt: latestTask.finishedAt,
      latestDurationMs: latestTask.durationMs,
      lastSuccessAt: successTasks[0]?.finishedAt ?? null,
      lastFailureAt: failedTasks[0]?.finishedAt ?? null,
      latestErrorMessage: latestTask.errorMessage
    };
  };

  private buildTaskActions = (): RuntimeTaskAction[] =>
    this.actionDefinitions.map((definition) => {
      const latestJob = this.ingestionJobRepository.getLatestJobForDataset(definition.vendor, definition.dataset);
      const latestTask = latestJob ? this.toRuntimeTask(latestJob) : null;

      return {
        key: definition.key,
        label: definition.label,
        description: definition.description,
        vendor: definition.vendor,
        dataset: definition.dataset,
        latestStatus: latestTask ? (latestTask.isStale ? "stale" : latestTask.status) : "idle",
        latestTaskId: latestTask?.id ?? null,
        latestStartedAt: latestTask?.startedAt ?? null,
        latestFinishedAt: latestTask?.finishedAt ?? null,
        latestDurationMs: latestTask?.durationMs ?? null,
        latestErrorMessage: latestTask?.errorMessage ?? null,
        isRunning: Boolean(latestTask?.isRunning),
        isStale: Boolean(latestTask?.isStale)
      };
    });

  private getTaskLabel = (job: IngestionJobSummary): string => {
    if (job.vendor === "multi-source" && job.dataset === "global-bars-1d") {
      return "全市场行情同步";
    }

    if (job.vendor === "eastmoney" && job.dataset === "fund-catalog") {
      return "东方财富基金目录同步";
    }

    if (job.vendor === "eastmoney" && job.dataset.startsWith("fund-import")) {
      const code = typeof job.metadata.code === "string" ? job.metadata.code : job.dataset.replace("fund-import:", "");
      return `基金走势导入 ${code}`;
    }

    return `${job.vendor} / ${job.dataset}`;
  };
}
