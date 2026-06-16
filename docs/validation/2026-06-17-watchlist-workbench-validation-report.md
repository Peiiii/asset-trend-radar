# Gold Insights 自选观察池验证报告

## 本轮目标

本轮增强“自选”页面。原页面只是自选资产卡片集合，缺少观察池应有的摘要、事件提醒和管理入口。现在自选页更接近行情产品里的 watchlist 工作台。

## 实现范围

- 新增 `watchlist-section` 组件目录。
- 从 `chart-wall-page.tsx` 移除内联 `WatchlistSection`。
- 新增自选摘要：
  - 全部自选。
  - 当前可见。
  - 区间上涨。
  - 强趋势。
  - 有事件。
- 当前筛选隐藏部分自选资产时显示明确说明。
- 新增自选事件提醒区，按 severity 和触发时间优先展示。
- 保留自选图表卡片墙。
- 新增自选管理表，支持：
  - 点击资产进入详情。
  - 加入/取消对比。
  - 从自选移除。
- 旧 `watchlist-meta` 全局样式迁移到组件 CSS。

## 边界确认

- `apps/web-shell`：自选页展示、摘要、事件提醒、表格操作。
- `packages/local-runtime`：继续负责 `/api/watchlists`、添加/移除自选事实。
- `packages/market-domain`：沿用 `WatchlistsResponse`、`WatchlistSummary`、`ChartWallItem`。
- `packages/ui`：复用 `Button`、`EmptyState`、`PriceChange`、`SignalBadge`。

## 功能验证

页面可达：

```txt
curl http://127.0.0.1:5193/watchlist -> 200
```

自选接口样例：

```json
{
  "generatedAt": "2026-06-16T18:43:52.040Z",
  "watchlists": [
    {
      "id": "default",
      "name": "默认自选",
      "assets": 1,
      "symbols": ["ETH/USDT"]
    }
  ]
}
```

完整 smoke：

```json
{
  "status": "passed",
  "assetCount": 132,
  "barCount": 162306,
  "chartWallItems": 111,
  "fundItems": 69,
  "commodityItems": 12,
  "watchlistAssets": 1,
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

- `chart-wall-page.tsx` 从 950 行降到 916 行。
- `index.css` 从 1262 行降到 1247 行。
- 新增 `watchlist-section.tsx` 152 行、`watchlist-section.utils.ts` 60 行，均低于单文件上限。
- `lint:maintainability:guard` 通过，没有新增 package deep import 或红区增长。

## 已知限制

当前仍只有默认自选列表，未实现多 watchlist 创建/重命名。页面会展示后端返回的所有 watchlist，并按当前图表筛选条件显示可见资产。
