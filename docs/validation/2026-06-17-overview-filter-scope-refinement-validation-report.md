# 概览筛选口径收口验证报告

## 背景

概览页需要保留筛选/排序能力，但不能出现“列表页专属控件影响概览却没有任何反馈”的体验，也不能让机会事件脱离当前筛选口径。

## 改动

- `ChartWallControls` 新增 `showViewMode`。
- `/overview` 隐藏卡片/表格视图切换；`/chart-wall` 继续保留。
- `OverviewSection` 的机会事件改为只展示当前筛选后资产集合中的事件。

## 浏览器验证

### 概览页

URL:

`http://127.0.0.1:5193/overview?view=table&range=6m&timeframe=1d&market=基金&assetType=all&sort=return_1m`

```json
{
  "activeNav": "概览",
  "h1": "全市场概览",
  "marketText": "基金47",
  "sortText": "1M 涨幅",
  "viewModeControls": 0,
  "cardViewButtons": 0,
  "tableViewButtons": 0,
  "eventCards": 12,
  "chartRows": 0
}
```

结论：概览页保留筛选/排序，但不展示无效的视图切换。

### 图表墙

URL:

`http://127.0.0.1:5193/chart-wall?view=table&range=6m&timeframe=1d&market=商品&assetType=all&sort=return_1m`

```json
{
  "activeNav": "图表墙",
  "tableRows": 40,
  "viewModeControls": 1,
  "cardViewButtons": 1,
  "tableViewButtons": 1,
  "overviewSectionCount": 0
}
```

结论：列表页仍保留卡片/表格切换。

## API 口径验证

基金筛选下：

```json
{
  "itemCount": 47,
  "scannerEventCount": 67,
  "visibleEventCount": 12,
  "leakedEventCount": 0,
  "sampleEventAssetIds": [
    "fund-cn-000011",
    "fund-cn-001480",
    "fund-cn-007119",
    "fund-cn-014736",
    "fund-cn-519688"
  ]
}
```

结论：概览机会事件没有混入筛选资产集合之外的事件。

## 命令验证

- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- `pnpm lint:maintainability:guard`：通过。
- `pnpm build`：通过。
- `git diff --check`：通过。

## 维护性结论

- `ChartWallControls` 通过显式 prop 区分共享筛选和列表专属控件，避免在页面里复制控制条。
- 事件口径收敛在 `OverviewSection`，不改变后端 contract。
- 触碰既有红区 `chart-wall-page.tsx` 仅增加 1 行 prop，仍在 adopted baseline 内。
