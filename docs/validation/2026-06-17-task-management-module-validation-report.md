# 任务管理模块验证报告

## 背景

用户需要能发现后台是否有同步、导入、刷新等任务正在运行，避免本地应用看起来像“没有反应”。本轮把原有任务中心从状态看板增强为任务管理入口：后端返回可运行任务动作，前端展示任务操作台，并把启动动作、最近状态、运行中/失败/卡住信号放在同一页面。

## 边界

- `packages/market-domain`：新增任务动作 contract：`RuntimeTaskAction`、`RuntimeTaskActionKey`、`RuntimeTaskActionStatus`。
- `packages/local-runtime`：`TaskCenterService` 负责定义本地 runtime 支持的后台动作，并从 SQLite ingestion jobs 映射最近状态。
- `apps/web-shell`：新增任务操作台组件与任务动作 hook，只负责调用 API、展示按钮、展示最近状态。
- `packages/data-storage`：未改动，继续使用现有 ingestion job repository。

## 功能验证

### API

请求：

```bash
curl -s 'http://127.0.0.1:3193/api/tasks?limit=2'
```

结果摘要：

```json
{
  "hasActions": true,
  "actions": [
    {
      "key": "refresh-global-bars",
      "label": "全市场行情同步",
      "status": "running",
      "isRunning": true,
      "isStale": false
    },
    {
      "key": "sync-fund-catalog",
      "label": "东方财富基金目录同步",
      "status": "idle",
      "isRunning": false,
      "isStale": false
    }
  ]
}
```

### 浏览器

地址：`http://127.0.0.1:5193/tasks`

页面验证结果：

- 出现 `任务操作台`。
- 出现 `全市场行情同步` 与 `东方财富基金目录同步` 两个动作。
- 全市场同步运行中时，按钮显示 `执行中` 并禁用。
- 操作卡展示最近开始、最近结束、最近耗时、任务 ID。
- 任务中心仍展示后台活动、任务管线、任务记录、轮询状态。

## 回归验证

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
pnpm build
pnpm smoke
```

`pnpm smoke` 已补充断言：

- `/api/tasks` 返回 `actions`。
- `limit=1` 只限制任务记录，不影响 actions。
- 存在 `refresh-global-bars` 动作。
- 存在 `sync-fund-catalog` 动作。

第二轮 smoke 结果摘要：

```json
{
  "status": "passed",
  "assetCount": 154,
  "barCount": 204307,
  "chartWallItems": 133,
  "fundItems": 80,
  "commodityItems": 34,
  "fundCatalogCount": 27010,
  "taskCenter": {
    "tasks": 4,
    "totalCount": 4,
    "runningCount": 0,
    "failedCount": 0,
    "pipelineSummaries": 3,
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
}
```

## 维护性结论

- 新增任务动作事实放在 `market-domain` 与 `local-runtime`，前端不硬编码任务状态来源。
- 新增 `TaskActionPanel` 与 `useTaskActions`，避免继续扩大 `TaskCenterSection` 和 `chart-wall-page.tsx`。
- 触碰红区 `chart-wall-page.tsx`，行数约 800，仍处于 adopted baseline 内。
- `lint:maintainability:guard` 通过，红区数量未增长。
