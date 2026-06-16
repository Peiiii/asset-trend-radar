# 任务可观测轮询状态验证报告

## 背景

任务中心已有 `/api/tasks`、任务管线、运行中/失败/疑似卡住状态和全局任务状态入口。本轮补齐“页面是否正在持续检查后台任务”的可见性，避免用户看到一个任务列表却不知道它是不是实时状态。

## 职责边界

- `packages/local-runtime`：未改动，任务事实继续由 `/api/tasks` 和 `TaskCenterService` 负责。
- `packages/market-domain`：未改动，继续使用既有 `TaskCenterResponse` 契约。
- `apps/web-shell`：增强任务查询 hook 和展示层，显示轮询间隔、最近拉取时间、后端生成时间。

## 功能变化

- `useTaskCenterQuery` 暴露 `isPolling`、`lastLoadedAt`、`pollIntervalMs`。
- 顶部 `TaskStatusButton` 的 title 带上轮询状态，错误态带上最近成功拉取时间。
- 任务中心“后台活动”面板新增：
  - 轮询状态，例如 `3s 自动轮询`
  - 最近拉取
  - 后端生成
- 任务事实不在前端重算；前端只展示查询状态与后端返回结果。

## 后端接口验证

```json
{
  "totalCount": 19,
  "runningCount": 0,
  "staleRunningCount": 0,
  "failedCount": 0,
  "pipelines": 2,
  "latestTask": "全市场行情同步",
  "activeTasks": 0,
  "recentFailures": 0
}
```

## 浏览器验证

地址：`http://127.0.0.1:5193/tasks`

页面可见文本包含：

- `任务中心`
- `任务正常`
- `后台活动`
- `轮询状态`
- `3s 自动轮询`
- `最近拉取`
- `后端生成`
- `任务管线`

控制台只出现 React Router v7 future flag warning，未发现本轮改动导致的 error。

## 命令验证

```txt
pnpm typecheck
pnpm lint:maintainability:guard
pnpm lint
pnpm build
pnpm smoke
curl -s 'http://127.0.0.1:3193/api/tasks?limit=10'
```

结果：

- `pnpm typecheck` 通过。
- `pnpm lint:maintainability:guard` 通过。
- `pnpm lint` 通过。
- `pnpm build` 通过。
- `pnpm smoke` 通过，输出 `status: passed`。
- `/api/tasks` 能返回任务总数、运行中、失败、疑似卡住、管线摘要、最近任务。

## 维护性结论

- 新增状态集中在 `useTaskCenterQuery`，任务 UI 只消费明确 props。
- 未新增跨 package deep import。
- 触碰红区 `chart-wall-page.tsx`，仅增加任务组件传参 6 行，仍在 adopted baseline 内。
- `task-center-section.tsx` 247 行、`task-status-button.tsx` 92 行、`use-task-center-query.ts` 74 行，均低于单文件硬限制。
