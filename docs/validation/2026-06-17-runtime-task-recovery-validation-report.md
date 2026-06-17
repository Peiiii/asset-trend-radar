# Runtime 任务恢复验证报告

## 背景

任务中心需要准确回答“后台到底有没有任务在同步”。本地 runtime 如果在全市场同步期间被关闭，SQLite 里会残留 `status='running'` 的任务。此前这类孤儿任务会长期显示为 `疑似卡住`，即使后续同步已经成功完成，用户仍会看到误导性的后台状态。

## 边界

- `packages/data-storage`：`SqliteIngestionJobRepository` 新增批量失败收尾能力。
- `packages/local-runtime`：新增 `RuntimeTaskRecoveryService`，在 runtime 启动时恢复上次进程遗留的 running 任务。
- `apps/web-shell`：未改动；任务中心继续只消费 `/api/tasks` 返回的事实。
- `packages/market-domain`：未改动；任务状态 contract 保持兼容。

## 功能验证

启动新 runtime 前，真实本地库存在 1 条 stale running 任务：

```json
{
  "running": 0,
  "stale": 1,
  "failed": 0,
  "active": [
    {
      "id": "global-daily-1781652622152",
      "status": "running",
      "isStale": true,
      "label": "全市场行情同步"
    }
  ]
}
```

重启 runtime 后，启动日志显示：

```txt
Recovered 1 interrupted runtime task(s).
Gold Insights local runtime listening at http://127.0.0.1:3193
```

随后查询：

```bash
curl -s 'http://127.0.0.1:3193/api/tasks?limit=5'
```

结果摘要：

```json
{
  "running": 0,
  "stale": 0,
  "failed": 1,
  "latest": {
    "id": "global-daily-1781654774722",
    "status": "success",
    "durationMs": 95909,
    "error": null
  },
  "failures": [
    {
      "id": "global-daily-1781652622152",
      "error": "runtime restarted before task finished"
    }
  ]
}
```

结论：旧 running 任务不会继续误报为疑似卡住，而是转成带错误原因的失败历史；新 runtime 的真实同步任务仍能正常运行并成功收尾。

## 回归验证

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
pnpm build
pnpm smoke
```

`scripts/smoke/functional-smoke.mjs` 已补充断言：干净 smoke runtime 完成后 `taskCenter.staleRunningCount === 0`。

本轮 smoke 结果中任务中心摘要：

```json
{
  "runningCount": 0,
  "staleRunningCount": 0,
  "failedCount": 0,
  "actions": [
    {
      "key": "refresh-global-bars",
      "status": "success",
      "isRunning": false
    },
    {
      "key": "sync-fund-catalog",
      "status": "success",
      "isRunning": false
    }
  ]
}
```

## 维护性结论

- 恢复逻辑放在 `packages/local-runtime` 的 class service 中，数据库更新能力放在 `packages/data-storage` repository 中。
- 前端没有新增推断逻辑，仍以 `/api/tasks` 为任务事实来源。
- 未触碰现有红区文件，`lint:maintainability:guard` 通过。
