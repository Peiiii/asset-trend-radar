# Gold Insights 全局任务状态入口验证报告

验证时间：2026-06-17 CST

## 结论

任务中心已经从“独立页面”升级为“全局可发现状态”。用户在图表墙、基金目录、详情页等任意主工作区顶部都能看到后台任务状态，并一键进入任务中心，不需要猜后台是否正在同步。

## 实现范围

- 新增 `TaskStatusButton` 组件。
- Header 右侧新增全局任务状态按钮。
- `useTaskCenterQuery` 改为在 `ChartWallPage` 全局启用一次，任务中心页面复用同一份数据，避免重复轮询。
- 状态语义：
  - 有疑似卡住任务：显示 `疑似卡住 N`，amber。
  - 有运行中任务：显示 `运行中 N`，blue。
  - 有失败任务：显示 `失败 N`，negative。
  - 无异常：显示 `任务正常`，positive。
  - 加载中：显示 `任务加载`。
- 点击任务状态按钮进入 `/tasks`。

## 浏览器验证

验证地址：

```text
http://127.0.0.1:5193/chart-wall
```

Header 初次加载：

```json
{
  "taskButtonText": "任务加载",
  "taskButtonClass": "task-status-button task-status-button--neutral",
  "taskButtonTitle": "点击查看任务中心"
}
```

任务数据加载后：

```json
{
  "taskButtonText": "任务正常",
  "taskButtonClass": "task-status-button task-status-button--positive",
  "taskButtonTitle": "最近任务: 基金走势导入 000001",
  "url": "http://127.0.0.1:5193/chart-wall"
}
```

点击任务状态按钮后：

```json
{
  "url": "http://127.0.0.1:5193/tasks",
  "h1": "任务中心",
  "navActive": "任务中心",
  "summary": ["运行中0", "疑似卡住0", "成功15", "失败0", "最近刷新06/17 01:57"],
  "taskCards": 15
}
```

## 自动化验证

已通过：

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
pnpm build
```

本轮只改前端全局入口和验证文档，没有改变后端任务数据契约；上一轮已经用 `pnpm smoke` 验证 `/api/tasks`、基金导入任务和全市场同步任务。

## 维护性说明

- 主页面只组合 `TaskStatusButton`，状态文案和颜色收敛在独立组件。
- 任务事实仍来自 `/api/tasks`，前端不猜测任务状态。
- 没有新增跨 package deep import。
