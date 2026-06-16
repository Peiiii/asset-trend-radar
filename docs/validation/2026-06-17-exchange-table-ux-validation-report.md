# 交易所式资产表体验增强验证报告

## 背景

图表墙已经支持卡片视图和表格视图，但表格视图缺少交易所类产品常见的“当前排序状态、涨跌分布、事件数量、强趋势数量、快捷进入详情”等快速扫描信息。本轮增强 `ExchangeTable`，让用户在一个页面里查看大量资产走势时，更容易用肉眼发现机会。

## 职责边界

- `packages/local-runtime`：未改动；资产筛选、排序、指标和事件仍来自 runtime API。
- `packages/market-domain`：未改动；继续使用既有 `ChartWallItem` 和 `ChartWallSortOrder`。
- `apps/web-shell`：只基于当前已返回的真实 items 做表格展示摘要、排序文案和行操作。
- `packages/ui`：未改动；继续复用基础 Badge、PriceChange 和 table scroll shadow hook。

本轮没有把前端展示摘要变成业务事实，也没有新增后端字段。

## 改动范围

- `apps/web-shell/src/features/chart-wall/components/exchange-table/exchange-table.tsx`
- `apps/web-shell/src/features/chart-wall/components/exchange-table/exchange-table.css`

新增体验：

- 表格顶部展示当前可见资产数量。
- 展示当前排序口径，例如“当前按 1M 涨幅 降序 排列”。
- 展示上涨、下跌、有事件、强趋势的语义统计。
- 行操作新增“详情”按钮，不需要依赖双击或点名称。
- 保持左侧资产列和右侧操作列 sticky，并保留横向滚动阴影。

## 浏览器验证

验证地址：

```txt
http://127.0.0.1:5193/chart-wall?view=table&range=3m&timeframe=1d&sort=return_1m&order=desc
```

验证结果：

```json
{
  "hasToolbar": true,
  "hasSemanticStats": true,
  "hasDetailActions": true,
  "sortClickUpdatesUrl": true,
  "canScrollHorizontally": true,
  "errors": []
}
```

说明：

- 表格摘要条正常渲染。
- 上涨、下跌、有事件、强趋势统计正常展示。
- 每行存在“详情”快捷按钮。
- 点击 `3M` 表头后，URL 从 `sort=return_1m` 更新为 `sort=return_3m`。
- 宽表仍可横向滚动。
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
  "sortedFundCatalogTopReturn1m": 30.01,
  "taskCenter": {
    "tasks": 4,
    "totalCount": 4,
    "pipelineSummaries": 3
  }
}
```

## 维护性结论

- `lint:maintainability:guard` 通过，治理 backlog 未增长。
- 没有触碰既有红区文件。
- `exchange-table.tsx` 为 255 行，`exchange-table.css` 为 304 行。
- `exchange-table.css` 已接近 360 行阈值；后续如果继续增强表格视觉，优先拆分 toolbar/table/sticky CSS，避免形成新红区。
