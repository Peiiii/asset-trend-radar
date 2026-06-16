# 大宗商品资产宇宙扩容验证报告

## 背景

目标要求扩充真实数据，尤其包括大宗商品和基金。基金侧已经有 27018 条东方财富基金目录和 80 个走势池基金/ETF；商品侧原走势池只有 12 个资产，覆盖偏薄。本轮扩充商品期货和商品 ETF，使图表墙能覆盖更多商品链条。

## 职责边界

- `packages/local-runtime`：扩充 `asset-universe.config.ts`，属于本地 runtime 的业务资产宇宙配置。
- `packages/data-adapters`：未改动；继续使用 Yahoo chart endpoint 获取真实 OHLCV。
- `packages/data-storage`：未改动；继续用现有 SQLite repository 存储资产、K 线和指标。
- `apps/web-shell`：未改动；扩容后的资产通过既有图表墙、表格筛选和排序展示。
- `scripts/smoke`：提高真实覆盖断言，防止后续商品覆盖退化。

本轮没有假数据，也没有新增不可验证的静态展示。

## 新增覆盖

新增商品期货：

- NYMEX 铂金 `PL=F`
- NYMEX 钯金 `PA=F`
- CBOT 玉米 `ZC=F`
- CBOT 小麦 `ZW=F`
- CBOT 大豆 `ZS=F`
- ICE 咖啡 `KC=F`
- ICE 原糖 `SB=F`
- ICE 棉花 `CT=F`
- ICE 可可 `CC=F`
- CME 活牛 `LE=F`
- CME 瘦猪肉 `HE=F`

新增商品 ETF：

- SPDR 黄金 ETF `GLD`
- iShares 黄金信托 `IAU`
- SPDR Mini 黄金信托 `GLDM`
- abrdn 铂金 ETF `PPLT`
- abrdn 钯金 ETF `PALL`
- United States 铜指数基金 `CPER`
- Teucrium 玉米基金 `CORN`
- Teucrium 小麦基金 `WEAT`
- Teucrium 大豆基金 `SOYB`
- Teucrium 糖基金 `CANE`
- Invesco 基本金属基金 `DBB`

## Symbol 可用性验证

变更前先用 Yahoo chart endpoint 对候选 symbol 做 1 个月日线探测，新增 symbol 均返回有效 bars。示例结果：

```json
[
  { "symbol": "PL=F", "ok": true, "bars": 21 },
  { "symbol": "PA=F", "ok": true, "bars": 21 },
  { "symbol": "ZC=F", "ok": true, "bars": 21 },
  { "symbol": "KC=F", "ok": true, "bars": 21 },
  { "symbol": "GLD", "ok": true, "bars": 21 },
  { "symbol": "CORN", "ok": true, "bars": 21 },
  { "symbol": "DBB", "ok": true, "bars": 21 }
]
```

## Smoke 验证

本轮同步提高 smoke 门槛：

- `assetCount >= 150`
- `chartWall.items.length >= 125`
- `chartWall.summary.totalUniverseAssets >= 85`
- 商品筛选 `commodityWall.items.length >= 30`
- Yahoo provider `assetCount >= 75`

`pnpm smoke` 通过，关键输出：

```json
{
  "status": "passed",
  "assetCount": 154,
  "barCount": 204318,
  "chartWallItems": 133,
  "fundItems": 80,
  "commodityItems": 34,
  "rawFileCount": 401,
  "barsBySource": [
    { "source": "yahoo", "count": 170298 },
    { "source": "eastmoney", "count": 34020 }
  ]
}
```

## 本地运行验证

重启 `http://127.0.0.1:3193` runtime 后，本地 API 返回：

```txt
commodity=34
latestJob=success
```

浏览器验证地址：

```txt
http://127.0.0.1:5193/chart-wall?view=table&range=6m&timeframe=1d&market=商品&assetType=all&sort=volume_ratio&order=desc
```

浏览器验证结果：

```json
{
  "toolbar": "34 个资产\n当前按 量比 降序 排列\n上涨\n22\n下跌\n12\n有事件\n4\n强趋势\n0",
  "hasExpandedCount": true,
  "hasNewFutures": true,
  "hasCommodityEtf": true,
  "errors": []
}
```

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

## 维护性结论

- `lint:maintainability:guard` 通过，治理 backlog 未增长。
- 本轮未触碰既有红区文件。
- `asset-universe.config.ts` 为 242 行，仍低于 360 行阈值。
- `functional-smoke.mjs` 为 296 行，已接近阈值；后续如果继续增加 smoke 覆盖，应优先拆分 smoke 断言模块。
