# 全局任务状态按钮信息密度验证报告

## 背景

任务中心页面已经能展示后台活动概览，但全局 header 的任务入口仍只有“任务正常 / 运行中 / 失败”等短状态。对真实用户来说，最近任务如果只藏在 `title` 里，仍然不够直观。本轮增强全局任务按钮的信息密度：桌面展示主状态和最近任务，小屏自动收敛为主状态。

## 职责边界

- `apps/web-shell`：增强业务状态入口 `TaskStatusButton` 的展示结构和样式。
- `packages/local-runtime`：未改动；任务状态事实仍来自 `/api/tasks`。
- `packages/market-domain`：未改动；继续使用既有 `TaskCenterResponse`。
- `packages/ui`：未改动；该按钮带业务语义，不下沉到通用 UI 包。

## 改动范围

- `apps/web-shell/src/features/chart-wall/components/task-center/task-status-button.tsx`
- `apps/web-shell/src/features/chart-wall/components/task-center/task-status-button.css`

按钮现在渲染：

- 主状态：任务正常、运行中 N、失败 N、疑似卡住 N、任务加载。
- 次状态：最近任务、点击查看、同步状态中等短信息。
- 小屏隐藏次状态，避免挤压搜索框和刷新按钮。

## 浏览器验证

验证地址：

```txt
http://127.0.0.1:5193/chart-wall
```

验证结果：

```json
{
  "desktop": {
    "width": 1440,
    "buttonText": "任务正常\n最近 全市场行情同步",
    "metaVisible": true,
    "overflow": false,
    "buttonWidth": 138.625
  },
  "mobile": {
    "width": 390,
    "buttonText": "任务正常",
    "metaVisible": false,
    "overflow": false,
    "buttonWidth": 68.921875
  },
  "errors": []
}
```

说明：

- 桌面端能直接看到最近任务。
- 移动端自动隐藏次状态。
- 两个视口都没有横向溢出。
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

- `lint:maintainability:guard` 通过。
- 没有触碰既有红区文件或 oversized 目录。
- 变更保持在业务 feature 组件内，未污染通用 UI 包。
- 按钮文件仍很小：`task-status-button.tsx` 84 行，`task-status-button.css` 79 行。
