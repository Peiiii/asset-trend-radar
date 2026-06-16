# 移动端图表墙控制条优化验证报告

## 背景

图表墙用于一屏查看大量资产走势。上一轮已把桌面 sticky 控制条压到约 115px，但 390px 移动视口下控制区仍约 471px，原因是 7 个筛选下拉在移动端被强制竖排。这个布局会显著挤压图表可视区域。

本轮只优化 `apps/web-shell` 的控制条 CSS，不改变 API、数据源、排序或筛选口径。

## 变更范围

- 移动端 `.chart-wall-controls__filters` 从竖向堆叠改为横向滚动工具条。
- 移动端筛选下拉改为固定最小宽度，避免每个下拉占满整行。
- 摘要、时间控件和操作按钮继续保持上一轮紧凑布局。

## 浏览器验证

测试 URL：

```txt
http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&market=商品&tag=贵金属&sort=return_1m&order=desc
```

移动 390x844：

```json
{
  "controlsHeight": 195,
  "filtersHeight": 40,
  "filtersCanScroll": true,
  "timelineCanScroll": true,
  "overflowX": false,
  "summary": ["当前 10", "接口 10", "排序 1M 涨幅 降序"],
  "cardCount": 10
}
```

对比：

- 早前移动控制区约 662px。
- 上轮压缩到约 471px。
- 本轮进一步压缩到约 195px。

桌面 1280x720 回归验证：

```json
{
  "controlsHeight": 115,
  "stickyAtTop": true,
  "filtersCanScroll": true,
  "overflowX": false,
  "summary": ["当前 10", "接口 10", "排序 1M 涨幅 降序"],
  "cardCount": 10
}
```

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
- 没有新增 package、API 或业务边界。
- 移动端图表可视空间显著增加，控制条仍保留完整筛选、摘要、排序和周期能力。
