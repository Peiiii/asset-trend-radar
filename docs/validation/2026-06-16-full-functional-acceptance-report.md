# Gold Insights 全功能完整性验收报告

验收时间：2026-06-16 10:12 CST

## 结论

本轮已从单一数字货币 MVP 扩展为全市场本地资产趋势雷达。当前运行版本使用真实 Yahoo Finance 行情数据，不使用假行情，覆盖 A 股、美股、港股、商品、宏观代理、外汇、债券、加密，并实现设计文档中的主要产品入口：全市场图表墙、资产宇宙、机会扫描、单资产详情、自选图表墙、数据源与任务状态。

当前本地服务：

- 前端：http://127.0.0.1:5193/
- Runtime API：http://127.0.0.1:3193/
- SQLite：`.tmp/manual-full-runtime-data-5y/gold-insights.sqlite`
- Raw JSONL：`.tmp/manual-full-runtime-data-5y/raw`

## 数据完整性

当前运行态 API 验证：

```json
{
  "assetCount": 71,
  "barCount": 109012,
  "dailyItems": 57,
  "dailyMin": 1210,
  "monthlyItems": 57,
  "monthlyMin": 44,
  "monthlyMax": 61,
  "m15Items": 57
}
```

本地落盘：

```text
raw files: 228
sqlite size: 37M
```

覆盖市场：

```json
["A 股", "美股", "商品", "宏观", "外汇", "债券", "港股", "加密"]
```

覆盖资产类型：

```json
["index", "commodity", "equity", "macro", "crypto"]
```

覆盖层级：

```json
["sector-index", "broad-index", "instrument", "company", "macro-indicator", "theme-basket"]
```

## 功能完整性验收

| 设计功能 | 验收结果 | 证据 |
| --- | --- | --- |
| 真实数据优先，无假行情 | 通过 | `pnpm smoke` 拉取真实 Yahoo 数据，57 个可展示资产，109161 条 K 线 |
| 多图同屏图表墙 | 通过 | 浏览器显示 57 张图表卡 |
| 多市场筛选 | 通过 | A 股筛选返回 12 张卡，且全部为 A 股 |
| 多品种覆盖 | 通过 | index / equity / commodity / macro / crypto 全部出现 |
| 多层级覆盖 | 通过 | 宽基、行业、主题、公司、工具/合约、宏观指标全部出现 |
| 多周期走势 | 通过 | 15m / 1H / 4H / 1D / 1W / 1M 均通过 smoke 或浏览器验证 |
| 1M/3M/6M/1Y/3Y/5Y 区间 | 通过 | 5Y 月线浏览器验证为 57 个资产，月线 44-61 点 |
| MACD/均线指标 | 通过 | 图表卡和详情页返回 indicators，3M NVDA 指标不少于 60 条 |
| 机会扫描 | 通过 | 浏览器机会扫描页显示 21 行事件 |
| 资产宇宙树 | 通过 | 浏览器资产宇宙页显示 14 个节点卡；API 顶层节点 6 个 |
| 单资产详情 | 通过 | 资产详情页展示价格、收益、趋势分、信号解释、相关资产 |
| 自选图表墙 | 通过 | Watchlist API 添加 `us-nvda` 后返回 1 个自选资产 |
| Compare 多资产对比 | 通过 | Compare API 返回 4 个资产；浏览器对比面板显示 2 张图 |
| 数据源与任务状态 | 通过 | 数据状态页显示 4 个数据卡、3 个 provider 卡 |
| 本地 SQLite 存储 | 通过 | SQLite 109012 条 K 线，37M |
| Raw 原始数据落盘 | 通过 | raw JSONL 文件 228 个 |
| 后端 package-first | 通过 | 核心运行时在 `packages/local-runtime`，入口为 `apps/local-shell` 薄壳 |

## API 验收

已实现并验证：

```text
GET /api/universe/tree
GET /api/assets?parentId=:assetId
GET /api/assets/:assetId
GET /api/assets/:assetId/bars?timeframe=1d&range=1y
GET /api/assets/:assetId/indicators?timeframe=1d&range=1y
GET /api/chart-wall?universe=global&level=all&timeframe=1d&range=1y&sort=trend_score
GET /api/scanner/events?universe=global&eventType=all
GET /api/compare?assetIds=us-nvda,cn-csi300,cmd-gold,btcusdt&timeframe=1d&range=6m
GET /api/watchlists
POST /api/watchlists
POST /api/watchlists/:watchlistId/assets
DELETE /api/watchlists/:watchlistId/assets/:assetId
GET /api/data-health
POST /api/refresh
```

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
  "sources": ["yahoo"],
  "assetCount": 71,
  "barCount": 109161,
  "chartWallItems": 57,
  "markets": ["A 股", "美股", "商品", "宏观", "外汇", "债券", "港股", "加密"],
  "assetTypes": ["index", "commodity", "equity", "macro", "crypto"],
  "levels": ["sector-index", "broad-index", "instrument", "company", "macro-indicator", "theme-basket"],
  "aShareItems": 12,
  "weeklyItems": 57,
  "monthlyItems": 57,
  "fifteenMinuteItems": 57,
  "oneHourItems": 57,
  "fourHourItems": 57,
  "compareAssets": 4,
  "watchlistAssets": 1,
  "latestBarAt": "2026-06-16T02:11:50.000Z",
  "lastIngestionAt": "2026-06-16T02:11:56.031Z"
}
```

## 浏览器验收

全市场图表墙：

```json
{
  "title": "全市场图表墙",
  "cards": 57,
  "summary": ["71", "109,012", "06/16 10:06", "06/16 10:06"],
  "hasError": false
}
```

6 个一级视图：

```json
{
  "universe": { "title": "资产宇宙", "universeCards": 14, "hasError": false },
  "scanner": { "title": "机会扫描", "scannerRows": 21, "hasError": false },
  "detail": { "title": "单资产详情", "chartCards": 8, "hasError": false },
  "watchlist": { "title": "自选图表墙", "hasError": false },
  "dataHealth": { "title": "数据源与任务状态", "dataCards": 4, "providerCards": 3, "hasError": false },
  "chartWall": { "title": "全市场图表墙", "chartCards": 57, "hasError": false }
}
```

A 股筛选：

```json
{
  "cards": 12,
  "hasError": false,
  "sample": [
    "512480.SS 半导体 ETF",
    "399001.SZ 深证成指",
    "300750.SZ 宁德时代"
  ]
}
```

5Y 月线：

```json
{
  "cards": 57,
  "text": "5Y / 1mo / 57 个资产",
  "hasError": false
}
```

浏览器控制台错误：

```json
[]
```

## 说明

- 当前必跑真实数据源为 Yahoo Finance chart endpoint；Binance provider 和 FRED provider 保留在 adapter 层，但不作为完整 smoke 的必成功依赖，避免外部连接超时或 504 阻塞本地产品验收。
- 宏观指标采用可真实获取的市场代理：美债 ETF、10Y 利率、VIX、美元指数、主要外汇对。
- 本产品是投研辅助工具，界面和事件文案只表达“触发信号/值得研究/风险提示”，不构成投资建议。
