# Gold Insights 多资产对比增强验证报告

## 本轮目标

本轮增强“多资产对比”基础体验。原对比面板只展示多个小走势卡片，用户很难直接判断“同一起点下谁更强、谁更弱”。本轮改为归一化走势对比 + 指标表，服务于肉眼快速发现跨资产机会。

## 实现范围

- 从 `chart-wall-page.tsx` 抽出 `ComparePanel` 到独立组件目录。
- 新增 `ComparePerformanceChart`，把不同价格单位资产统一归一到起点 0% 后绘制多条曲线。
- 新增 hover 辅助线与 tooltip，显示同一时间附近各资产涨跌幅。
- 新增对比指标表：
  - 资产名称与代码。
  - 市场。
  - 最新价。
  - 区间涨幅。
  - 最大回撤。
  - 数据点数量。
- token 支持点击移除资产，清空按钮保留。
- 旧对比样式从全局 `index.css` 移到 `compare-panel.css`。

## 边界确认

- `apps/web-shell`：负责对比面板布局、归一化展示、hover 状态、表格文案。
- `packages/local-runtime`：继续负责 `/api/compare` 的资产 bars 和 indicators 查询。
- `packages/market-domain`：已有 `CompareResponse` 契约，本轮不新增后端字段。
- `packages/ui`：继续复用 Button、LoadingState、PriceChange、SignalBadge。

## 功能验证

页面可达：

```txt
curl http://127.0.0.1:5193/chart-wall -> 200
```

对比接口样例：

```json
{
  "range": "6m",
  "timeframe": "1d",
  "assets": [
    { "id": "us-nvda", "market": "美股", "bars": 125 },
    { "id": "cn-csi300", "market": "A 股", "bars": 118 },
    { "id": "cmd-gold", "market": "商品", "bars": 125 },
    { "id": "btcusdt", "market": "加密", "bars": 183 }
  ]
}
```

完整 smoke：

```json
{
  "status": "passed",
  "assetCount": 132,
  "barCount": 162305,
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

## 验证命令

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm lint:maintainability:guard`
- `pnpm smoke`

## 维护性结果

- `chart-wall-page.tsx` 从 1171 行降到 1123 行。
- `index.css` 从 1505 行降到 1454 行。
- 新增 `compare-panel` 组件目录，最大新文件为 `compare-performance-chart.tsx` 213 行，未接近单文件上限。
- `lint:maintainability:guard` 通过，没有新增 deep import 或红区增长。

## 已知限制

本轮没有改变后端 compare 契约，也没有把归一化收益写入数据库。归一化曲线是前端展示派生值，适合对比阅读，不作为独立持久化指标。
