# 市场强弱板功能验证报告

日期：2026-06-17

## 背景

长期目标要求产品不只是展示单个资产走势，还要让用户快速判断机会可能集中在哪些市场。机会榜单解决了“具体资产”的发现问题，本次新增市场强弱板，解决“先看哪个市场”的问题。

## 实现范围

新增 `MarketPulseBoard`，展示当前图表墙结果按市场聚合后的强弱信息：

- 市场资产数量。
- 平均 1M 涨幅。
- 上涨占比。
- 平均趋势分。
- 扫描事件数量。
- 当前市场领头资产。

点击市场卡片会写入 URL 查询参数并切换图表墙市场筛选。

## 职责边界

- 数据来自后端返回的真实 `ChartWallItem`。
- 前端只做当前页面结果的展示层聚合，不新增数据源、不直接读取 SQLite、不改变后端排序口径。
- 组件位于 `apps/web-shell/src/features/chart-wall/components/market-pulse-board/`。
- 未新增 package deep import。

## API 数据验证

命令：

```bash
curl -s 'http://127.0.0.1:3193/api/chart-wall?range=6m&timeframe=1d&universe=global&level=all&market=all&assetType=all&sort=trend_score'
```

摘要：

```json
{
  "items": 114,
  "markets": ["基金", "美股", "A 股", "商品", "宏观", "外汇", "债券", "港股", "加密"],
  "marketCount": 9
}
```

## 浏览器验证

地址：

```text
http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&sort=trend_score
```

使用本机 Chrome + Playwright 验证：

```json
{
  "hasMarketPulse": true,
  "hasPulseMetrics": true,
  "hasOpportunityLeaderboard": true,
  "cardCount": 9,
  "firstCardText": ["债券", "3 个资产", "平均 1M", "+1.53%", "上涨占比", "100%", "趋势分", "-1"],
  "urlAfterClick": "http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&sort=trend_score&market=%E5%80%BA%E5%88%B8",
  "marketFilterApplied": true,
  "errors": []
}
```

已确认：

- 市场强弱板可见。
- 平均 1M、上涨占比、趋势分、事件等指标可见。
- 9 个市场卡片渲染正常。
- 点击市场卡片会更新 URL 并应用市场筛选。
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
  "barCount": 162325,
  "chartWallItems": 111,
  "fundItems": 69,
  "commodityItems": 12,
  "markets": ["美股", "基金", "A 股", "商品", "外汇", "宏观", "债券", "港股", "加密"]
}
```

## 维护性结论

- `MarketPulseBoard` 组件 125 行，CSS 163 行，均低于 360 行限制。
- `chart-wall-page.tsx` 只新增组件入口，仍在既有 oversized baseline 内。
- `lint:maintainability:guard` 通过，red-zone 文件/目录数量未增加。

## 结论

市场强弱板已可用。用户进入图表墙后，可以先从市场层面判断机会或风险集中区域，再进入机会榜单和具体资产详情，发现路径更接近成熟行情终端。
