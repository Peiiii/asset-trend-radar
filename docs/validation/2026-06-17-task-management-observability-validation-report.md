# 任务管理可观测性增强验证报告

## 背景

本轮目标是让后台同步任务更容易被发现和判断：用户在主工作区不用猜后台是否正在同步，进入任务中心后也能快速看到运行、疑似卡住、失败和任务管线状态。

## 职责边界

- `apps/web-shell`：增强全局任务入口和任务中心首屏展示。
- `packages/local-runtime`：未改动，任务事实仍来自 `/api/tasks`。
- `packages/market-domain`：未改动，继续复用 `TaskCenterResponse`、`RuntimeTask` 和 `RuntimeTaskPipelineSummary`。
- `packages/data-storage`：未改动，任务记录仍来自 SQLite ingestion jobs。

## 变更范围

- `TaskStatusButton` 增加运行、卡住、失败三组关键计数。
- 任务状态按钮的 title 同步补充计数和轮询信息，方便 hover 或辅助技术读取。
- 任务中心“后台活动”首屏增加运行中、疑似卡住、失败、总记录四个指标。
- 新增 `task-activity-metrics.css`，避免继续扩大 `task-center-overview.css`。

## 功能验证

### API

手动读取 `/api/tasks?limit=10`：

```json
{
  "total": 20,
  "running": 0,
  "stale": 0,
  "failed": 0,
  "pipelines": 2,
  "latest": "全市场行情同步",
  "active": 0
}
```

### 浏览器验证

主页面顶部任务入口：

```json
{
  "buttonText": "任务正常最近 全市场行情同步运行 0卡住 0失败 0",
  "metrics": ["运行 0", "卡住 0", "失败 0"],
  "title": "最近任务: 全市场行情同步，运行 0，失败 0，3s轮询",
  "visible": true
}
```

任务中心页面：

```json
{
  "heading": "任务中心",
  "metrics": ["运行中0", "疑似卡住0", "失败0", "总记录20"],
  "cards": 20,
  "pipelines": 2,
  "actionButtons": ["启动同步", "刷新任务"],
  "activityVisible": true
}
```

## 自动验证

- `pnpm typecheck`：通过。
- `pnpm lint:maintainability:guard`：通过。
- `pnpm lint`：通过。
- `pnpm build`：通过。
- `pnpm smoke`：通过。

`pnpm smoke` 任务中心结果：

```json
{
  "tasks": 4,
  "totalCount": 4,
  "runningCount": 0,
  "failedCount": 0,
  "activeTasks": 0,
  "recentFailures": 0,
  "pipelineSummaries": 3
}
```

## 维护性结论

- 没有新增红区文件或红区目录。
- `task-center-overview.css` 保持 292 行，没有因为新增指标接近 360 行上限。
- 新增样式拆分到小文件，任务首屏指标的职责更清晰。
- 本轮没有触碰既有红区文件。
