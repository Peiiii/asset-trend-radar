# 图表墙控制条密度优化验证报告

## 背景

上一轮为图表墙增加筛选摘要后，桌面 sticky 控制条在真实页面中高度达到约 150px。对于需要像交易所大盘一样快速扫多图的场景，这会占用过多首屏空间。本轮只调整 `apps/web-shell` 内的控制条布局，不改变筛选、排序、数据源或 API 口径。

## 变更范围

- `ChartWallControls` 桌面布局从“摘要一行、时间一行”改为三列紧凑行：
  - 左侧：筛选摘要。
  - 中间：时间范围与周期，横向滚动承载溢出。
  - 右侧：视图切换、重置、重新采集。
- 移动断点不再强制摘要、时间控件和操作按钮竖排：
  - 筛选下拉仍竖排，保证可读。
  - 摘要保持一行横向滚动。
  - 时间控件横向滚动。
  - 操作按钮横向换行。

## 浏览器验证

测试 URL：

```txt
http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&market=商品&tag=贵金属&sort=return_1m&order=desc
```

桌面 1280x720：

```json
{
  "controlsHeight": 115,
  "stickyAtTop": true,
  "summary": ["当前 10", "接口 10", "排序 1M 涨幅 降序"],
  "timelineCanScroll": true,
  "overflowX": false,
  "cards": 10
}
```

移动 390x844：

```json
{
  "controlsHeight": 471,
  "position": "static",
  "summaryHeight": 28,
  "timelineHeight": 45,
  "actionsHeight": 36,
  "timelineCanScroll": true,
  "overflowX": false,
  "cardCount": 10
}
```

移动对比：本轮前测得控制区约 662px，本轮后约 471px，减少约 191px。

浏览器 console error：

```json
[]
```

## 自动验证

- `pnpm typecheck`：通过。
- `pnpm lint:maintainability:guard`：通过。
- `pnpm lint`：通过。
- `pnpm build`：通过。
- `pnpm lint:maintainability:hotspots`：通过，红区数量未增长。
- `pnpm smoke`：通过。

`pnpm smoke` 摘要：

```json
{
  "status": "passed",
  "assetCount": 154,
  "chartWallItems": 133,
  "fundItems": 80,
  "commodityItems": 34,
  "preciousMetalsItems": 10,
  "fundCatalogCount": 27010
}
```

## 维护性结论

- 本轮只修改 `chart-wall-controls.css`，未触碰既有红区文件。
- 没有新增文件、目录或 package 边界。
- 改动让控制条更紧凑，减少图表墙可视区域被工具栏占用的问题。
