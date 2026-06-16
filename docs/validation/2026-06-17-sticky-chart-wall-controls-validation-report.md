# 图表墙 Sticky 控制条验证报告

## 背景

交易所类图表墙在浏览大量资产时，筛选、排序、时间跨度和视图切换必须随时可见。原先控制条直接写在 `chart-wall-page.tsx`，样式依赖全局 `index.css`，页面变重且滚动后控制项不可见。本轮把主控制条抽成独立组件，并加入桌面 sticky 体验。

## 职责边界

- `apps/web-shell`：负责 URL query、页面状态和控制条组合。
- `components/chart-wall-controls/`：负责图表墙控制条展示、facet count 映射、sticky 布局。
- `packages/local-runtime` / `market-domain`：未改动，筛选和排序事实仍来自既有 API contract。

## 功能变化

- 新增 `ChartWallControls` role folder。
- `chart-wall-page.tsx` 不再直接拼接市场、品种、层级、主题、信号、排序、方向、时间跨度和视图按钮。
- 控制条桌面端 sticky，滚动浏览图表时仍保持可见。
- 桌面端筛选项横向可滚动，避免 sticky 条过高遮挡图表。
- 移除废弃的 `.view-mode-toggle` 全局样式。

## 浏览器验证

地址：

```txt
http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&market=商品&tag=贵金属&sort=return_1m&order=desc
```

初始状态：

```json
{
  "hasControls": true,
  "position": "sticky",
  "marketText": "商品34",
  "tagText": "贵金属10",
  "sortText": "1M 涨幅",
  "hasOldViewModeClass": false
}
```

滚动后：

```json
{
  "scrollY": 900,
  "height": 106,
  "rectTop": 0,
  "position": "sticky",
  "isNearViewportTop": true
}
```

表格视图切换：

```json
{
  "hasExchangeTable": true,
  "hasChartGrid": false,
  "url": "http://127.0.0.1:5193/chart-wall?view=table&range=6m&timeframe=1d&market=商品&tag=贵金属&sort=return_1m&order=desc"
}
```

浏览器控制台只出现 React Router v7 future flag warning，未出现本轮改动导致的 error。

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
- `pnpm lint:maintainability:hotspots` 未新增红区或 oversized directory。
- `pnpm lint` 通过。
- `pnpm build` 通过。
- `pnpm smoke` 通过，输出 `status: passed`。

## 维护性结论

- `chart-wall-page.tsx` 从 938 行降到 901 行。
- `apps/web-shell/src/index.css` 从 1138 行降到 1128 行。
- 新增 `chart-wall-controls.tsx` 115 行、`chart-wall-controls.css` 101 行，均低于限制。
- 触碰了两个红区文件，但都是净减少或抽离逻辑，`lint:maintainability:guard` 已通过。
