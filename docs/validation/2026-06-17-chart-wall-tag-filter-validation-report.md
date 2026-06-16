# 图表墙主题筛选验证报告

## 背景

大宗商品和基金覆盖扩充后，单靠市场、品种、层级筛选不够细。用户需要能按“贵金属、能源、农产品、半导体、消费、医疗、新能源”等主题快速缩小资产范围。本轮新增 chart-wall `tag` 筛选契约，并把主题 facet 计数放到 runtime 侧，避免前端自己猜业务口径。

## 职责边界

- `packages/market-domain`：扩展 `ChartWallResponse` 和 `ChartWallFacets`，新增 `tag` 与 `facets.tags`。
- `packages/local-runtime`：解析 `tag` query，按资产 tags 过滤，并生成主题 facet counts。
- `apps/web-shell`：新增“主题”筛选下拉和 active filter chip，只负责 URL 状态和展示。
- `scripts/smoke`：新增主题筛选和主题 facet 的真实 runtime 断言。

本轮没有新增假数据，没有让前端承担权威筛选口径。

## 实现要点

- `/api/chart-wall?...&tag=贵金属` 会返回 `tag: "贵金属"` 并只包含带该 tag 的资产。
- `facets.tags` 返回全局可用主题及计数。
- 当前主题筛选不会污染其它 facet 计数。
- 前端控制条新增“主题”筛选。
- active filter chip 支持显示和移除“主题: 贵金属”。
- 将 `ChartWallQueryService` 内原有 facet/signal 逻辑抽到 `ChartWallFacetBuilderService`，避免红区继续膨胀。
- 将部分商品 ETF 标签从“农业”统一为“农产品”，避免同类资产在主题筛选里被拆散。

## Smoke 验证

新增 smoke 断言：

- 商品 chart wall 的 `facets.tags` 包含 `贵金属` 且 count >= 8。
- 商品 chart wall 的 `facets.tags` 包含 `农产品` 且 count >= 6。
- `tag=贵金属` 返回至少 8 个带 `贵金属` tag 的商品资产。
- `tag=农产品` 返回至少 6 个带 `农产品` tag 的商品资产。

`pnpm smoke` 通过，关键输出：

```json
{
  "status": "passed",
  "assetCount": 154,
  "chartWallItems": 133,
  "fundItems": 80,
  "commodityItems": 34,
  "preciousMetalsItems": 10,
  "agricultureItems": 7
}
```

## 浏览器验证

验证地址：

```txt
http://127.0.0.1:5193/chart-wall?view=table&range=6m&timeframe=1d&market=商品&tag=贵金属&assetType=all&sort=return_1m&order=desc
```

验证结果：

```json
{
  "controlShowsTheme": true,
  "toolbarShowsFilteredCount": true,
  "hasPreciousAsset": true,
  "chipShowsTag": true,
  "removeTagWorks": true,
  "errors": []
}
```

说明：

- 页面展示“主题”控件和“贵金属”选中状态。
- 表格摘要显示 `10 个资产`。
- 表格中能看到 NYMEX 铂金或 SPDR 黄金 ETF 等贵金属资产。
- active chip 显示 `主题: 贵金属`。
- 点击移除主题后，URL 移除 `tag=贵金属`，商品资产恢复为 `34 个资产`。
- 浏览器 console/page error 为空。

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
- `chart-wall-query.service.ts` 从 660 行降到 542 行，低于采用基线 645。
- 新增 `chart-wall-facet-builder.service.ts` 为 121 行，专门负责 facet 与 signal 过滤展示口径。
- `chart-wall-page.tsx` 仍是既有红区，增加到 924 行但低于采用基线；后续继续新增控制条功能时，应优先拆分 control strip/url state。
- `functional-smoke.mjs` 为 304 行，已接近阈值；后续继续加 smoke 断言应拆分脚本。
