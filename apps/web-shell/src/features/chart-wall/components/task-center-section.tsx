import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCcw, XCircle } from "lucide-react";
import { Button, EmptyState, ErrorState, LoadingState, SignalBadge } from "@gold-insights/ui";
import type { RuntimeTask, TaskCenterResponse } from "@gold-insights/market-domain";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import "./task-center-section.css";

type TaskCenterSectionProps = {
  data: TaskCenterResponse | null;
  error: string | null;
  isLoading: boolean;
  onRefresh(): void;
};

export function TaskCenterSection({ data, error, isLoading, onRefresh }: TaskCenterSectionProps): JSX.Element {
  return (
    <section className="single-view-section task-center-section">
      <div className="task-center-hero">
        <div>
          <h2>任务中心</h2>
          <p>后台同步、基金目录、基金导入和刷新任务都会记录在这里；运行中任务会自动刷新，失败任务保留错误信息。</p>
        </div>
        <Button type="button" variant="ghost" onClick={onRefresh}>
          <RefreshCcw size={15} aria-hidden="true" />
          刷新任务
        </Button>
      </div>

      {isLoading && !data && <LoadingState />}
      {!isLoading && error && <ErrorState title="任务中心加载失败" message={error} />}
      {data && (
        <>
          <div className="task-summary-grid">
            <TaskSummaryCard label="运行中" value={data.runningCount} tone={data.runningCount > 0 ? "blue" : "neutral"} />
            <TaskSummaryCard label="疑似卡住" value={data.staleRunningCount} tone={data.staleRunningCount > 0 ? "amber" : "neutral"} />
            <TaskSummaryCard label="成功" value={data.successCount} tone="positive" />
            <TaskSummaryCard label="失败" value={data.failedCount} tone={data.failedCount > 0 ? "negative" : "neutral"} />
            <TaskSummaryCard label="最近刷新" value={formatDateTime(data.generatedAt)} tone="neutral" />
          </div>

          {data.tasks.length === 0 ? (
            <EmptyState title="暂无任务记录" description="启动采集、同步基金目录或导入基金后，这里会显示任务进度和历史。" />
          ) : (
            <div className="task-list">
              {data.tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function TaskSummaryCard({ label, value, tone }: { label: string; value: number | string; tone: "positive" | "negative" | "neutral" | "amber" | "blue" }): JSX.Element {
  return (
    <article className={`task-summary-card task-summary-card--${tone}`}>
      <span>{label}</span>
      <strong>{typeof value === "number" ? value.toLocaleString("en-US") : value}</strong>
    </article>
  );
}

function TaskCard({ task }: { task: RuntimeTask }): JSX.Element {
  return (
    <article className={`task-card task-card--${task.status}${task.isStale ? " task-card--stale" : ""}`}>
      <div className="task-card__status">
        {taskIcon(task)}
        <SignalBadge label={taskStatusLabel(task)} tone={taskStatusTone(task)} />
      </div>
      <div className="task-card__main">
        <header>
          <strong>{task.label}</strong>
          <span>{task.vendor} / {task.dataset}</span>
        </header>
        <dl>
          <TaskMeta label="开始" value={formatDateTime(task.startedAt)} />
          <TaskMeta label="结束" value={formatDateTime(task.finishedAt)} />
          <TaskMeta label="耗时" value={formatDuration(task.durationMs)} />
          <TaskMeta label="任务 ID" value={task.id} />
        </dl>
        {task.errorMessage && <p className="task-card__error">{task.errorMessage}</p>}
        {Object.keys(task.metadata).length > 0 && <p className="task-card__metadata">{formatMetadata(task.metadata)}</p>}
      </div>
    </article>
  );
}

function TaskMeta({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function taskIcon(task: RuntimeTask): JSX.Element {
  if (task.isStale) {
    return <AlertTriangle size={18} aria-hidden="true" />;
  }
  if (task.status === "running") {
    return <Loader2 size={18} aria-hidden="true" />;
  }
  if (task.status === "failed") {
    return <XCircle size={18} aria-hidden="true" />;
  }
  if (task.status === "success") {
    return <CheckCircle2 size={18} aria-hidden="true" />;
  }
  return <Clock3 size={18} aria-hidden="true" />;
}

function taskStatusLabel(task: RuntimeTask): string {
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

function taskStatusTone(task: RuntimeTask): "positive" | "negative" | "neutral" | "amber" | "blue" {
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

function formatDuration(value: number | null): string {
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

function formatMetadata(metadata: Record<string, unknown>): string {
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" / ");
}
