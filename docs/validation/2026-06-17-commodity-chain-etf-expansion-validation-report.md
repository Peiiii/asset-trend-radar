# 商品链条 ETF 扩容验证报告

## 背景

目标要求扩充真实数据，尤其包括大宗商品。现有商品池已经覆盖期货、贵金属、能源、农产品和商品 ETF，但对产业链和宏观周期观察仍有缺口：铀、锂/电池金属、稀土、木材、碳信用、航运/干散货等主题缺少可扫盘标的。

## 本轮新增

新增 6 个 Yahoo Finance 可拉取的商品链条 ETF：

- `URA`：Global X 铀矿 ETF，标签 `铀 / 核能 / 能源`
- `LIT`：Global X 锂电池 ETF，标签 `锂 / 电池金属 / 新能源`
- `REMX`：VanEck 稀土战略金属 ETF，标签 `稀土 / 工业金属 / 战略金属`
- `WOOD`：iShares 全球木材林业 ETF，标签 `木材 / 林业 / 周期`
- `KRBN`：KraneShares 全球碳信用 ETF，标签 `碳信用 / 能源转型`
- `BDRY`：Breakwave 干散货运价 ETF，标签 `运价 / 航运 / 周期`

没有加入高重合的备选 `URNM`、`CUT`，避免资产池膨胀过快。

## Symbol 可用性

变更前通过 Yahoo chart endpoint 验证 1 个月日线：

```json
[
  { "symbol": "URA", "ok": true, "bars": 21 },
  { "symbol": "URNM", "ok": true, "bars": 21 },
  { "symbol": "LIT", "ok": true, "bars": 21 },
  { "symbol": "REMX", "ok": true, "bars": 21 },
  { "symbol": "WOOD", "ok": true, "bars": 21 },
  { "symbol": "CUT", "ok": true, "bars": 21 },
  { "symbol": "KRBN", "ok": true, "bars": 21 },
  { "symbol": "BDRY", "ok": true, "bars": 21 }
]
```

## 边界确认

- `packages/local-runtime`：扩充本地资产宇宙配置。
- `packages/data-adapters`：未改动，继续用 Yahoo chart endpoint。
- `packages/data-storage`：未改动，继续由 runtime 写 SQLite。
- `apps/web-shell`：未改动，新增资产通过既有图表墙、表格、主题筛选展示。
- `scripts/smoke`：提高商品覆盖断言，新增主题 facet 防退化断言。

## Smoke 验证

`pnpm smoke` 通过：

```json
{
  "status": "passed",
  "assetCount": 160,
  "chartWallItems": 139,
  "fundItems": 86,
  "commodityItems": 40,
  "barCount": 215840,
  "barsBySource": [
    { "source": "yahoo", "count": 181820 },
    { "source": "eastmoney", "count": 34020 }
  ]
}
```

## 当前本地 Runtime 验证

重启 `http://127.0.0.1:3193` 后，启动刷新成功：

```json
{
  "assetCount": 162,
  "barCount": 224390,
  "latestJob": "success",
  "latestBarAt": "2026-06-17T00:49:14.000Z"
}
```

商品 API 验证：

```json
{
  "items": 40,
  "tags": [
    { "value": "电池金属", "count": 1 },
    { "value": "木材", "count": 1 },
    { "value": "碳信用", "count": 1 },
    { "value": "稀土", "count": 1 },
    { "value": "铀", "count": 1 },
    { "value": "运价", "count": 1 }
  ],
  "newItems": [
    { "id": "fund-bdry", "points": 125 },
    { "id": "fund-krbn", "points": 125 },
    { "id": "fund-remx", "points": 125 },
    { "id": "fund-lit", "points": 125 },
    { "id": "fund-ura", "points": 125 },
    { "id": "fund-wood", "points": 125 }
  ]
}
```

## 浏览器验证

地址：

`http://127.0.0.1:5193/chart-wall?view=table&range=6m&timeframe=1d&market=商品&assetType=all&sort=volume_ratio&order=desc`

页面结果：

- 表格工具条显示 `40 个资产`。
- 能看到 `Breakwave 干散货运价 ETF`、`KraneShares 全球碳信用 ETF`、`VanEck 稀土战略金属 ETF`、`Global X 锂电池 ETF`、`Global X 铀矿 ETF`。
- 新增资产均显示 `数据新鲜` 和 `125 点`。

## 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
pnpm build
pnpm smoke
```

## 维护性

- `asset-universe.config.ts` 为 248 行，仍低于 360 行阈值。
- `functional-smoke.mjs` 为 338 行，接近 360 行阈值；后续继续加 smoke 时应优先拆分。
- `lint:maintainability:guard` 通过，治理 backlog 未增长。
