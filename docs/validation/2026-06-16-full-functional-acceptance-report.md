# Gold Insights 全功能完整性验收报告

验收时间：2026-06-16 22:02 CST

## 结论

本轮已从单一数字货币 MVP 扩展为本地运行的全市场资产趋势雷达。当前版本使用真实行情和真实基金净值，不使用假行情；覆盖 A 股、美股、港股、商品、宏观代理、外汇、债券、加密、基金/ETF，并实现全市场图表墙、资产宇宙、机会扫描、单资产详情、自选图表墙、数据源与任务状态。

阶段性提交已完成：

```text
f82a7eb Initialize local market insight dashboard
```

## 基金数据说明

基金数据分两类：

| 类型 | 来源 | 当前覆盖 | 说明 |
| --- | --- | ---: | --- |
| ETF / 可交易基金 | Yahoo Finance chart endpoint | 25 个 | 包含美股 ETF、A 股 ETF、港股 ETF、商品 ETF、债券 ETF |
| 场外基金净值 | 东方财富 F10 历史净值接口 | 44 个 | 接口形态：`https://fundf10.eastmoney.com/F10DataApi.aspx?type=lsjz&code=<基金代码>&page=<页码>&per=49` |

当前基金/ETF 合计 69 个，另支持按基金代码/名称从东方财富基金库搜索并按需导入。之前页面看起来“只有几只基金”，原因不是数据源只能拿几只，而是资产宇宙里只维护了少量场外基金种子；本轮已扩展到 44 只常见场外基金，并补上本地动态导入闭环。终态设计仍然应该继续做自动基金池同步，从东方财富/天天基金的基金列表、排行、主题分类接口中定期发现全量基金，而不是长期依赖人工种子。

场外基金只有每日单位净值，没有交易所 K 线里的开高低收和成交量。系统为了复用同一套趋势、MACD、图表墙和比较逻辑，会把单位净值映射为 `open/high/low/close = unit_nav`，`volume = 0`。这不是假数据，而是基金净值数据在 K 线模型中的统一表示。

样例实测：

```json
[
  {
    "code": "005827",
    "name": "易方达蓝筹精选混合",
    "source": "eastmoney",
    "latest": "2026-06-15",
    "latestClose": 1.5427
  },
  {
    "code": "161725",
    "name": "招商中证白酒指数(LOF)",
    "source": "eastmoney",
    "latest": "2026-06-15",
    "latestClose": 0.5386
  },
  {
    "code": "320007",
    "name": "诺安成长混合A",
    "source": "eastmoney",
    "latest": "2026-06-15",
    "latestClose": 2.419
  }
]
```

## 数据完整性

完整 smoke 使用临时本地库重新拉取真实数据，通过结果：

```json
{
  "status": "passed",
  "sources": ["yahoo", "eastmoney"],
  "assetCount": 132,
  "barCount": 162347,
  "chartWallItems": 111,
  "fundItems": 69,
  "commodityItems": 12,
  "mutualFundBars": 365,
  "importedFund": {
    "id": "fund-cn-000011",
    "barsImported": 756,
    "chartWallVisible": true
  },
  "rawFileCount": 313,
  "databaseSizeBytes": 59633664
}
```

按数据源：

```json
[
  { "source": "yahoo", "count": 128327 },
  { "source": "eastmoney", "count": 34020 }
]
```

按周期：

```json
[
  { "timeframe": "15m", "count": 14788 },
  { "timeframe": "1d", "count": 117973 },
  { "timeframe": "1h", "count": 14788 },
  { "timeframe": "4h", "count": 14798 }
]
```

覆盖市场：

```json
["美股", "基金", "A 股", "商品", "宏观", "外汇", "债券", "港股", "加密"]
```

覆盖资产类型：

```json
["fund", "commodity", "index", "equity", "macro", "crypto"]
```

## 功能完整性验收

