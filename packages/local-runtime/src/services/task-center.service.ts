import type { SqliteIngestionJobRepository } from "@gold-insights/data-storage";
import type { IngestionJobSummary } from "@gold-insights/data-storage";
import type { RuntimeTask, RuntimeTaskPipelineSummary, TaskCenterResponse } from "@gold-insights/market-domain";
import { toIsoDateTime } from "@gold-insights/market-domain";

const staleRunningMs = 30 * 60 * 1000;

export class TaskCenterService {
  public constructor(private readonly ingestionJobRepository: SqliteIngestionJobRepository) {}

  public getTaskCenter = (limit = 80): TaskCenterResponse => {
    const jobs = this.ingestionJobRepository.listRecentJobs(limit);
    const tasks = jobs.map(this.toRuntimeTask);
    const activeTasks = tasks.filter((task) => task.status === "running" || task.isStale);
    const recentFailures = tasks.filter((task) => task.status === "failed").slice(0, 8);

    return {
      generatedAt: new Date().toISOString(),
      totalCount: this.ingestionJobRepository.countJobs(),
      runningCount: tasks.filter((task) => task.status === "running" && !task.isStale).length,
      successCount: tasks.filter((task) => task.status === "success").length,
      failedCount: tasks.filter((task) => task.status === "failed").length,
      staleRunningCount: tasks.filter((task) => task.isStale).length,
      latestTask: tasks[0] ?? null,
      activeTasks,
      recentFailures,
      pipelineSummaries: this.buildPipelineSummaries(tasks),
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
