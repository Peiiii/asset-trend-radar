# 可移除筛选 Chip 功能验证报告

日期：2026-06-17

## 背景

图表墙支持多维筛选和排序后，用户经常会组合市场、品种、搜索和排序条件。原图表墙 active filter chips 只能展示当前筛选，并提供“清空筛选”，不能单独移除某个条件。成熟行情产品通常支持单个 filter chip 直接移除，本次补齐该基础体验。

## 实现范围

- 图表墙 active filter chips 变为可点击按钮。
- 点击单个 chip 只移除对应 URL 查询参数。
- 搜索 chip 映射到 `q` 参数。
- 移除排序 chip 时同步移除 `order`，避免留下孤立方向参数。
- 其他筛选保持不变。

## 职责边界

- URL query 仍由 `ChartWallPage` 管理。
- `FilterChip` 仍作为通用 UI 组件复用，不理解业务筛选含义。
- 不改后端 API、排序口径或数据源。

## 浏览器验证

验证 URL：

```text
http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&market=基金&assetType=fund&sort=return_1m&order=desc&q=华夏
```

使用本机 Chrome + Playwright 验证：

```json
{
  "beforeHasChips": true,
  "marketRemoved": true,
  "sortRemovedWithOrder": true,
  "finalUrl": "http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&assetType=fund&q=华夏",
  "errors": []
}
```

已确认：

- 初始状态展示市场、品种、排序、搜索 chips。
- 点击“市场: 基金”只移除 `market`，保留品种和搜索。
- 点击“排序: 1M 涨幅”同时移除 `sort` 和 `order`。
- 浏览器 console 无错误。

## 自动化验证

已执行：

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
pnpm build
pnpm smoke
```

结果均通过。`pnpm smoke` 关键输出：

```json
{
  "status": "passed",
  "sources": ["yahoo", "eastmoney"],
  "assetCount": 132,
  "barCount": 162317,
  "chartWallItems": 111,
  "fundItems": 69,
  "commodityItems": 12
}
```

## 维护性结论

- 只触碰 `chart-wall-page.tsx` 的 URL 状态处理和 active chip 渲染。
- `chart-wall-page.tsx` 仍在既有 oversized baseline 内。
- `lint:maintainability:guard` 通过，red-zone 文件/目录数量未增加。

## 结论

图表墙筛选体验已更接近成熟行情终端：用户可以在保留其他上下文的情况下移除单个筛选条件，减少反复重配筛选的成本。
