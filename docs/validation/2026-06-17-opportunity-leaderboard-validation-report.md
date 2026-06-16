# 机会榜单功能验证报告

日期：2026-06-17

## 背景

长期目标要求产品能帮助用户“肉眼快速发现机会”，并且图表墙体验要接近交易所/顶级行情产品。本次增强在图表墙上方增加机会榜单，把当前筛选结果自动提炼成多个可扫视榜单，减少用户只靠逐张图表寻找线索的成本。

## 实现范围

- 新增 `OpportunityLeaderboard` 组件。
- 在全市场图表墙视图中，基于当前 `filteredItems` 展示：
  - `1M 领涨`
  - `1M 承压`
  - `趋势最强`
  - `量能异动`
  - `事件密集`
- 每个榜单显示前 5 个资产，支持点击资产进入详情，支持快速加入对比。
- 单个榜单缺少可排名数据时展示空状态。

## 职责边界

- 数据、涨幅、趋势分、量比、扫描事件仍来自 `packages/local-runtime` 返回的 `ChartWallItem`。
- 机会榜单只是当前页面筛选结果的视图级重排，不引入新的业务事实。
- 新组件位于 `apps/web-shell/src/features/chart-wall/components/opportunity-leaderboard/`。
- 未新增 package deep import，也未让 app 直接读取 SQLite 或供应商 API。

## API 数据验证

命令：

```bash
curl -s 'http://127.0.0.1:3193/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=all&assetType=all&sort=trend_score'
```

摘要：

```json
{
  "items": 114,
  "positive": 68,
  "strong": 28,
  "eventful": 50,
  "first": {
    "name": "财通成长优选混合A",
    "return1m": 52.5497113534317,
    "trendScore": 344,
    "volumeRatio": null,
    "events": 2
  }
}
```

当前数据足够生成涨幅、趋势和事件榜单。

## 浏览器验证

地址：

```text
http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&sort=trend_score
```

使用本机 Chrome + Playwright 验证：

```json
{
  "hasLeaderboard": true,
  "hasLeaderGroups": true,
  "rowButtons": 25,
  "compareButtons": 25,
  "navigatedToAssetDetail": true,
  "errors": []
}
```

已确认：

- 机会榜单标题可见。
- 5 个榜单分组全部可见。
- 榜单共渲染 25 个资产行。
- 每行有资产详情入口和对比按钮。
- 点击资产行可进入 `/assets/:assetId` 详情页。
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
  "barCount": 162302,
  "chartWallItems": 111,
  "fundItems": 69,
  "commodityItems": 12,
  "taskCenter": {
    "tasks": 4,
    "totalCount": 4,
    "pipelineSummaries": 3
  }
}
```

## 维护性结论

- `OpportunityLeaderboard` 组件 176 行，CSS 202 行，均低于 360 行限制。
- `chart-wall-page.tsx` 只增加组件 import 和渲染入口，仍在既有 oversized baseline 内。
- `lint:maintainability:guard` 通过，red-zone 文件/目录数量未增加。

## 结论

机会榜单已可用。用户进入图表墙后，不只看到一组分散图表，还能先看到涨幅、趋势、量能和事件榜单，从而更快定位值得进一步查看或加入对比的资产。
