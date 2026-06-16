# Gold Insights 图表墙交易所式表格增量验证报告

验证时间：2026-06-17 CST

## 结论

本轮不是新增数据源，而是补强“人眼快速发现机会”的基础体验。图表墙表格视图已从普通宽表升级为更接近交易所行情列表的高密度视图：排名、资产、收益、量比、回撤、趋势、MACD、事件、数据密度和操作都能在一个表格中横向扫描；资产列和操作列固定，横向滚动不丢上下文。

本轮提交仍属于阶段性增强，总目标继续推进。

## 实现范围

- 把 `ExchangeTable` 从 `chart-wall-page.tsx` 抽到 `apps/web-shell/src/features/chart-wall/components/exchange-table/`。
- 表格新增排名列，显示当前排序结果中的名次。
- 资产列固定在左侧，操作列固定在右侧。
- 固定列阴影复用 `packages/ui` 的 `useTableScrollShadows`，只在对应方向仍有可滚动内容时显示。
- 阶段收益使用 `PriceChange`，上涨、下跌、暂无具备明确颜色语义。
- 市场、品种、量比、MACD、事件使用 `SignalBadge`。
- 趋势分使用 `TrendBadge`。
- 新增数据密度列，展示数据点数量、数据源和最新 K 线时间。
- 排序表头改为图标箭头和 active 状态，和基金目录排序体验保持一致。
- 表格组件自己处理空态，页面组件只负责组合和传参。
- 从根 `index.css` 移除旧的 asset table 样式，表格样式收敛到组件目录。

## 浏览器验证

验证地址：

```text
http://127.0.0.1:5193/chart-wall?view=table&range=6m&timeframe=1d&sort=return_1m&order=desc
```

DOM 抽查结果：

```json
{
  "activeSort": "1M",
  "rankPosition": "sticky",
  "assetPosition": "sticky",
  "actionPosition": "sticky",
  "scrollLeft": 0,
  "scrollWidth": 1824,
  "clientWidth": 686,
  "wrapperClass": "exchange-table-wrapper exchange-table-wrapper--right-shadow",
  "priceChangePills": 684,
  "signalBadges": 570,
  "trendBadges": 114,
  "dataDensityCount": 114
}
```

横向滚到表格最右侧后：

```json
{
  "scrollLeft": 1138,
  "scrollWidth": 1824,
  "clientWidth": 686,
  "wrapperClass": "exchange-table-wrapper exchange-table-wrapper--left-shadow"
}
```

这证明初始最左侧只显示右侧阴影；滚到最右侧后右侧阴影消失、左侧阴影出现。

按 `1M 涨幅` 降序的前 5 行：

| 排名 | 资产 | 市场 | 1M |
| ---: | --- | --- | ---: |
| 1 | 财通成长优选混合A | 基金 | +52.55% |
| 2 | iShares 半导体 ETF | 美股 | +22.02% |
| 3 | 创金合信专精特新股票发起A | 基金 | +19.24% |
| 4 | 交银精选混合 | 基金 | +16.59% |
| 5 | VanEck 半导体 ETF | 美股 | +14.96% |

## 维护性验证

已通过：

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
pnpm build
```

维护性变化：

- `apps/web-shell/src/features/chart-wall/components/chart-wall-page.tsx`：1292 行降到 1208 行。
- `apps/web-shell/src/index.css`：1680 行降到 1563 行。
- 新增 `exchange-table.tsx` 201 行、`exchange-table.css` 205 行，均在单文件阈值内。
- 新增组件目录而不是继续向已有大页面和根 CSS 堆代码。

职责边界：

- `packages/ui`：继续承载通用 `PriceChange`、`SignalBadge`、`TrendBadge`、`useTableScrollShadows`。
- `apps/web-shell`：负责图表墙表格列组织、中文展示、排序交互和页面组合。
- `local-runtime`：继续负责排序结果，不把资产排序权威逻辑搬到前端。
