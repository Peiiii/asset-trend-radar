# Active Filter Chips 组件抽离验证报告

## 背景

图表墙页面已经承担了路由、筛选、详情、对比、基金目录、任务入口等多种页面编排职责。为了避免继续把可复用展示逻辑堆在红区文件里，本轮把“当前筛选 chip 展示、移除、清空”的 UI 逻辑从 `chart-wall-page.tsx` 抽离到独立 role component。

## 职责边界

- `apps/web-shell`：继续负责 URL query、页面状态和筛选 chip 展示。
- `packages/ui`：继续提供通用 `FilterChip` 基础组件。
- `packages/local-runtime`：未改动；筛选和排序业务事实仍来自 API。
- `packages/market-domain`：未改动；本轮没有新增接口契约。

本轮没有 deep import，没有把业务口径放进前端组件，也没有改变后端任务或图表墙查询逻辑。

## 改动范围

- 新增 `apps/web-shell/src/features/chart-wall/components/active-filter-chips/active-filter-chips.tsx`
- 更新 `apps/web-shell/src/features/chart-wall/components/chart-wall-page.tsx`

行数变化：

```txt
chart-wall-page.tsx: 961 -> 907
active-filter-chips.tsx: 94
```

`chart-wall-page.tsx` 仍属于既有红区文件，但本轮让它减少 54 行，红区数量没有增长。

## 功能验证

浏览器自动化验证地址：

```txt
http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&market=基金&assetType=fund&sort=return_1m&order=desc&q=华夏
```

验证结果：

```json
{
  "beforeHasChips": true,
  "singleRemoveStillWorks": true,
  "resetClearsStrip": true,
  "stripCountAfterReset": 0,
  "errors": []
}
```

说明：

- 初始页面能展示市场、品种、排序、搜索等 active filter chip。
- 点击“移除市场”后，URL 中的 `market=基金` 被移除，其它筛选仍保留。
- 点击“清空筛选”后，URL 回到 `/chart-wall`，active filter strip 消失。
- 页面没有 console error 或 page error。

## 命令验证

```bash
pnpm typecheck
pnpm lint:maintainability:guard
pnpm lint
pnpm build
pnpm smoke
```

结果：

- `pnpm typecheck`：通过。
- `pnpm lint:maintainability:guard`：通过。
- `pnpm lint`：通过。
- `pnpm build`：通过。
- `pnpm smoke`：通过。

smoke 关键摘要：

```json
{
  "chartWallItems": 111,
  "fundItems": 69,
  "fundCatalogCount": 27018,
  "commodityItems": 12,
  "taskCenter": {
    "tasks": 4,
    "totalCount": 4,
    "runningCount": 0,
    "failedCount": 0,
    "activeTasks": 0,
    "recentFailures": 0,
    "pipelineSummaries": 3
  }
}
```

## 维护性结论

- 组件职责更清晰：页面只传入当前筛选、默认值和 options，chip label 与默认值判断收敛到 `ActiveFilterChips`。
- 红区文件变小：`chart-wall-page.tsx` 减少 54 行。
- 没有新增 oversized directory peer file；新组件放在 feature 内的 role folder。
- 本轮让代码更清晰、更易复用，后续类似筛选条可复用同一组件模式。
