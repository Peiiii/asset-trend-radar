# Gold Insights 资产详情工作台验证报告

## 本轮目标

本轮增强资产详情页的基础体验。资产详情是从图表墙、机会扫描、基金目录进入后的核心决策页面，原实现仍内联在 `chart-wall-page.tsx`，信息层级偏散。本轮将其抽成独立组件，并升级为更适合分析单个资产的工作台。

## 实现范围

- 新增 `asset-detail-section` 组件目录。
- 从 `chart-wall-page.tsx` 移除内联 `AssetDetailSection`、详情 helper 与旧样式。
- 顶部新增资产摘要区：市场、品种、交易所、来源、名称、代码、最新时间。
- 新增关键指标摘要：最新价、区间涨幅、趋势分、当前回撤。
- 图表区改为更高的 detail 技术图，保留 MACD DIF/DEA 线。
- 固定周期收益矩阵使用颜色语义区分上涨/下跌。
- 新增信号条：趋势标签、MACD、突破、量比、事件数。
- 右侧栏整合指标快照与高优先级事件。
- 相关资产继续复用 `AssetChartCard`，保持图表墙卡片体验一致。
- 详情样式从全局 `index.css` 移到组件 CSS。

## 边界确认

- `apps/web-shell`：详情页布局、展示映射、颜色语义、点击加入自选/对比。
- `packages/local-runtime`：继续负责资产详情数据、bars、indicators、events 查询。
- `packages/market-domain`：沿用已有 `ChartWallItem` / `AssetDetailResponse` 契约。
- `packages/ui`：继续复用 `Button`、`EmptyState`、`PriceChange`、`SignalBadge`、`TechnicalChart`。

## 功能验证

详情路由可达：

```txt
curl http://127.0.0.1:5193/assets/us-nvda?range=6m&timeframe=1d -> 200
```

真实详情接口样例：

```json
{
  "id": "us-nvda",
  "name": "NVIDIA",
  "market": "美股",
  "sparkline": 125,
  "indicators": 125,
  "events": 1,
  "latest": "2026-06-16T13:30:00.000Z",
  "returns": {
    "returnPct": 17.572643666752583,
    "return1m": -6.013810329249956,
    "return6m": 17.572643666752583
  },
  "signals": {
    "trend": 41,
    "macd": "neutral",
    "breakout": "none",
    "drawdown": -11.66394280437508
  }
}
```

## 验证命令

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm lint:maintainability:guard`
- `pnpm smoke`

完整 smoke：

```json
{
  "status": "passed",
  "assetCount": 132,
  "barCount": 162308,
  "chartWallItems": 111,
  "fundItems": 69,
  "commodityItems": 12,
  "compareAssets": 4,
  "taskCenter": {
    "tasks": 4,
    "runningCount": 0,
    "failedCount": 0
  }
}
```

## 维护性结果

- `chart-wall-page.tsx` 从 1123 行降到 982 行。
- `index.css` 从 1454 行降到 1347 行。
- 新增 `asset-detail-section.tsx` 141 行、`asset-detail-section.utils.ts` 108 行，均低于单文件上限。
- `lint:maintainability:guard` 通过，没有新增 package deep import 或红区增长。

## 已知限制

本轮没有改变后端资产详情 API，也没有新增持久化指标。详情页里的颜色语义和收益矩阵是基于已有字段的展示增强。
