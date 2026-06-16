# Gold Insights 功能验证报告

验证时间：2026-06-16 02:20-02:23 CST

## 结论

本轮初始化交付已通过功能验证。当前应用已经从早期 seed/fake 数据切换为真实 Binance 现货日线数据链路，并完成本地 SQLite 存储、指标计算、机会事件扫描、API 服务、中文图表墙前端和可重复 smoke 验证。

## 本轮实现范围

- 后端按 package-first 组织：
  - `packages/local-runtime`：本地运行时、采集、查询、HTTP API。
  - `packages/data-storage`：SQLite schema、资产/K 线/指标/事件/采集任务 repository。
  - `packages/data-adapters`：Binance K 线 provider，其他供应商只保留明确 reserved provider。
  - `packages/indicator-engine`：MA、EMA、MACD 计算。
  - `packages/scanner-engine`：MACD、突破、多周期走势事件。
  - `apps/local-shell`：薄入口，只负责读取 env 并启动 runtime。
- 前端重做为中文走势墙：
  - `src/features/chart-wall` 只从 `/api/chart-wall`、`/api/data-health`、`/api/refresh` 读取真实接口。
  - `packages/ui` 提供图表墙可复用控件、趋势/信号 badge、sparkline、MACD mini panel。
- 已删除旧的 fake/seed 数据路径：
  - `src/data/market-universe.fixture.ts`
  - `src/domain/asset.types.ts`
  - `src/services/market-universe.service.ts`
  - 旧英文 dashboard 组件。

## 数据链路验证

手工 runtime：

```bash
GOLD_INSIGHTS_DATA_DIR=.tmp/manual-runtime-data GOLD_INSIGHTS_PORT=3193 GOLD_INSIGHTS_HISTORY_LIMIT=220 pnpm dev:runtime
```

启动结果：

- API：`http://127.0.0.1:3193`
- SQLite：`.tmp/manual-runtime-data/gold-insights.sqlite`
- Raw JSONL：`.tmp/manual-runtime-data/raw`

`GET /api/data-health` 返回：

```json
{
  "assetCount": 8,
  "barCount": 1760,
  "latestBarAt": "2026-06-15T00:00:00.000Z",
  "lastIngestionAt": "2026-06-15T18:18:08.047Z"
}
```

`GET /api/chart-wall?range=6m&timeframe=1d` 抽样：

```json
{
  "source": "binance",
  "count": 8,
  "first": {
    "symbol": "BNB/USDT",
    "lastPrice": 623.76,
    "returnPct": -29.245218811679035,
    "trendScore": -30,
    "macdState": "bullish-cross",
    "sparkline": 186,
    "indicators": 186,
    "events": 1
  }
}
```

`GET /api/assets/btcusdt/bars?range=3m&timeframe=1d` 抽样：

```json
{
  "symbol": "BTC/USDT",
  "bars": 93,
  "indicators": 93,
  "source": "binance"
}
```

本地落盘结果：

- 手工 runtime raw JSONL 文件数：8
- 手工 runtime SQLite 大小：600K
- smoke runtime raw JSONL 文件数：8
- smoke runtime SQLite 大小：668K

## 自动化验证

已新增：

```bash
pnpm smoke
```

该脚本会启动独立 runtime、使用独立 `.tmp/functional-smoke-data` 数据目录，并验证：

- 启动采集后资产数不少于 8。
- SQLite 中 K 线记录不少于 `8 * 180`。
- 图表墙来源为 Binance。
- 图表墙资产卡不少于 8。
- 每张卡都有 last price、sparkline 和 MACD indicators。
- BTC 3M 明细返回 93 条 K 线和 93 条指标。
- universe tree 正常返回。
- `POST /api/refresh` 会更新采集时间。

最终 smoke 输出：

```json
{
  "status": "passed",
  "source": "binance",
  "assetCount": 8,
  "barCount": 1760,
  "chartWallItems": 8,
  "btcBars": 93,
  "latestBarAt": "2026-06-15T00:00:00.000Z",
  "lastIngestionAt": "2026-06-15T18:22:36.018Z"
}
```

## 前端浏览器验证

页面：

```text
http://127.0.0.1:5193/
```

桌面渲染验证：

```json
{
  "title": "全球资产走势墙",
  "cards": 8,
  "eventCards": 1,
  "summary": ["8", "1,760", "06/15 08:00", "06/16 02:18"],
  "hasLoading": false,
  "hasError": false
}
```

搜索交互：

```json
{
  "cards": 1,
  "text": "SOL/USDTSolana明显转弱75.49 USDT-42.93%零轴下区间内MACD0.967趋势分 -65暂无事件"
}
```

时间跨度切换：

```json
{
  "rangeLabel": "1M / 1d",
  "cards": 1,
  "text": "SOL/USDTSolana偏弱75.49 USDT-12.77%零轴下区间内MACD0.967趋势分 -26暂无事件"
}
```

移动端 390px 验证：

```json
{
  "width": 390,
  "documentWidth": 390,
  "cards": 8,
  "columns": "358px",
  "hasError": false
}
```

浏览器控制台错误：

```json
[]
```

补充验证时间：2026-06-16 09:32 CST

左侧菜单切换验证：

```json
{
  "currentUrl": "http://127.0.0.1:5193/",
  "eventsView": {
    "active": "机会事件",
    "title": "机会事件",
    "chartCards": 0,
    "dataCards": 0,
    "hasError": false
  },
  "dataView": {
    "active": "数据状态",
    "title": "数据状态",
    "dataCards": 4,
    "tableRows": 8,
    "hasError": false
  },
  "chartView": {
    "active": "走势墙",
    "title": "全球资产走势墙",
    "chartCards": 8,
    "hasError": false
  }
}
```

## 命令验证

全部通过：

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm smoke
```

`pnpm build` 输出：

```text
dist/index.html                   0.72 kB
dist/assets/index-CRLBPntm.css    8.89 kB
dist/assets/index-CsqqgjY3.js   157.60 kB
```

## 已知边界

- 当前真实数据源先落在 Binance 主流现货交易对，A 股板块、重点公司、宏观和商品数据 provider 已在架构中预留，但未接入真实供应商凭证。
- 当前 K 线周期先支持日线 `1d`，页面控件和 API 已保留 timeframe 参数。
- `node:sqlite` 在当前 Node 版本会输出 ExperimentalWarning，但功能验证通过。
- 本报告不构成投资建议，只验证产品功能链路。
