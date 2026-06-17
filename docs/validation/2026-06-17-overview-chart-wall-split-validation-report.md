# 概览与图表墙职责拆分验证报告

## 背景

用户指出全市场图表墙同时承担了两类任务：

- 资产列表：筛选、排序、批量查看走势，类似交易所列表。
- 市场概览：市场宽度、板块强弱、机会榜单、排序异动、扫描事件。

这两类任务都重要，但放在一个页面会让图表墙越来越像“所有东西都堆在一起”。本轮新增 `/overview`，把概览型信息迁出图表墙，同时保留同一套筛选、排序、搜索和时间范围。

## 改动

- 新增 `/overview` 路由，根路径 `/` 也进入概览。
- 侧边栏新增 `概览`，`图表墙` 继续保留。
- 新增 `OverviewSection`：
  - 数据状态摘要。
  - 市场宽度。
  - 市场强弱。
  - 排序异动。
  - 机会榜单。
  - 机会事件。
- 图表墙页改为更纯粹的走势列表：
  - 保留完整筛选、排序、搜索、时间范围、视图模式。
  - 保留对比面板、卡片视图、表格视图、榜单质量摘要。
  - 移除市场强弱、机会榜单、排序异动和事件侧栏。
- 更新 `docs/designs/2026-06-16-package-app-boundary-contract.md`，明确 `/overview` 与 `/chart-wall` 的职责边界。

## 边界

- 本轮没有新增后端接口，也没有改变排序/筛选的权威口径。
- `/overview` 与 `/chart-wall` 共用 `ChartWallResponse` 和 URL query；筛选表达的是“当前观察口径”，不是某个页面私有状态。
- 概览型编排在 app 层完成；未来如果需要新的权威聚合字段，必须先扩展 `market-domain` contract，再由 `local-runtime` 计算。

## 浏览器验证

### 概览页保留筛选能力

URL:

`http://127.0.0.1:5193/overview?view=table&range=6m&timeframe=1d&market=基金&assetType=all&sort=return_1m`

验证结果：

```json
{
  "activeNav": "概览",
  "h1": "全市场概览",
  "marketText": "基金47",
  "sortText": "1M 涨幅",
  "summaryCount": 6,
  "marketPulseCount": 1,
  "hasMovers": true,
  "hasLeaderboard": true,
  "eventCards": 12,
  "chartRows": 0
}
```

结论：概览页没有丢失筛选/排序能力，但不再展示资产表格。

### 概览页筛选会改变概览口径

在概览页打开 `市场` 下拉并选择 `商品`：

```json
{
  "portalParent": "BODY",
  "filtersContainsContent": false,
  "marketText": "商品40",
  "marketPulseCount": 1,
  "url": "http://127.0.0.1:5193/overview?view=table&range=6m&timeframe=1d&market=%E5%95%86%E5%93%81&assetType=all&sort=return_1m"
}
```

结论：概览页复用通用筛选条，下拉可打开，筛选后概览按新口径更新。

### 图表墙变成列表页

URL:

`http://127.0.0.1:5193/chart-wall?view=table&range=6m&timeframe=1d&market=商品&assetType=all&sort=return_1m`

验证结果：

```json
{
  "activeNav": "图表墙",
  "h1": "全市场图表墙",
  "tableRows": 40,
  "overviewSectionCount": 0,
  "marketPulseCount": 0,
  "leaderboardCount": 0,
  "summaryCount": 0
}
```

结论：图表墙保留列表和筛选，不再混入概览型模块。

## 命令验证

- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- `pnpm lint:maintainability:guard`：通过。
- `pnpm build`：通过。
- `git diff --check`：通过。

## 维护性结论

- 新增 `overview-section` role folder，避免继续扩大 chart wall 页面主体。
- `OverviewSection` 为 77 行，样式 63 行。
- `chart-wall-page.tsx` 仍属于 adopted red zone，但本轮净减少页面代码，文件从历史基线 1327 行下降到 750 行。
- 本轮让信息架构更清晰：筛选口径共享，概览和列表分离。
