import type { ControlOption } from "@gold-insights/ui";
import type { RuntimeTask, RuntimeTaskAction, RuntimeTaskPipelineSummary, RuntimeTaskStatus, TaskCenterResponse } from "@gold-insights/market-domain";

export type TaskFilter = "all" | RuntimeTaskStatus | "stale";
export type TaskTone = "positive" | "negative" | "neutral" | "amber" | "blue";

export type TaskActivitySummary = {
  tone: TaskTone;
  title: string;
  description: string;
  latestTaskLabel: string;
  pipelineLabel: string;
  activeLabel: string;
};

export function hasCurrentTaskFailure(data: TaskCenterResponse): boolean {
  return data.latestTask?.status === "failed";
}

export function buildTaskActivitySummary(data: TaskCenterResponse): TaskActivitySummary {
  const latestTaskLabel = data.latestTask ? data.latestTask.label : "暂无任务";
  const pipelineLabel = `${data.pipelineSummaries.length.toLocaleString("en-US")} 条任务管线`;
  const hasCurrentFailure = hasCurrentTaskFailure(data);

  if (data.staleRunningCount > 0) {
    return {
      tone: "amber",
      title: "有任务疑似卡住",
      description: "优先检查运行时间过长的任务，确认数据同步是否需要重启或重试。",
      latestTaskLabel,
      pipelineLabel,
      activeLabel: `${data.staleRunningCount} 个疑似卡住`
    };
  }

  if (data.runningCount > 0) {
    return {
      tone: "blue",
      title: "后台正在运行",
      description: "同步或导入任务还在执行，页面会自动轮询任务状态。",
      latestTaskLabel,
      pipelineLabel,
      activeLabel: `${data.runningCount} 个运行中`
    };
  }

  if (hasCurrentFailure) {
    return {
      tone: "negative",
      title: "最新任务失败",
      description: "最新后台任务没有完成，可以先查看最近失败和对应管线。",
      latestTaskLabel,
      pipelineLabel,
      activeLabel: `${data.failedCount} 个失败`
    };
  }

  const historicalFailureCopy = data.failedCount > 0 ? `，历史失败 ${data.failedCount.toLocaleString("en-US")} 个仍可追溯` : "";

  return {
    tone: "positive",
    title: data.totalCount > 0 ? "后台空闲，任务正常" : "暂无后台任务",
    description: data.totalCount > 0 ? `当前没有运行中、卡住或最新失败任务${historicalFailureCopy}。` : "启动同步、基金目录或基金导入后，这里会形成可追踪的任务记录。",
    latestTaskLabel,
    pipelineLabel,
    activeLabel: data.totalCount > 0 ? "无运行任务" : "等待首次任务"
  };
}

export function taskStatusLabel(task: RuntimeTask): string {
  if (task.isStale) {
    return "疑似卡住";
  }
  if (task.status === "running") {
    return "运行中";
  }
  if (task.status === "success") {
    return "成功";
  }
  return "失败";
}

export function taskStatusTone(task: RuntimeTask): TaskTone {
  if (task.isStale) {
    return "amber";
  }
  if (task.status === "running") {
    return "blue";
  }
  if (task.status === "success") {
    return "positive";
  }
  if (task.status === "failed") {
    return "negative";
  }
  return "neutral";
}

export function pipelineStatusLabel(pipeline: RuntimeTaskPipelineSummary): string {
  if (pipeline.status === "stale") {
    return "疑似卡住";
  }
  if (pipeline.status === "running") {
    return "运行中";
  }
  if (pipeline.status === "failed") {
    return "最近失败";
  }
  return "健康";
}

export function pipelineTone(pipeline: RuntimeTaskPipelineSummary): TaskTone {
  if (pipeline.status === "stale") {
    return "amber";
  }
  if (pipeline.status === "running") {
    return "blue";
  }
  if (pipeline.status === "failed") {
    return "negative";
  }
  return "positive";
}

export function taskActionStatusLabel(action: RuntimeTaskAction): string {
  if (action.latestStatus === "idle") {
    return "未运行";
  }
  if (action.latestStatus === "stale") {
    return "疑似卡住";
  }
  if (action.latestStatus === "running") {
    return "运行中";
  }
  if (action.latestStatus === "success") {
    return "最近成功";
  }
  return "最近失败";
}

export function taskActionTone(action: RuntimeTaskAction): TaskTone {
  if (action.latestStatus === "stale") {
    return "amber";
  }
  if (action.latestStatus === "running") {
    return "blue";
  }
  if (action.latestStatus === "failed") {
    return "negative";
  }
  if (action.latestStatus === "success") {
    return "positive";
  }
  return "neutral";
}

export function formatDuration(value: number | null): string {
  if (value === null) {
    return "暂无";
  }

  const seconds = Math.round(value / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatPollInterval(value: number): string {
  const seconds = Math.max(1, Math.round(value / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
}

export function formatMetadata(metadata: Record<string, unknown>): string {
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" / ");
}

export function getTaskFilterOptions(data: TaskCenterResponse | null): ControlOption[] {
  return [
    { value: "all", label: `全部 ${data?.totalCount ?? 0}` },
    { value: "running", label: `运行中 ${data?.runningCount ?? 0}` },
    { value: "stale", label: `疑似卡住 ${data?.staleRunningCount ?? 0}` },
    { value: "failed", label: `失败 ${data?.failedCount ?? 0}` },
    { value: "success", label: `成功 ${data?.successCount ?? 0}` }
  ];
}

export function filterTasks(tasks: RuntimeTask[], filter: TaskFilter): RuntimeTask[] {
  if (filter === "all") {
    return tasks;
  }

  if (filter === "stale") {
    return tasks.filter((task) => task.isStale);
  }

  return tasks.filter((task) => task.status === filter && !task.isStale);
}
