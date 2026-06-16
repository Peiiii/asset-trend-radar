# 排序感知异动条验证报告

## 背景

图表墙已经有市场强弱和综合机会榜，但用户选择 `1M 涨幅`、`量比`、`趋势分` 等排序时，页面缺少一个紧贴当前排序口径的扫视入口。本轮新增“排序异动”区块，让用户在进入具体图表前，先看到当前排序指标下的榜首、高值、低值和中位数。

## 职责边界

- `packages/local-runtime`：未改动。排序指标事实仍来自 `/api/chart-wall` 返回的 `ChartWallItem`。
- `packages/market-domain`：未改动。复用既有 `ChartWallItem` 和 `ChartWallSortOrder`。
- `apps/web-shell`：新增展示组件，基于当前筛选后的真实 API 数据做页面级展示排序，不计算新的金融指标。

## 功能变化

- 新增 `SortAwareMoversStrip` role folder。
- 支持按当前排序指标展示：
  - 当前榜首
  - 领涨/高值 Top 3
  - 承压/低值 Top 3
  - 中位数、覆盖样本、资产数
- 支持指标：
  - 区间涨幅、1D、1W、1M、3M、6M、1Y
  - 量比
  - 回撤
  - 趋势分
  - 事件数 / MACD 事件
- 当前榜首可进入资产详情，也可以加入对比。
- 组件位置放在市场强弱之后、综合机会榜之前，形成“市场 -> 当前排序 -> 综合机会”的扫描路径。

## 浏览器验证

地址：

```txt
http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&market=加密&assetType=crypto&sort=return_1m&order=desc
```

验证结果：

```json
{
  "hasSection": true,
  "headerBadge": "1M 涨幅降序",
  "cardCount": 4,
  "sectionText": "排序异动...当前榜首...领涨/高值...承压/低值...样本分布..."
}
```

控制台只出现 React Router v7 future flag warning，未出现本轮改动导致的 error。

## 命令验证

```txt
pnpm typecheck
pnpm lint:maintainability:guard
pnpm lint:maintainability:hotspots
pnpm lint
pnpm build
pnpm smoke
```

结果：

- `pnpm typecheck` 通过。
- `pnpm lint:maintainability:guard` 通过。
- `pnpm lint:maintainability:hotspots` 未新增红区，新增 CSS 拆分后不再进入热点列表。
- `pnpm lint` 通过。
- `pnpm build` 通过。
- `pnpm smoke` 通过，输出 `status: passed`。

## 维护性结论

- 新功能放在 `components/sort-aware-movers-strip/` role folder，没有向组件根目录继续堆文件。
- `sort-aware-movers-strip.tsx` 239 行，两个 CSS 文件各 169 行，均低于 360 行限制。
- 触碰红区 `chart-wall-page.tsx`，只新增 import 和一处组件接入，仍在 adopted baseline 内。
- 新增的是页面扫描体验，增长是必要的功能增长；同时通过 role folder 和 CSS 拆分控制了后续维护风险。
