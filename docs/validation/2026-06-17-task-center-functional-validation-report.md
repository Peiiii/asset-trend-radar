# Gold Insights 任务中心功能验证报告

验证时间：2026-06-17 CST

## 结论

本轮新增“任务中心”模块，用来解决后台任务不可见的问题。现在全市场行情同步、基金目录同步、基金走势导入都会进入本地 SQLite 任务记录，并通过 `/tasks` 页面展示运行状态、耗时、错误和 metadata。用户不需要猜系统是否正在同步，也能追溯最近任务历史。

这仍是阶段性增强，总目标继续推进。

## 实现范围

- 新增 `RuntimeTask`、`TaskCenterResponse` 领域契约。
- `SqliteIngestionJobRepository` 支持读取最近任务列表，并解析 `metadata_json`。
- 新增 `TaskCenterService`，把任务转换为 UI 友好的 label、耗时、运行中、疑似卡住等状态。
- 新增 `TasksController` 和 `/api/tasks?limit=80`。
- 侧边栏新增“任务中心”入口，对应 `/tasks`。
- 新增 `TaskCenterSection`，展示任务统计和任务列表。
- 前端任务中心每 3 秒自动轮询，运行中任务不需要手动刷新。
- 基金目录同步和基金走势导入纳入任务记录；原有全市场行情刷新继续复用任务表。
- smoke 新增 `/api/tasks` 验证，要求能看到全市场同步任务和基金导入任务。

## API 验证

请求：

```text
GET http://127.0.0.1:3193/api/tasks?limit=8
```

摘要结果：

```json
{
  "running": 0,
  "success": 8,
  "failed": 0,
  "stale": 0,
  "latestTask": {
    "label": "基金走势导入 000001",
    "status": "success",
    "vendor": "eastmoney",
    "dataset": "fund-import:000001",
    "durationMs": 6390,
    "metadata": {
      "code": "000001"
    }
  }
}
```

基金导入验证：

```json
{
  "imported": {
    "id": "fund-cn-000001",
    "barsImported": 756
  },
  "latestTasks": [
    {
      "label": "基金走势导入 000001",
      "status": "success",
      "dataset": "fund-import:000001",
      "metadata": {
        "code": "000001"
      },
      "durationMs": 6390,
      "error": null
    }
  ]
}
```

## 浏览器验证

验证地址：

```text
http://127.0.0.1:5193/tasks
```

DOM 抽查：

```json
{
  "url": "http://127.0.0.1:5193/tasks",
  "title": "任务中心",
  "navActive": "任务中心",
  "summary": ["运行中0", "疑似卡住0", "成功15", "失败0", "最近刷新06/17 01:42"],
  "taskCards": 15,
  "successCards": 15,
  "runningCards": 0,
  "firstTask": "成功基金走势导入 000001..."
}
```

## 自动化验证

已通过：

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
pnpm build
pnpm smoke
```

`pnpm smoke` 结果摘要：

```json
{
  "status": "passed",
  "assetCount": 132,
  "barCount": 162309,
  "chartWallItems": 111,
  "fundItems": 69,
  "commodityItems": 12,
  "fundCatalogCount": 27018,
  "taskCenter": {
    "tasks": 4,
    "runningCount": 0,
    "failedCount": 0
  }
}
```

本次 smoke 也修正并覆盖了一个 readiness 问题：基金目录/基金导入也进入任务表后，Data Health 的 `latestJob` 必须继续表示全市场行情同步任务，否则测试和页面可能把基金目录同步误判为行情同步完成。当前已改为只读取 `multi-source / global-bars-1d` 的最新行情同步任务，任务中心则展示全部任务。

## 维护性说明

- 后端任务查询放在 `TaskCenterService`，controller 只负责 query 参数和 JSON 输出。
- app 只负责 `/tasks` 路由、轮询 hook 和展示，不读取 SQLite。
- 任务状态事实来自本地 `ingestion_jobs`，不是前端猜测。
- `fund-discovery.service.ts` 当前 359 行，已接近 360 行阈值；下一轮涉及基金导入或同步时应优先拆分基金任务记录/导入编排，避免继续增长。
