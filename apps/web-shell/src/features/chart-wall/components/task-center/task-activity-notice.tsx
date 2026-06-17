import { AlertTriangle, ArrowRight, Loader2, XCircle } from "lucide-react";
import type { RuntimeTask, TaskCenterResponse } from "@gold-insights/market-domain";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import { taskStatusLabel, taskStatusTone } from "./task-center.utils";
import "./task-activity-notice.css";

type TaskActivityNoticeProps = {
  data: TaskCenterResponse | null;
  error: string | null;
  isLoading: boolean;
  onOpen(): void;
};

type NoticeState = {
  tone: "blue" | "amber" | "negative";
  title: string;
  description: string;
  tasks: RuntimeTask[];
};

export function TaskActivityNotice({ data, error, isLoading, onOpen }: TaskActivityNoticeProps): JSX.Element | null {
  const state = getNoticeState(data, error, isLoading);

  if (!state) {
    return null;
  }

  return (
    <section className={`task-activity-notice task-activity-notice--${state.tone}`} aria-label="后台任务提示">
      <div className="task-activity-notice__icon">{noticeIcon(state.tone)}</div>
      <div className="task-activity-notice__main">
        <div className="task-activity-notice__heading">
          <strong>{state.title}</strong>
          <span>{state.description}</span>
        </div>
        {state.tasks.length > 0 && (
          <div className="task-activity-notice__tasks" aria-label="当前后台任务">
            {state.tasks.slice(0, 3).map((task) => (
              <span key={task.id} className={`task-activity-notice__task task-activity-notice__task--${taskStatusTone(task)}`}>
                {taskStatusLabel(task)} · {task.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <button type="button" onClick={onOpen}>
        查看任务中心
        <ArrowRight size={14} aria-hidden="true" />
      </button>
    </section>
  );
}

function getNoticeState(data: TaskCenterResponse | null, error: string | null, isLoading: boolean): NoticeState | null {
  if (error) {
    return {
      tone: "negative",
      title: "任务状态读取失败",
      description: error,
      tasks: []
    };
  }

  if (!data || isLoading) {
    return null;
  }

  if (data.staleRunningCount > 0) {
    return {
      tone: "amber",
      title: `${data.staleRunningCount} 个后台任务疑似卡住`,
      description: `最近任务 ${data.latestTask?.label ?? "未知"}，最后更新 ${formatDateTime(data.generatedAt)}`,
      tasks: data.activeTasks
    };
  }

  if (data.runningCount > 0) {
    return {
      tone: "blue",
      title: `${data.runningCount} 个后台任务正在运行`,
      description: `页面每 3 秒自动检查任务状态，最近任务 ${data.latestTask?.label ?? "未知"}`,
      tasks: data.activeTasks
    };
  }

  return null;
}

function noticeIcon(tone: NoticeState["tone"]): JSX.Element {
  if (tone === "negative") {
    return <XCircle size={18} aria-hidden="true" />;
  }

  if (tone === "amber") {
    return <AlertTriangle size={18} aria-hidden="true" />;
  }

  return <Loader2 size={18} aria-hidden="true" />;
}
