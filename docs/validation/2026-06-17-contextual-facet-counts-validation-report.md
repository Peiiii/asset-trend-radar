# 上下文筛选计数验证报告

## 范围

- 图表墙与概览页共用的筛选器计数改为上下文感知口径。
- 每个 facet 的数量按“其它筛选条件已生效、当前 facet 自己未生效”计算。
- `全部主题` 等 all 选项显示当前上下文资产数，而不是 tag 命中次数总和。
- 计数口径由 runtime API 负责，app 只渲染 API contract。

## API 验证

基金上下文：

```txt
GET /api/chart-wall?range=6m&timeframe=1d&market=基金&assetType=all&sort=return_1m
```

结果摘要：

- `items`: 47
- `facets.markets.all.count`: 142
- `facets.markets.基金.count`: 47
- `facets.assetTypes.all.count`: 47
- `facets.assetTypes.fund.count`: 47
- `facets.levels.all.count`: 47
- `facets.tags.all.count`: 47
- `facets.tags.支付宝常见.count`: 44
- `facets.signals.all.count`: 47

商品 + 贵金属主题上下文：

```txt
GET /api/chart-wall?range=6m&timeframe=1d&market=商品&assetType=all&tag=贵金属&sort=return_1m
```

结果摘要：

- `items`: 10
- `facets.assetTypes.all.count`: 10
- `facets.tags.all.count`: 40
- `facets.tags.贵金属.count`: 10
- `facets.signals.all.count`: 10

说明：主题 facet 的 `all=40` 表示在当前商品市场下移除主题过滤后共有 40 个可选资产，这是 faceted search 的标准口径；当前结果仍是 10。

## 浏览器验证

页面：

```txt
http://127.0.0.1:5193/overview?market=基金&sort=return_1m
```

浏览器可见筛选器：

- `基金47`
- `全部品种47`
- `全部层级47`
- `全部主题47`
- `全部信号47`
- 筛选摘要：`当前 47 / 接口 47 / 排序 1M 涨幅 降序`

## 命令验证

- `pnpm typecheck`
- `pnpm lint`
- `pnpm lint:maintainability:guard`

## 维护性说明

- `ChartWallFacetBuilderService` 负责 facet 构建与 all 计数。
- `ChartWallQueryService` 负责上下文口径编排，并在单次请求内缓存 `ChartWallItem`，避免重复拼装 K 线指标。
- 没有把 facet 业务口径放到 React component。
- 没有新增跨 package 深导入。
- 触碰了既有红区文件 `chart-wall-query.service.ts`，但文件仍低于 adopted oversized baseline，维护性守卫通过。
