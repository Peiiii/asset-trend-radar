# 图表网格榜单质量验证报告

## 背景

图表墙已经支持按涨幅、趋势、量比、回撤等指标排序，并在卡片上显示名次。但用户扫一屏多图时，还需要知道当前榜单是否可靠：这个排序指标有多少资产有值、缺值多少、中位数在哪里、首尾差有多大。否则极端榜首容易被误读为整体机会。

## 本轮调整

- 新增 `ChartGridRankSummary`。
- 网格模式在卡片区上方展示榜单质量：
  - 当前排序指标与方向。
  - 有效样本数 / 可见资产数。
  - 缺值数。
  - 中位数。
  - 首尾差。
- 非数值排序时展示说明，不伪造统计。

## 边界确认

- `apps/web-shell`：只基于当前可见 `ChartWallItem[]` 做展示统计。
- `packages/market-domain`：未改动。
- `packages/local-runtime`：未改动，排序与行情事实仍来自既有接口。
- `packages/ui`：未改动，复用 `SignalBadge`。

## 浏览器验证

数值排序地址：

`http://127.0.0.1:5193/chart-wall?view=grid&range=3m&timeframe=1d&sort=return_3m&order=desc`

验证结果：

```json
{
  "summaryText": "榜单质量3M 涨幅 降序有效样本136 / 136缺值0中位数-0.44%首尾差+163.58%",
  "metricCount": 4,
  "metrics": [
    "有效样本136 / 136",
    "缺值0",
    "中位数-0.44%",
    "首尾差+163.58%"
  ],
  "firstRanks": ["#1", "#2", "#3", "#4"]
}
```

非数值排序地址：

`http://127.0.0.1:5193/chart-wall?view=grid&range=3m&timeframe=1d&sort=symbol&order=asc`

验证结果：

```json
{
  "summaryText": "榜单质量当前按非数值字段排序，卡片名次仅代表列表顺序。",
  "isMuted": true,
  "firstRanks": ["#1", "#2", "#3"]
}
```

结论：

- 数值排序时，用户能判断榜单覆盖度和分布。
- 非数值排序时，不会误导用户认为存在数值分布。
- 卡片名次和榜单质量条共同增强了一屏多图扫机会的可解释性。

## 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
pnpm build
```

## 维护性

- 新增组件位于 `chart-grid` role folder。
- 没有新增 package deep import。
- `chart-wall-page.tsx` 只做 `order` 接线。
- 新统计为纯展示逻辑，没有进入 runtime 或 domain contract。