| 功能 | 结果 | 证据 |
| --- | --- | --- |
| 真实数据优先，无假行情 | 通过 | smoke 重新拉取 Yahoo + Eastmoney，共 161,685 条 bars |
| 场外基金净值 | 通过 | Eastmoney 44 只基金、33,264 条净值 bars |
| 基金/ETF 图表墙 | 通过 | `assetType=fund` 返回 69 个基金/ETF |
| 基金搜索 | 通过 | `/api/funds/eastmoney/search?keyword=000011` 返回华夏大盘精选混合A |
| 基金按需导入 | 通过 | `/api/funds/eastmoney/import` 导入 `fund-cn-000011`，756 条净值，图表墙可见 |
| 多图同屏图表墙 | 通过 | 全市场图表墙返回 111 个可展示资产 |
| 多市场筛选 | 通过 | A 股筛选返回 12 个资产，商品筛选返回 12 个资产 |
| 多品种覆盖 | 通过 | fund / commodity / index / equity / macro / crypto 全部出现 |
| 多层级覆盖 | 通过 | 宽基、行业、主题、公司、工具/合约、宏观指标均覆盖 |
| 多周期走势 | 通过 | 15m / 1H / 4H / 1D / 1W / 1M 均通过 smoke |
| 1M/3M/6M/1Y/3Y/5Y 区间 | 通过 | 周线/月线 API 返回 111 个资产 |
| MACD 指标 | 通过 | chart wall item 返回 indicators，详情页展示 DIF/DEA，卡片只展示 histogram |
| MACD 对齐 | 通过 | 技术图使用同一个 SVG、同一套 x 轴映射价格与 MACD |
| 坐标与时间刻度 | 通过 | 技术图和 sparkline 均显示价格范围与起止时间 |
| hover 明细 | 通过 | hover tooltip 展示日期、收盘价、Hist、DIF、DEA |
| 名称主次 | 通过 | 卡片、表格、详情均以名称为主，代码/编号为辅 |
| React Router | 通过 | `/chart-wall`、`/universe`、`/scanner`、`/watchlist`、`/data-health`、`/assets/:assetId` |
| URL 查询态 | 通过 | `range/timeframe/market/assetType/level/sort/signal/view/q` 写入 URL |
| 根目录清理 | 通过 | 前端源码位于 `apps/web-shell/src`，根目录无废弃 `src` |
| 后端 package-first | 通过 | 核心 runtime 位于 `packages/local-runtime`，`apps/local-shell` 只是薄入口 |
| 本地 SQLite | 通过 | smoke SQLite 文件 59,150,336 bytes |
| Raw JSONL | 通过 | smoke 产生 312 个 raw 文件 |
| 资产宇宙树 | 通过 | API 返回资产类和市场层级节点 |
| 机会扫描 | 通过 | scanner events endpoint 返回结构化事件数组 |
| 自选图表墙 | 通过 | watchlist add/remove 与 pinned signal filter 通过 |
| Compare 多资产对比 | 通过 | compare API 返回 4 个资产 |
| 数据健康页 | 通过 | 展示 source/timeframe/provider/job 状态 |
| 同步任务状态 | 通过 | health 返回 running/success 最新任务，不再运行中显示空 |
| 冷启动性能 | 通过 | ingestion 改为 4 路有限并发，完整 smoke 在 420 秒预算内通过 |
| 刷新接口 | 通过 | `POST /api/refresh` 完成后更新 lastIngestionAt |
| source facet | 通过 | chart wall sources 同时包含 `yahoo` 和 `eastmoney` |
| signal facet | 通过 | 强趋势、偏弱、涨跌、MACD、突破、放量、自选均有 facet |

## 自动化验收

