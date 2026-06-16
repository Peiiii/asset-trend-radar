import { AlertTriangle, CheckCircle2, Loader2, ListChecks, XCircle } from "lucide-react";
import type { TaskCenterResponse } from "@gold-insights/market-domain";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import { formatPollInterval } from "./task-center.utils";
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

export function TaskStatusButton({ data, isLoading, error, isPolling, lastLoadedAt, pollIntervalMs, onClick }: TaskStatusButtonProps): JSX.Element {
  const state = getTaskStatusState(data, isLoading, error, isPolling, lastLoadedAt, pollIntervalMs);

  return (
    <button type="button" className={`task-status-button task-status-button--${state.tone}`} onClick={onClick} title={state.title} aria-label={state.title}>
      {state.icon}
      <span className="task-status-button__copy">
        <span className="task-status-button__label">{state.label}</span>
        <span className="task-status-button__meta">{state.secondary}</span>
      </span>
    </button>
  );
}

function getTaskStatusState(data: TaskCenterResponse | null, isLoading: boolean, error: string | null, isPolling: boolean, lastLoadedAt: string | null, pollIntervalMs: number): { tone: "neutral" | "blue" | "positive" | "negative" | "amber"; label: string; secondary: string; title: string; icon: JSX.Element } {
  const pollingLabel = isPolling ? `${formatPollInterval(pollIntervalMs)}轮询` : "未轮询";
  const loadedLabel = lastLoadedAt ? `上次 ${formatDateTime(lastLoadedAt)}` : "尚未拉取";

  if (error) {
    return {
      tone: "negative",
      label: "任务异常",
      secondary: loadedLabel,
      title: `任务中心加载失败: ${error}，${pollingLabel}`,
      icon: <XCircle size={16} aria-hidden="true" />
    };
  }

  if (data?.staleRunningCount) {
    return {
      tone: "amber",
      label: `疑似卡住 ${data.staleRunningCount}`,
      secondary: data.latestTask ? `最近 ${data.latestTask.label}` : "需要排查",
      title: `有后台任务疑似卡住，${pollingLabel}，点击查看任务中心`,
      icon: <AlertTriangle size={16} aria-hidden="true" />
    };
  }

  if (data?.runningCount) {
    return {
      tone: "blue",
      label: `运行中 ${data.runningCount}`,
      secondary: data.latestTask ? data.latestTask.label : "正在同步",
      title: `有后台任务正在运行，${pollingLabel}，点击查看任务中心`,
      icon: <Loader2 size={16} aria-hidden="true" />
    };
  }

  if (data?.failedCount) {
    return {
      tone: "negative",
      label: `失败 ${data.failedCount}`,
      secondary: data.latestTask ? `最近 ${data.latestTask.label}` : "查看错误",
      title: `最近任务存在失败，${pollingLabel}，点击查看任务中心`,
      icon: <XCircle size={16} aria-hidden="true" />
    };
  }

  if (data) {
    return {
      tone: "positive",
      label: "任务正常",
      secondary: data.latestTask ? `最近 ${data.latestTask.label}` : loadedLabel,
      title: data.latestTask ? `最近任务: ${data.latestTask.label}，${pollingLabel}` : `暂无任务异常，${pollingLabel}`,
      icon: <CheckCircle2 size={16} aria-hidden="true" />
    };
  }

  return {
    tone: "neutral",
    label: isLoading ? "任务加载" : "任务中心",
    secondary: isLoading ? "同步状态中" : "点击查看",
    title: "点击查看任务中心",
    icon: <ListChecks size={16} aria-hidden="true" />
  };
}
