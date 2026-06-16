# 任务管理模块功能验证报告

日期：2026-06-17

## 背景

用户提出：本地后台如果有同步、基金目录、基金导入或刷新任务在运行，页面需要能发现到，否则用户不知道系统到底有没有在做事。

本次实现把任务管理定位为两层体验：

- 顶部全局任务状态灯：用户在任意页面都能看到“运行中 / 疑似卡住 / 失败 / 正常”。
- 任务中心页面：用于排查后台任务、任务管线健康、最近失败和原始任务记录。

## 职责边界

- `packages/market-domain`：扩展 `TaskCenterResponse` 契约，新增 `RuntimeTaskPipelineSummary`、`totalCount`、`activeTasks`、`recentFailures`、`pipelineSummaries`。
- `packages/local-runtime`：由 `TaskCenterService` 汇总 ingestion jobs，后端负责判定运行中、疑似卡住、最近失败和管线状态。
- `apps/web-shell`：只做页面组合、状态筛选和展示，不重新推导任务业务事实。
- `packages/ui`：复用既有 `Button`、`SegmentedControl`、`SignalBadge`、状态组件。

本次没有引入新的边界，符合 `docs/designs/2026-06-16-package-app-boundary-contract.md`。

## 功能点

1. 任务中心 API 返回任务总数、活跃任务、最近失败和任务管线摘要。
2. 任务管线按 `vendor / dataset` 聚合，可看到全市场同步、基金导入等独立管线。
3. 管线卡片展示最近开始、最近成功、最近失败、最近耗时和成功/失败/运行计数。
4. 任务中心页面新增“正在进行”和“最近失败”焦点区，避免用户只看到长列表。
5. 任务记录支持按全部、运行中、疑似卡住、失败、成功筛选。
6. 顶部状态灯继续全局显示后台任务状态，并可跳转任务中心。
7. task 相关组件移动到 `components/task-center/` role folder，避免继续扩大组件根目录。
8. task center CSS 拆分为 section 和 overview，满足 maintainability guard 文件大小约束。
9. smoke 脚本新增任务中心 contract 断言，覆盖 `totalCount`、`activeTasks`、`recentFailures`、`pipelineSummaries`。

## API 验证

当前本地 runtime：`http://127.0.0.1:3193`

命令：

```bash
curl -s 'http://127.0.0.1:3193/api/tasks?limit=20'
```

摘要结果：

```json
{
  "totalCount": 17,
  "returnedTasks": 17,
  "runningCount": 1,
  "failedCount": 0,
  "staleRunningCount": 0,
  "activeTasks": 1,
  "recentFailures": 0,
  "pipelineSummaries": 2,
  "latestTask": "全市场行情同步"
}
```

在 runtime 刚重启并触发同步时，API 返回的管线摘要包含：

```json
{
  "totalCount": 17,
  "runningCount": 1,
  "activeTasks": 1,
  "pipelineSummaries": 2,
  "latestTask": "全市场行情同步",
  "firstPipeline": {
    "key": "multi-source:global-bars-1d",
    "status": "running",
    "runningCount": 1,
    "successCount": 14
  }
}
```

这证明后台同步进行中时，任务模块可以被前端发现。

## 页面验证

地址：`http://127.0.0.1:5193/tasks`

使用本机 Chrome + Playwright 验证：

```json
{
  "url": "http://127.0.0.1:5193/tasks",
  "hasTaskCenter": true,
  "hasRunningSummary": true,
  "hasPipeline": true,
  "hasTaskRecords": true,
  "hasFilterAll": true,
  "hasActivePanel": true,
  "hasRecentFailurePanel": true,
  "errors": [],
  "failedFilterResponds": true
}
```

页面上可见：

- 左侧导航“任务中心”可进入。
- 顶部任务状态灯显示“任务正常”或运行/失败状态。
- 任务中心展示摘要卡、正在进行、最近失败、任务管线、任务记录。
- 点击“失败”筛选时，列表响应为空状态或失败任务列表。

## 自动化验证

已执行：

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
pnpm build
pnpm smoke
```

关键结果：

- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- `pnpm lint:maintainability:guard`：通过。
- `pnpm build`：通过。
- `pnpm smoke`：通过。

补强后的 smoke 输出中，任务中心部分为：

```json
{
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

- 没有新增 package deep import。
- 业务事实仍在 `local-runtime` class service 内形成，app 不承担任务状态口径。
- 新增 task CSS 文件均低于 360 行；`task-center-section.tsx` 为 318 行，guard 提示 nearing limit，但未超线。
- 已知 red-zone 数量未增加：oversizedSourceFiles 仍为 3，oversizedDirectories 仍为 1。

## 结论

任务管理模块已可用：用户可以在任意页面通过全局任务状态灯发现后台任务，也可以进入任务中心查看管线健康、运行状态、失败信息和任务记录。
