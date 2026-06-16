import { AlertTriangle, CheckCircle2, Clock3, Loader2, Play, RotateCw, XCircle } from "lucide-react";
import { Button, SignalBadge } from "@gold-insights/ui";
import type { RuntimeTaskAction, RuntimeTaskActionKey, RuntimeTaskActionStatus } from "@gold-insights/market-domain";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import { formatDuration, taskActionStatusLabel, taskActionTone } from "./task-center.utils";
import "./task-action-panel.css";

type TaskActionPanelProps = {
  actions: RuntimeTaskAction[];
  runningActionKey: RuntimeTaskActionKey | null;
  message: string | null;
  onRunAction(actionKey: RuntimeTaskActionKey): void;
};

export function TaskActionPanel({ actions, runningActionKey, message, onRunAction }: TaskActionPanelProps): JSX.Element {
  return (
    <section className="task-action-panel" aria-label="后台任务操作">
      <div className="task-section-heading">
        <div>
          <h3>任务操作台</h3>
          <p>从这里启动常用后台同步，并直接看到对应任务最近一次执行状态。</p>
        </div>
        {message && <span className="task-action-panel__message">{message}</span>}
      </div>
      <div className="task-action-grid">
        {actions.map((action) => (
          <TaskActionCard key={action.key} action={action} isStarting={runningActionKey === action.key} hasAnotherActionRunning={runningActionKey !== null && runningActionKey !== action.key} onRunAction={onRunAction} />
        ))}
      </div>
    </section>
  );
}

function TaskActionCard({ action, isStarting, hasAnotherActionRunning, onRunAction }: { action: RuntimeTaskAction; isStarting: boolean; hasAnotherActionRunning: boolean; onRunAction(actionKey: RuntimeTaskActionKey): void }): JSX.Element {
  const tone = taskActionTone(action);
  const isBusy = isStarting || action.isRunning;

  return (
    <article className={`task-action-card task-action-card--${tone}`}>
      <header>
        <div className="task-action-card__title">
          {taskActionIcon(action.latestStatus, isStarting)}
          <div>
            <strong>{action.label}</strong>
            <span>{action.vendor} / {action.dataset}</span>
          </div>
        </div>
        <SignalBadge label={isStarting ? "启动中" : taskActionStatusLabel(action)} tone={isStarting ? "blue" : tone} />
      </header>
      <p>{action.description}</p>
      <dl>
        <TaskActionMeta label="最近开始" value={formatDateTime(action.latestStartedAt)} />
        <TaskActionMeta label="最近结束" value={formatDateTime(action.latestFinishedAt)} />
        <TaskActionMeta label="最近耗时" value={formatDuration(action.latestDurationMs)} />
        <TaskActionMeta label="任务 ID" value={action.latestTaskId ?? "暂无"} />
      </dl>
      {action.latestErrorMessage && <p className="task-action-card__error">{action.latestErrorMessage}</p>}
      <Button type="button" onClick={() => onRunAction(action.key)} disabled={isBusy || hasAnotherActionRunning}>
        {isBusy ? <Loader2 size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
        {isBusy ? "执行中" : action.latestStatus === "failed" ? "重试任务" : "启动任务"}
      </Button>
    </article>
  );
}

function TaskActionMeta({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt>{label}</dt>
      <dd title={value}>{value}</dd>
    </div>
  );
}

function taskActionIcon(status: RuntimeTaskActionStatus, isStarting: boolean): JSX.Element {
  if (isStarting || status === "running") {
    return <Loader2 size={18} aria-hidden="true" />;
  }
  if (status === "stale") {
    return <AlertTriangle size={18} aria-hidden="true" />;
  }
  if (status === "failed") {
    return <XCircle size={18} aria-hidden="true" />;
  }
  if (status === "success") {
    return <CheckCircle2 size={18} aria-hidden="true" />;
  }
  if (status === "idle") {
    return <Clock3 size={18} aria-hidden="true" />;
  }
  return <RotateCw size={18} aria-hidden="true" />;
}
