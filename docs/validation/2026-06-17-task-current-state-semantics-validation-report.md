# 任务中心当前状态语义验证报告

## 背景

任务管理模块需要回答“后台现在有没有任务在跑、有没有卡住、是不是当前异常”。验证时发现一个体验问题：最新全市场同步已经成功，但因为历史上存在一次失败，顶部任务按钮仍显示负面状态，任务中心总览也提示失败。这会让用户误以为后台当前仍异常。

## 本轮调整

- `apps/web-shell`：新增 `hasCurrentTaskFailure` 展示判断，区分“最新任务失败”和“历史失败记录”。
- 全局任务按钮：只有运行中、疑似卡住、最新失败、任务接口失败才展示异常语义。
- 任务中心总览：当前空闲且最新任务成功时显示“后台空闲，任务正常”；历史失败仍在总览描述、失败计数和任务记录中可追溯。
- 后端 contract 未改动，任务事实继续来自 `packages/local-runtime` 的 `/api/tasks`。

## 边界确认

- `packages/market-domain`：未改动，现有 `TaskCenterResponse` 已包含判断所需事实。
- `packages/local-runtime`：未改动，继续负责 SQLite 任务记录聚合。
- `apps/web-shell`：只调整任务状态解释和展示文案，没有自造任务事实。
- `packages/ui`：未改动。

## 浏览器验证

地址：`http://127.0.0.1:5193/tasks`

接口事实：

- `/api/tasks?limit=3` 返回 `runningCount: 0`
- `staleRunningCount: 0`
- `failedCount: 1`
- `latestTask.status: success`
- `latestTask.label: 全市场行情同步`

页面验证结果：

```json
{
  "statusButton": "任务正常最近 全市场行情同步运行 0卡住 0历史失败 1",
  "activityPanel": "后台空闲，任务正常 当前没有运行中、卡住或最新失败任务，历史失败 1 个仍可追溯。",
  "hasTaskActionPanel": true,
  "summaryCards": ["运行中0", "疑似卡住0", "成功25", "失败1", "记录数26"]
}
```

结论：

- 当前无后台任务时，全局入口不会误报当前异常。
- 历史失败没有丢失，仍能在任务中心记录、失败筛选、任务管线中追溯。
- 任务操作台仍可见，用户可以启动全市场同步或基金目录同步。

## 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
```

## 维护性

- 本轮只触碰 `task-center` role folder 内的两个小文件。
- 未新增 package deep import。
- 未新增 oversized file 或 oversized directory。
- `lint:maintainability:guard` 已通过，治理 backlog 数量未增加。
