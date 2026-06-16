# 后台刷新任务启动验证报告

## 变更范围

- 新增 `RuntimeTaskStartResponse` / `RuntimeTaskStartStatus` 领域 contract。
- `IngestionWorkerService` 支持后台启动全市场同步，并记录当前运行中的 task id。
- 新增 `POST /api/refresh/start`，快速返回 `taskId/status`，保留原有 `POST /api/refresh` 同步等待语义。
- 前端刷新按钮和任务中心启动同步改为调用后台启动接口，由任务中心轮询展示进度。
- package/app 边界契约补充：长任务按钮应快速返回 task id，进度交给任务中心。

## 自动化验证

```txt
pnpm typecheck
passed

pnpm lint
passed

pnpm lint:maintainability:guard
passed

pnpm lint:maintainability:hotspots
passed
- oversizedSourceFiles: 3, same as baseline
- oversizedDirectories: 1, same as baseline

pnpm build
passed

pnpm smoke
passed
- assetCount: 154
- chartWallItems: 133
- fundCatalogCount: 27018
- taskCenter.tasks: 4
- taskCenter.runningCount: 0
- taskCenter.failedCount: 0
- taskCenter.pipelineSummaries: 3
```

## 接口专项验证

请求：

```txt
POST http://127.0.0.1:3193/api/refresh/start
```

结果：

```json
{
  "generatedAt": "2026-06-16T22:10:40.435Z",
  "taskId": "global-daily-1781647840416",
  "status": "accepted",
  "label": "全市场行情同步",
  "message": "全市场行情同步已在后台启动"
}
```

- HTTP status: `202`
- elapsedMs: `51`
- 随后 `GET /api/tasks?limit=5` 显示 `runningCount: 1`，`activeTasks[0].id` 与返回的 `taskId` 一致。

重复请求：

```json
{
  "taskId": "global-daily-1781647840416",
  "status": "already_running",
  "label": "全市场行情同步",
  "message": "全市场行情同步已在后台运行"
}
```

- 重复启动不会新开第二个同步任务。
- `runningCount` 保持为 `1`。

## 浏览器验证

URL: `http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d`

后台任务运行时：

- 全局提示条数量：`1`。
- 提示条文案：`1 个后台任务正在运行 ... 运行中 · 全市场行情同步`。
- 顶部任务按钮文案：`运行中 1 ... 运行 1 卡住 0 失败 0`。
- 控制台错误数：`0`。

页面刷新按钮链路：

- DOM 可见节点中 `aria-label="刷新数据"` 的按钮唯一。
- 点击后页面出现后台运行提示条。
- 顶部任务按钮同步显示 running=1。
- 页面没有出现 `刷新失败` / `接口请求失败`。
- 控制台错误数：`0`。

## 维护性结论

- 新增后台启动语义放在 `market-domain` contract 与 `local-runtime` service/controller 中，前端只消费 API。
- 原同步刷新接口保留，避免破坏 smoke 和脚本语义。
- 没有新增红区文件或扩大既有红区。
- 本轮触及 runtime 和前端查询路径，已按规则完成 typecheck、lint、maintainability guard、build、smoke 与浏览器验证。
