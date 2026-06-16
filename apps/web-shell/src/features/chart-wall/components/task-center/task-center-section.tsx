import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCcw, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, EmptyState, ErrorState, LoadingState, SegmentedControl, SignalBadge } from "@gold-insights/ui";
import type { RuntimeTask, RuntimeTaskPipelineSummary, TaskCenterResponse } from "@gold-insights/market-domain";
import { formatDateTime } from "@/shared/utils/format-number.utils";
import { buildTaskActivitySummary, filterTasks, formatDuration, formatMetadata, getTaskFilterOptions, pipelineStatusLabel, pipelineTone, taskStatusLabel, taskStatusTone } from "./task-center.utils";
import type { TaskFilter, TaskTone } from "./task-center.utils";
import "./task-center-section.css";
import "./task-center-overview.css";

type TaskCenterSectionProps = {
  data: TaskCenterResponse | null;
  error: string | null;
  isLoading: boolean;
  onRefresh(): void;
};

export function TaskCenterSection({ data, error, isLoading, onRefresh }: TaskCenterSectionProps): JSX.Element {
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const filteredTasks = useMemo(() => filterTasks(data?.tasks ?? [], taskFilter), [data, taskFilter]);
  const filterOptions = useMemo(() => getTaskFilterOptions(data), [data]);

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
          <TaskActivityPanel data={data} />

          <div className="task-summary-grid">
            <TaskSummaryCard label="运行中" value={data.runningCount} tone={data.runningCount > 0 ? "blue" : "neutral"} />
            <TaskSummaryCard label="疑似卡住" value={data.staleRunningCount} tone={data.staleRunningCount > 0 ? "amber" : "neutral"} />
            <TaskSummaryCard label="成功" value={data.successCount} tone="positive" />
            <TaskSummaryCard label="失败" value={data.failedCount} tone={data.failedCount > 0 ? "negative" : "neutral"} />
            <TaskSummaryCard label="记录数" value={data.totalCount} tone="neutral" />
            <TaskSummaryCard label="最近刷新" value={formatDateTime(data.generatedAt)} tone="neutral" />
          </div>

          <TaskFocusPanel data={data} />
          <PipelineGrid pipelines={data.pipelineSummaries} />

          {data.tasks.length === 0 ? (
            <EmptyState title="暂无任务记录" description="启动采集、同步基金目录或导入基金后，这里会显示任务进度和历史。" />
          ) : (
            <>
              <div className="task-record-toolbar">
                <div>
                  <h3>任务记录</h3>
                  <p>按最近开始时间排序，保留运行、成功和失败任务的原始线索。</p>
                </div>
                <SegmentedControl label="任务状态筛选" value={taskFilter} onChange={(value) => setTaskFilter(value as TaskFilter)} options={filterOptions} />
              </div>
              {filteredTasks.length === 0 ? (
                <EmptyState title="没有匹配任务" description="当前状态筛选下没有任务记录。" />
              ) : (
                <div className="task-list">
                  {filteredTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

function TaskActivityPanel({ data }: { data: TaskCenterResponse }): JSX.Element {
  const summary = buildTaskActivitySummary(data);

  return (
    <section className={`task-activity-panel task-activity-panel--${summary.tone}`} aria-label="后台活动概览">
      <div>
        <span className="task-activity-panel__eyebrow">后台活动</span>
        <h3>{summary.title}</h3>
        <p>{summary.description}</p>
      </div>
      <dl>
        <TaskMeta label="最近任务" value={summary.latestTaskLabel} />
        <TaskMeta label="当前状态" value={summary.activeLabel} />
        <TaskMeta label="管线覆盖" value={summary.pipelineLabel} />
        <TaskMeta label="状态生成" value={formatDateTime(data.generatedAt)} />
      </dl>
    </section>
  );
}

function TaskFocusPanel({ data }: { data: TaskCenterResponse }): JSX.Element {
  const activeTasks = data.activeTasks.slice(0, 4);
  const recentFailures = data.recentFailures.slice(0, 4);

  return (
    <div className="task-focus-grid">
      <TaskFocusColumn title="正在进行" emptyTitle="当前没有后台任务" tasks={activeTasks} />
      <TaskFocusColumn title="最近失败" emptyTitle="最近没有失败任务" tasks={recentFailures} />
    </div>
  );
}

function TaskFocusColumn({ title, emptyTitle, tasks }: { title: string; emptyTitle: string; tasks: RuntimeTask[] }): JSX.Element {
  return (
    <section className="task-focus-column">
      <h3>{title}</h3>
      {tasks.length === 0 ? (
        <p className="task-focus-column__empty">{emptyTitle}</p>
      ) : (
        <div className="task-focus-list">
          {tasks.map((task) => (
            <article key={task.id} className={`task-focus-item task-focus-item--${taskStatusTone(task)}`}>
              <div>
                <strong>{task.label}</strong>
                <span>{formatDateTime(task.startedAt)} / {formatDuration(task.durationMs)}</span>
              </div>
              <SignalBadge label={taskStatusLabel(task)} tone={taskStatusTone(task)} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PipelineGrid({ pipelines }: { pipelines: RuntimeTaskPipelineSummary[] }): JSX.Element {
  if (pipelines.length === 0) {
    return <EmptyState title="暂无任务管线" description="运行一次同步后会形成可追踪的数据管线。" />;
  }

  return (
    <section className="task-pipeline-section">
      <div className="task-section-heading">
        <h3>任务管线</h3>
        <p>按 vendor / dataset 汇总最近任务，适合判断哪个同步管线健康、失败或疑似卡住。</p>
      </div>
      <div className="task-pipeline-grid">
        {pipelines.map((pipeline) => (
          <PipelineCard key={pipeline.key} pipeline={pipeline} />
        ))}
      </div>
    </section>
  );
}

function PipelineCard({ pipeline }: { pipeline: RuntimeTaskPipelineSummary }): JSX.Element {
  return (
    <article className={`task-pipeline-card task-pipeline-card--${pipelineTone(pipeline)}`}>
      <header>
        <div>
          <strong>{pipeline.label}</strong>
          <span>{pipeline.vendor} / {pipeline.dataset}</span>
        </div>
        <SignalBadge label={pipelineStatusLabel(pipeline)} tone={pipelineTone(pipeline)} />
      </header>
      <dl>
        <TaskMeta label="最近开始" value={formatDateTime(pipeline.latestStartedAt)} />
        <TaskMeta label="最近成功" value={formatDateTime(pipeline.lastSuccessAt)} />
        <TaskMeta label="最近失败" value={formatDateTime(pipeline.lastFailureAt)} />
        <TaskMeta label="最近耗时" value={formatDuration(pipeline.latestDurationMs)} />
      </dl>
      <div className="task-pipeline-card__counts">
        <span>总计 {pipeline.totalCount}</span>
        <span>成功 {pipeline.successCount}</span>
        <span>失败 {pipeline.failedCount}</span>
        {(pipeline.runningCount > 0 || pipeline.staleRunningCount > 0) && <span>运行 {pipeline.runningCount + pipeline.staleRunningCount}</span>}
      </div>
      {pipeline.latestErrorMessage && <p>{pipeline.latestErrorMessage}</p>}
    </article>
  );
}

function TaskSummaryCard({ label, value, tone }: { label: string; value: number | string; tone: TaskTone }): JSX.Element {
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
