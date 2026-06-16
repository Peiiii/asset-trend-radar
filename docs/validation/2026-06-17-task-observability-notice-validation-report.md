# 任务可观测提示与基金目录收口验证报告

## 变更范围

- 新增全局后台活动提示条：运行中、疑似卡住、任务接口异常时在非任务页展示。
- 保留任务中心页面作为完整审计视图：后台活动、任务管线、任务记录、状态筛选。
- 补充任务管理模块在 package/app 边界契约中的职责划分。
- 收口基金目录行组件抽取，修复半成品导致的按钮文案风险，并支持当前排序列高亮。
- 将图表墙页面选项常量迁移到 feature config，降低 `chart-wall-page.tsx` 红区体积。

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
- chart-wall-page.tsx: 816 lines
- oversized source files: 3, same as baseline
- oversized directories: 1, same as baseline

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

## 浏览器功能验证

### 任务中心页

URL: `http://127.0.0.1:5193/tasks`

- 页面标题为 `任务中心`。
- `后台活动`、`任务管线`、`任务记录` 均已渲染。
- 顶部任务按钮展示 `任务正常`，运行、卡住、失败均为 0。
- 空闲状态下任务页不重复展示全局活动提示条。
- 控制台错误数：0。

### 图表墙空闲状态

URL: `http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d`

- 图表墙正常渲染 `走势总览`。
- 顶部任务按钮可见并展示任务状态。
- 没有运行中任务时，全局活动提示条数量为 0，不占用页面空间。
- 控制台错误数：0。

### 基金目录排序高亮

URL: `http://127.0.0.1:5193/funds?fundSort=return_1m&fundOrder=desc`

- 表格行数：50。
- 当前排序列为 `1M`，每行第 6 列被标记为 active sort cell。
- active sort cell 数量：50。
- 前 5 行 1M 收益分别为 `+59.88%`、`+59.78%`、`+57.72%`、`+57.62%`、`+57.02%`。
- 操作列文案未重复，前 5 行均为 `加入走势池`。
- 控制台错误数：0。

## 维护性结论

- `chart-wall-page.tsx` 从红区高位下降到 816 行，本轮没有扩大既有红区。
- 新增任务提示条独立为组件与 CSS，未把可视化逻辑继续塞进页面文件。
- 任务模块职责已写入 package/app 边界契约：任务事实在 `data-storage` / `local-runtime`，前端只消费 `/api/tasks` 并展示。
- 本轮触及的既有红区：`apps/web-shell/src/features/chart-wall/components/chart-wall-page.tsx`。该文件行数下降，没有增长。
