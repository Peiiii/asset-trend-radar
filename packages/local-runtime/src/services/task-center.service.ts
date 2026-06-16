import type { SqliteIngestionJobRepository } from "@gold-insights/data-storage";
import type { IngestionJobSummary } from "@gold-insights/data-storage";
import type { RuntimeTask, TaskCenterResponse } from "@gold-insights/market-domain";
import { toIsoDateTime } from "@gold-insights/market-domain";

const staleRunningMs = 30 * 60 * 1000;

export class TaskCenterService {
  public constructor(private readonly ingestionJobRepository: SqliteIngestionJobRepository) {}

  public getTaskCenter = (limit = 80): TaskCenterResponse => {
    const jobs = this.ingestionJobRepository.listRecentJobs(limit);
    const tasks = jobs.map(this.toRuntimeTask);

    return {
      generatedAt: new Date().toISOString(),
      runningCount: tasks.filter((task) => task.status === "running" && !task.isStale).length,
      successCount: tasks.filter((task) => task.status === "success").length,
      failedCount: tasks.filter((task) => task.status === "failed").length,
      staleRunningCount: tasks.filter((task) => task.isStale).length,
      latestTask: tasks[0] ?? null,
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
