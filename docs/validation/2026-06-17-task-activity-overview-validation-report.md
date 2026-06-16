# 任务活动概览与组件维护性验证报告

## 背景

任务中心已经能展示后台同步、基金目录、基金导入和刷新任务。但用户进入页面后，仍需要自己扫摘要卡、任务管线和任务记录，才能判断“现在后台到底有没有事”。本轮补齐顶部活动概览，并把任务中心的展示映射逻辑从组件中抽离，降低后续继续增强任务模块时的维护成本。

## 职责边界

- `packages/local-runtime`：未改动；任务运行、失败、疑似卡住和管线摘要仍由 `TaskCenterService` 形成。
- `packages/market-domain`：未改动；继续使用既有 `TaskCenterResponse`、`RuntimeTask`、`RuntimeTaskPipelineSummary` 契约。
- `apps/web-shell`：新增任务活动概览和展示工具函数，只负责页面展示、label、tone、筛选和格式化。
- `packages/ui`：未改动；继续使用既有 Button、SegmentedControl、SignalBadge 等基础组件。

本轮没有 deep import，没有让前端重新推导后端业务事实。

## 改动范围

- 新增 `apps/web-shell/src/features/chart-wall/components/task-center/task-center.utils.ts`
- 更新 `apps/web-shell/src/features/chart-wall/components/task-center/task-center-section.tsx`
- 更新 `apps/web-shell/src/features/chart-wall/components/task-center/task-center-overview.css`

维护性变化：

```txt
task-center-section.tsx: 318 -> 241
task-center.utils.ts: 159
task-center-overview.css: 292
```

`task-center-section.tsx` 从接近阈值降到 241 行，后续任务中心继续增强时可以复用 `task-center.utils.ts` 的状态 label、tone、筛选和格式化函数。

## 功能验证

浏览器验证地址：

```txt
http://127.0.0.1:5193/tasks
```

验证结果：

```json
{
  "url": "http://127.0.0.1:5193/tasks",
  "hasActivityPanel": true,
  "showsState": true,
  "showsLatestTask": true,
  "showsPipelineCoverage": true,
  "keepsTaskRecords": true,
  "panelClass": "task-activity-panel task-activity-panel--positive",
  "errors": []
}
```

说明：

- 页面顶部新增“后台活动”概览。
- 当前无运行中和失败任务时，显示 positive 状态。
- 概览展示当前状态、最近任务、管线覆盖和状态生成时间。
- 原有任务管线和任务记录仍正常展示。
- 浏览器 console/page error 为空。

## 命令验证

```bash
pnpm typecheck
pnpm lint:maintainability:guard
pnpm lint
pnpm build
pnpm smoke
```

结果：

- `pnpm typecheck`：通过。
- `pnpm lint:maintainability:guard`：通过。
- `pnpm lint`：通过。
- `pnpm build`：通过。
- `pnpm smoke`：通过。

smoke 关键摘要：

```json
{
  "chartWallItems": 111,
  "fundItems": 69,
  "commodityItems": 12,
  "fundCatalogCount": 27018,
  "taskCenter": {
    "tasks": 4,
    "totalCount": 4,
    "runningCount": 0,
    "failedCount": 0,
    "activeTasks": 0,
    "recentFailures": 0,
    "pipelineSummaries": 3
  }
}
```

## 维护性结论

- `lint:maintainability:guard` 通过，治理 backlog 没有增长。
- 没有触碰既有红区文件。
- `task-center-section.tsx` 明显变小，任务状态展示口径更集中。
- `task-center-overview.css` 为 292 行，guard 提示接近 360 行阈值；后续如果继续增强任务中心视觉，应优先拆分 overview CSS，避免形成新的红区。
