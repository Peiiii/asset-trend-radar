# 任务中心全局计数可靠性验证报告

## 背景

任务中心需要回答“后台到底有没有任务在跑、有没有失败、有没有卡住”。此前 `runningCount`、`successCount`、`failedCount`、`staleRunningCount` 从最近任务列表派生，`limit` 变小时可能低估全局状态。本轮将总览统计与任务记录分页分离。

## 边界说明

- `packages/data-storage`：新增 SQLite 层任务状态聚合、运行中任务查询、按状态查询最近任务。
- `packages/local-runtime`：`TaskCenterService` 使用全局聚合作为任务中心总览事实，`limit` 只影响 `tasks` 列表。
- `packages/market-domain`：无新增 API 字段；继续使用既有 `TaskCenterResponse` 契约。
- `apps/web-shell`：未改动；前端继续消费 `/api/tasks`，不自行推断后台任务状态。

## API 验证

对比：

```txt
GET /api/tasks?limit=40
GET /api/tasks?limit=1
```

结果摘要：

```json
{
  "wide": {
    "tasks": 22,
    "totalCount": 22,
    "runningCount": 0,
    "successCount": 22,
    "failedCount": 0,
    "staleRunningCount": 0,
    "activeTasks": 0,
    "recentFailures": 0,
    "latestTask": "全市场行情同步"
  },
  "tiny": {
    "tasks": 1,
    "totalCount": 22,
    "runningCount": 0,
    "successCount": 22,
    "failedCount": 0,
    "staleRunningCount": 0,
    "activeTasks": 0,
    "recentFailures": 0,
    "latestTask": "全市场行情同步"
  },
  "countsMatch": true
}
```

## 浏览器验证

地址：

```txt
http://127.0.0.1:5193/tasks
```

结果摘要：

```json
{
  "hasTaskCenter": true,
  "hasActivityPanel": true,
  "hasPipelineGrid": true,
  "taskCardCount": 22,
  "pipelineCardCount": 2,
  "statusButtonText": "任务正常最近 全市场行情同步运行 0卡住 0失败 0",
  "summaries": ["运行中0", "疑似卡住0", "成功22", "失败0", "记录数22", "最近刷新06/17 06:37"],
  "errorLogs": []
}
```

## Smoke 覆盖

`scripts/smoke/functional-smoke.mjs` 新增断言：

- `limit=1` 只收窄 `tasks` 列表。
- `totalCount`、`runningCount`、`successCount`、`failedCount`、`staleRunningCount` 不受列表 limit 影响。

## 维护性结论

- 任务事实仍在 local runtime 汇总，前端没有新增业务推断。
- 存储层只提供查询和聚合能力，不知道页面展示逻辑。
- `scripts/smoke/functional-smoke.mjs` 增至 318 行，仍低于 360 行阈值，但后续继续扩展时应拆分场景脚本。
