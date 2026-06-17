# 自选筛选恢复验证报告

## 背景

自选图表墙会复用图表墙的市场、品种、层级和搜索筛选。此前当用户已有自选资产但被筛选条件全部隐藏时，页面只提示“当前筛选下没有自选资产”，没有一键恢复路径。用户容易误以为自选数据丢失。

## 本轮调整

- `WatchlistSection` 新增 `onShowAll` 回调。
- 当存在被筛选隐藏的自选资产时，标题区展示“显示全部自选”。
- 当当前筛选下可见自选为 0 时，空态区域展示同一个恢复操作。
- `ChartWallPage` 传入既有 `resetFilters`，由页面层负责清理 URL query。

## 边界确认

- `apps/web-shell`：负责 URL query、页面状态和自选页交互恢复。
- `packages/market-domain`：未改动，现有 `WatchlistSummary` 和 `ChartWallItem` 已足够。
- `packages/local-runtime`：未改动，后端自选和行情事实不变。
- `packages/ui`：未改动，继续复用 `Button` 与 `EmptyState`。

## 浏览器验证

起始地址：

`http://127.0.0.1:5193/watchlist?market=美股&assetType=equity`

验证时本地自选池有 1 个自选资产，筛选后被全部隐藏：

```json
{
  "hasFilteredEmpty": true,
  "hasShowAll": true,
  "summary": [
    "全部自选1本地观察池",
    "当前可见01 个被筛选隐藏"
  ],
  "url": "http://127.0.0.1:5193/watchlist?market=%E7%BE%8E%E8%82%A1&assetType=equity"
}
```

点击“显示全部自选”后：

```json
{
  "url": "http://127.0.0.1:5193/watchlist",
  "hasFilteredEmpty": false,
  "hasShowAll": false,
  "summary": [
    "全部自选1本地观察池",
    "当前可见1未被筛选隐藏"
  ],
  "tableRows": [
    "EthereumETH/USDT加密-36.67%-68 / 明显转弱0对比移除"
  ]
}
```

结论：筛选恢复路径闭环成立，用户能从空态直接回到全部自选资产。

## 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
pnpm build
```

## 维护性

- 自选恢复逻辑留在 `apps/web-shell`，没有把 URL 状态下沉到 feature 组件或 package。
- 没有新增后端字段和跨 package deep import。
- 触碰 `chart-wall-page.tsx` 仅用于接线现有 `resetFilters`。
- 变更收敛在自选 role folder 和页面组合层。
