import { AlertTriangle, CheckCircle2, Loader2, ListChecks, XCircle } from "lucide-react";
import type { TaskCenterResponse } from "@gold-insights/market-domain";
import "./task-status-button.css";

type TaskStatusButtonProps = {
  data: TaskCenterResponse | null;
  isLoading: boolean;
  error: string | null;
  onClick(): void;
};

export function TaskStatusButton({ data, isLoading, error, onClick }: TaskStatusButtonProps): JSX.Element {
  const state = getTaskStatusState(data, isLoading, error);

  return (
    <button type="button" className={`task-status-button task-status-button--${state.tone}`} onClick={onClick} title={state.title} aria-label={state.title}>
      {state.icon}
      <span>{state.label}</span>
    </button>
  );
}

function getTaskStatusState(data: TaskCenterResponse | null, isLoading: boolean, error: string | null): { tone: "neutral" | "blue" | "positive" | "negative" | "amber"; label: string; title: string; icon: JSX.Element } {
  if (error) {
    return {
      tone: "negative",
      label: "任务异常",
      title: `任务中心加载失败: ${error}`,
      icon: <XCircle size={16} aria-hidden="true" />
    };
  }

  if (data?.staleRunningCount) {
    return {
      tone: "amber",
      label: `疑似卡住 ${data.staleRunningCount}`,
      title: "有后台任务疑似卡住，点击查看任务中心",
      icon: <AlertTriangle size={16} aria-hidden="true" />
    };
  }

  if (data?.runningCount) {
    return {
      tone: "blue",
      label: `运行中 ${data.runningCount}`,
      title: "有后台任务正在运行，点击查看任务中心",
      icon: <Loader2 size={16} aria-hidden="true" />
    };
  }

  if (data?.failedCount) {
    return {
      tone: "negative",
      label: `失败 ${data.failedCount}`,
      title: "最近任务存在失败，点击查看任务中心",
      icon: <XCircle size={16} aria-hidden="true" />
    };
  }

  if (data) {
    return {
      tone: "positive",
      label: "任务正常",
      title: data.latestTask ? `最近任务: ${data.latestTask.label}` : "暂无任务异常",
      icon: <CheckCircle2 size={16} aria-hidden="true" />
    };
  }

  return {
    tone: "neutral",
    label: isLoading ? "任务加载" : "任务中心",
    title: "点击查看任务中心",
    icon: <ListChecks size={16} aria-hidden="true" />
  };
}