全部通过：

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm smoke
```

完整 smoke 输出：

```json
{
  "status": "passed",
  "sources": ["yahoo", "eastmoney"],
  "assetCount": 132,
  "barCount": 162347,
  "chartWallItems": 111,
  "fundItems": 69,
  "commodityItems": 12,
  "mutualFundBars": 365,
  "importedFund": {
    "id": "fund-cn-000011",
    "barsImported": 756,
    "chartWallVisible": true
  },
  "markets": ["美股", "基金", "A 股", "商品", "宏观", "外汇", "债券", "港股", "加密"],
  "assetTypes": ["fund", "commodity", "index", "equity", "macro", "crypto"],
  "levels": ["sector-index", "instrument", "broad-index", "company", "macro-indicator", "theme-basket"],
  "rawFileCount": 313,
  "databaseSizeBytes": 59633664,
  "aShareItems": 12,
  "weeklyItems": 111,
  "monthlyItems": 111,
  "fifteenMinuteItems": 67,
  "oneHourItems": 67,
  "fourHourItems": 67,
  "compareAssets": 4,
  "watchlistAssets": 1,
  "latestBarAt": "2026-06-16T14:25:38.000Z",
  "lastIngestionAt": "2026-06-16T14:25:44.370Z"
}
```

## 浏览器验收

本地服务：

```text
Frontend: http://127.0.0.1:5193/
Runtime:  http://127.0.0.1:3193/
```

基金图表墙页面：

```json
{
  "url": "http://127.0.0.1:5193/chart-wall?market=基金&assetType=fund&view=grid&range=6m&timeframe=1d",
  "title": "全市场图表墙",
  "cards": 44,
  "samples": [
    { "name": "创金合信专精特新股票发起A", "symbol": "014736", "source": "eastmoney" },
    { "name": "广发全球精选股票(QDII)人民币A", "symbol": "270023", "source": "eastmoney" },
    { "name": "交银精选混合", "symbol": "519688", "source": "eastmoney" }
  ],
  "cardTechnicalChart": {
    "paths": 1,
    "histogramBars": 186,
    "axisTexts": ["3.281", "1.425", "MACD", "09-03", "06-15"]
  }
}
```

基金发现与导入：

```json
{
  "searchKeyword": "000011",
  "result": "华夏大盘精选混合A / 000011 / 混合型-灵活 / 华夏基金",
  "importStatus": "华夏大盘精选混合A 已导入，756 条净值",
  "urlAfterImport": "http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&market=基金&assetType=fund",
  "fundCardsAfterImport": 45,
  "targetVisible": true
}
```

数据健康页：

```json
{
  "title": "数据源与任务状态",
  "providerCards": 4,
  "eastmoneyProvider": "东方财富基金 active 44 个资产",
  "barsBySource": {
    "yahoo": 128615,
    "eastmoney": 36016
  },
  "job": "成功 / 06/16 22:05"
}
```

基金详情页：

```json
{
  "url": "http://127.0.0.1:5193/assets/fund-cn-005827?range=1y&timeframe=1d",
  "title": "单资产详情",
  "asset": "易方达蓝筹精选混合 / 005827",
  "technicalChart": {
    "paths": 3,
    "histogramBars": 365,
    "axisTexts": ["2.077", "1.543", "MACD", "12-10", "06-15"]
  }
}
```

浏览器没有新的 error。开发期仅有 React Router v7 future flag warning，不影响当前功能。

## 本轮关键优化点

1. 引入 `fund` 资产类型，基金不再混在 index/equity 里。
2. 接入东方财富 F10 场外基金历史净值。
3. 扩展 44 只常见场外基金种子。
4. 扩展 25 个 ETF/可交易基金。
5. 增加东方财富基金搜索 API。
6. 增加按基金代码动态导入 API。
7. 导入基金会写入资产、净值 bars、指标、扫描事件和 raw JSONL。
8. 前端增加紧凑基金发现工具。
9. 动态导入后自动切换到基金筛选并刷新图表墙。
10. smoke 覆盖动态基金搜索和导入。
11. 场外基金只抓 1d，避免伪造分钟级净值。
12. 基金净值映射为统一 OHLCV 模型。
13. chart wall 增加 source、dataPointCount、first/latest bar。
14. chart wall 增加 1D/1W/1M/3M/6M/1Y 固定窗口收益。
15. chart wall 增加 drawdown、volumeRatio、MA、MACD、RSI。
16. 增加 summary 和 facets。
17. 增加 signal filter。
18. 增加 return、volume、drawdown、event、market、asset type 等排序。
19. 左侧导航改为 React Router NavLink。
20. 页面状态进入 URL query。
21. 前端源码迁移到 `apps/web-shell/src`。
22. 后端核心放在 package，入口保持薄壳。
23. API 启动和后台 refresh 解耦。
24. ingestion 增加并发保护。
25. ingestion 改为 4 路有限并发。
26. health 能展示 running job。
27. data health 增加 raw/db/timeframe/source/provider/job。
28. 卡片名称主、代码辅。
29. 表格名称主、代码辅。
30. 技术图价格与 MACD 共用 x 轴。
31. 卡片 MACD 只展示 histogram，避免 DIF/DEA 压缩柱体。
32. 详情页保留 DIF/DEA。
33. MACD 正红负绿并显示零轴。
34. 图表加入坐标和时间刻度。
35. hover tooltip 展示具体点位数据。
36. smoke 增加 Eastmoney 和 fund 断言。
37. smoke readiness 等待真实数据源完整落库。
38. smoke 等待预算调整为真实网络数据量可接受的 420 秒。

## 已知边界

- 当前 44 只场外基金是代表性种子，不是全量基金宇宙。终态需要自动同步基金列表、分类、规模、评级、基金经理、持仓、费率等元数据。
- 东方财富场外基金当前每只抓约 756 条日净值，适合 1Y 日线和 3Y/月线观察；更长历史应做懒加载或后台增量。
- 场外基金没有成交量，volume-based signal 对这类资产天然不适用，应在后续 UI 中按资产类型隐藏或降权。
- 当前产品是投研辅助工具，只展示趋势和信号，不构成投资建议。
