import { AlertTriangle, CheckCircle2, Loader2, ListChecks, XCircle } from "lucide-react";
import type { TaskCenterResponse } from "@gold-insights/market-domain";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import { formatPollInterval, hasCurrentTaskFailure, hasHistoricalTaskFailure, taskFailureTone } from "./task-center.utils";
import "./task-status-button.css";

type TaskStatusButtonProps = {
  data: TaskCenterResponse | null;
  isLoading: boolean;
  error: string | null;
  isPolling: boolean;
  lastLoadedAt: string | null;
  pollIntervalMs: number;
  onClick(): void;
};

type TaskStatusMetric = {
  label: string;
  value: number | string;
  tone: "neutral" | "blue" | "amber" | "negative";
};

type TaskStatusState = {
  tone: "neutral" | "blue" | "positive" | "negative" | "amber";
  label: string;
  secondary: string;
  title: string;
  icon: JSX.Element;
  metrics: TaskStatusMetric[];
};

export function TaskStatusButton({ data, isLoading, error, isPolling, lastLoadedAt, pollIntervalMs, onClick }: TaskStatusButtonProps): JSX.Element {
  const state = getTaskStatusState(data, isLoading, error, isPolling, lastLoadedAt, pollIntervalMs);

  return (
    <button type="button" className={`task-status-button task-status-button--${state.tone}`} onClick={onClick} title={state.title} aria-label={state.title}>
      {state.icon}
      <span className="task-status-button__copy">
        <span className="task-status-button__label">{state.label}</span>
        <span className="task-status-button__meta">{state.secondary}</span>
      </span>
      <span className="task-status-button__metrics" aria-hidden="true">
        {state.metrics.map((metric) => (
          <span key={metric.label} className={`task-status-button__metric task-status-button__metric--${metric.tone}`}>
            {metric.label} {metric.value}
          </span>
        ))}
      </span>
    </button>
  );
}

function getTaskStatusState(data: TaskCenterResponse | null, isLoading: boolean, error: string | null, isPolling: boolean, lastLoadedAt: string | null, pollIntervalMs: number): TaskStatusState {
  const pollingLabel = isPolling ? `${formatPollInterval(pollIntervalMs)}轮询` : "未轮询";
  const loadedLabel = lastLoadedAt ? `上次 ${formatDateTime(lastLoadedAt)}` : "尚未拉取";
  const metrics = buildTaskStatusMetrics(data, isLoading);
  const hasCurrentFailure = data ? hasCurrentTaskFailure(data) : false;

  if (error) {
    return {
      tone: "negative",
      label: "任务异常",
      secondary: loadedLabel,
      title: `任务中心加载失败: ${error}，${pollingLabel}`,
      icon: <XCircle size={16} aria-hidden="true" />,
      metrics
    };
  }

  if (data?.staleRunningCount) {
    return {
      tone: "amber",
      label: `疑似卡住 ${data.staleRunningCount}`,
      secondary: data.latestTask ? `最近 ${data.latestTask.label}` : "需要排查",
      title: `有后台任务疑似卡住，运行 ${data.runningCount}，失败 ${data.failedCount}，${pollingLabel}，点击查看任务中心`,
      icon: <AlertTriangle size={16} aria-hidden="true" />,
      metrics
    };
  }

  if (data?.runningCount) {
    return {
      tone: "blue",
      label: `运行中 ${data.runningCount}`,
      secondary: data.latestTask ? data.latestTask.label : "正在同步",
      title: `有后台任务正在运行，卡住 ${data.staleRunningCount}，失败 ${data.failedCount}，${pollingLabel}，点击查看任务中心`,
      icon: <Loader2 size={16} aria-hidden="true" />,
      metrics
    };
  }

  if (data && hasCurrentFailure) {
    return {
      tone: "negative",
      label: "最新失败",
      secondary: data.latestTask ? `最近 ${data.latestTask.label}` : "查看错误",
      title: `最近任务存在失败，运行 ${data.runningCount}，卡住 ${data.staleRunningCount}，${pollingLabel}，点击查看任务中心`,
      icon: <XCircle size={16} aria-hidden="true" />,
      metrics
    };
  }

  if (data && hasHistoricalTaskFailure(data)) {
    const failureCount = data.failedCount.toLocaleString("en-US");

    return {
      tone: "positive",
      label: "任务正常",
      secondary: data.latestTask ? `最近 ${data.latestTask.label}` : "后台空闲",
      title: `当前没有运行中、卡住或最新失败任务；${failureCount} 个历史失败已留档，${pollingLabel}`,
      icon: <CheckCircle2 size={16} aria-hidden="true" />,
      metrics
    };
  }

  if (data) {
    return {
      tone: "positive",
      label: "任务正常",
      secondary: data.latestTask ? `最近 ${data.latestTask.label}` : loadedLabel,
      title: data.latestTask ? `最近任务: ${data.latestTask.label}，运行 ${data.runningCount}，失败 ${data.failedCount}，${pollingLabel}` : `暂无任务异常，${pollingLabel}`,
      icon: <CheckCircle2 size={16} aria-hidden="true" />,
      metrics
    };
  }

  return {
    tone: "neutral",
    label: isLoading ? "任务加载" : "任务中心",
    secondary: isLoading ? "同步状态中" : "点击查看",
    title: "点击查看任务中心",
    icon: <ListChecks size={16} aria-hidden="true" />,
    metrics
  };
}

function buildTaskStatusMetrics(data: TaskCenterResponse | null, isLoading: boolean): TaskStatusMetric[] {
  if (!data) {
    return [{ label: "状态", value: isLoading ? "拉取中" : "未知", tone: "neutral" }];
  }

  const hasCurrentFailure = hasCurrentTaskFailure(data);

  return [
    { label: "运行", value: data.runningCount, tone: data.runningCount > 0 ? "blue" : "neutral" },
    { label: "卡住", value: data.staleRunningCount, tone: data.staleRunningCount > 0 ? "amber" : "neutral" },
    { label: hasCurrentFailure ? "失败" : "留档", value: data.failedCount, tone: taskFailureTone(data) }
  ];
}
