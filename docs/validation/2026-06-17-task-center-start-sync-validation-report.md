# 任务中心启动同步功能验证报告

## 背景

任务中心已经能展示后台任务、自动轮询和任务管线。本轮补齐“可操作性”：用户进入任务中心后，不仅能看到后台有没有同步任务，还能直接启动一次全市场同步，并在同一页面看到运行中状态。

## 职责边界

- `packages/local-runtime`：未改动。真实同步仍由既有 `POST /api/refresh` 触发，任务事实仍写入 ingestion jobs 并由 `/api/tasks` 汇总。
- `packages/market-domain`：未改动。没有新增前端自造任务状态字段。
- `apps/web-shell`：任务中心新增启动同步按钮，复用既有 chart wall refresh 行为；同步结束后主动刷新任务中心状态。

## 功能变化

- 任务中心头部新增 `启动同步` 主操作。
- 点击后按钮进入 `同步中` disabled 状态。
- 顶部全局任务状态灯同步显示 `运行中 1 / 全市场行情同步`。
- 同步完成后按钮恢复 `启动同步`，任务状态恢复 `任务正常`。
- 全局刷新完成后会 reload 任务中心数据，避免任务状态滞后。

## 浏览器验证

地址：`http://127.0.0.1:5193/tasks`

初始状态：

```json
{
  "h1": "任务中心",
  "startButtonText": "启动同步",
  "startButtonDisabled": false,
  "refreshButtonText": "刷新任务",
  "hasPolling": true,
  "hasTaskPipeline": true
}
```

点击 `启动同步` 后：

```json
{
  "startButtonText": "同步中",
  "startButtonDisabled": true,
  "statusButtonText": "运行中 1全市场行情同步",
  "hasSyncingText": true,
  "hasPolling": true
}
```

同步结束后：

```json
{
  "startButtonText": "启动同步",
  "startButtonDisabled": false,
  "statusButtonText": "任务正常最近 全市场行情同步",
  "hasRunningZero": true,
  "hasPolling": true,
  "hasLatestTask": true
}
```

浏览器控制台只出现 React Router v7 future flag warning，未出现本轮改动导致的 error。

## 接口验证

同步完成后 `/api/tasks?limit=8` 返回：

```json
{
  "totalCount": 20,
  "runningCount": 0,
  "staleRunningCount": 0,
  "failedCount": 0,
  "pipelines": 2,
  "latestTask": "全市场行情同步",
  "latestStatus": "success",
  "activeTasks": 0,
  "recentFailures": 0
}
```

## 命令验证

```txt
pnpm typecheck
pnpm lint:maintainability:guard
pnpm lint
pnpm build
pnpm smoke
```

结果：

- `pnpm typecheck` 通过。
- `pnpm lint:maintainability:guard` 通过。
- `pnpm lint` 通过。
- `pnpm build` 通过。
- `pnpm smoke` 通过，输出 `status: passed`。

## 维护性结论

- 只改 app 交互层，未改变后端任务事实口径。
- `TaskCenterSection` 继续位于 task-center role folder，没有新增组件根目录 peer 文件。
- `task-center-section.tsx` 为 255 行，`task-center-section.css` 为 259 行，均低于 360 行限制。
- 触碰红区 `chart-wall-page.tsx`，仅用于把既有 `refresh` 接入任务中心并在完成后刷新任务状态，`lint:maintainability:guard` 已通过。
