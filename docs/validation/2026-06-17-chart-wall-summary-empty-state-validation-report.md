# 图表墙筛选摘要与空状态恢复验证报告

## 背景

本轮目标是继续强化“交易所式图表墙”的基础体验：用户筛选、搜索和排序后，应当立刻知道当前看到多少资产、后端接口命中多少资产、当前排序口径是什么；当筛选为空时，页面应提供明确恢复路径。

## 职责边界

- `apps/web-shell`：新增图表墙控制条摘要、提取 `ChartGrid`、增强空结果恢复操作。
- `packages/local-runtime`：未改动，筛选与排序事实仍来自既有 `/api/chart-wall`。
- `packages/market-domain`：未改动，继续复用 `ChartWallItem` 和排序类型。
- `packages/ui`：未改动，本轮只组合既有 `Button`、`EmptyState` 等组件。

## 变更范围

- `ChartWallControls` 新增筛选摘要：
  - 当前前端可见数量。
  - 当前 API 返回数量。
  - 当前排序字段与方向。
- `ChartGrid` 从红区页面抽到独立组件目录。
- 图表墙空结果状态新增“清空筛选”操作。
- 空状态 wrapper 保持无框布局，避免形成卡片套卡片。

## 浏览器验证

### 正常筛选态

访问：

```txt
http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&market=商品&tag=贵金属&sort=return_1m&order=desc
```

验证结果：

```json
{
  "cards": 10,
  "summary": ["当前 10", "接口 10", "排序 1M 涨幅 降序"],
  "stickyAtTop": true
}
```

### 空结果态

访问：

```txt
http://127.0.0.1:5193/chart-wall?view=grid&q=zzzz-no-hit&market=商品&sort=return_1m&order=desc
```

验证结果：

```json
{
  "cardCount": 0,
  "clearButtonVisible": true,
  "summary": ["当前 0", "接口 34", "排序 1M 涨幅 降序"]
}
```

点击空状态里的“清空筛选”后：

```json
{
  "url": "http://127.0.0.1:5193/chart-wall",
  "cardCount": 136,
  "emptyVisible": false,
  "summary": ["当前 136", "接口 136", "排序 趋势分 降序"]
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
- `pnpm smoke`：通过。

`pnpm smoke` 摘要：

```json
{
  "status": "passed",
  "assetCount": 154,
  "chartWallItems": 133,
  "fundItems": 80,
  "commodityItems": 34,
  "fundCatalogCount": 27018,
  "taskCenter": {
    "pipelineSummaries": 3
  }
}
```

## 维护性结论

- 没有新增红区文件或红区目录。
- `chart-wall-page.tsx` 从 901 行降到 888 行，继续减少红区页面负担。
- 新增 `chart-grid` role folder，网格渲染和空状态恢复不再塞在页面文件里。
- 本轮触碰红区文件 `chart-wall-page.tsx`，但行数减少，维护性没有恶化。
