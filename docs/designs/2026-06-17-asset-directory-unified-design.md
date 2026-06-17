# 资产目录统一设计

## 背景

资产目录不是“基金目录的扩展版”，而是 Gold Insights 的资产发现入口。它负责让用户在未完整拉取走势前，先看到某类资产的轻量候选集合、近期表现、数据状态和加入走势池的动作。基金目录只是第一个成熟目录；加密、商品、股票、债券、外汇等都应该接入同一套目录框架。

这个设计的目标是避免每个品种各写一张相似表格、各做一套筛选、各维护一套 sticky 列和收益颜色。能一致的字段、交互和视觉必须统一；确实不同的业务能力通过类别 adapter 表达。

## 核心概念

- 资产目录：某一资产类别的轻量候选池，可以来自外部全量目录、交易所列表、指数成分、主题清单或已入库走势池。
- 走势池：已经拉取完整历史走势、可以计算指标并进入图表墙的资产集合。
- 目录快照：不要求完整 K 线，只保存最新价/净值、快照日期、1D/1M/3M/6M/1Y 等轻量指标。
- 目录类别：基金、加密、商品、A 股行业、重点公司等。类别决定数据源、可用筛选项和动作，但不决定基础表格体验。

## 统一领域契约

`packages/market-domain` 应提供目录通用 contract，而不是让 app 猜每个目录怎么长：

```ts
type AssetDirectoryCategory = {
  id: string;
  label: string;
  assetTypes: string[];
  markets: string[];
  coverage: "full" | "partial" | "trend_pool_only";
  capabilities: Array<"search" | "facets" | "snapshot_metrics" | "import_to_pool" | "refresh_snapshot">;
};

type AssetDirectoryItem = {
  id: string;
  categoryId: string;
  label: string;
  symbol: string;
  market: string;
  assetType: string;
  provider: string;
  latestValue: number | null;
  latestValueLabel: "最新价" | "最新净值" | "最新点位";
  latestValueAt: string | null;
  returns: {
    return1d: number | null;
    return1m: number | null;
    return3m: number | null;
    return6m: number | null;
    return1y: number | null;
  };
  poolState: "in_pool" | "not_in_pool" | "syncing" | "failed";
  dataState: "snapshot" | "full_history" | "missing" | "stale";
  dataPointCount: number;
  assetId: string | null;
};
```

`market-domain` 只表达业务事实，不表达 React 组件、按钮样式或具体列宽。

## Runtime 设计

`packages/local-runtime` 提供统一目录 API：

- `GET /api/directories`：返回可用目录类别、覆盖程度、能力和计数。
- `GET /api/directories/:category/items`：分页返回目录项，支持 keyword、status、facet、sort、order。
- `POST /api/directories/:category/items/:id/import`：加入或刷新走势池。
- `POST /api/directories/:category/sync`：同步目录或快照。

runtime 内部用 `AssetDirectoryRegistryService` 管理不同 provider：

- `FundDirectoryProvider`：Eastmoney 全量基金目录、目录快照、导入净值。
- `CryptoDirectoryProvider`：未来接 Binance/交易所 symbol 目录和轻量 ticker；在全量目录接入前，只暴露真实已入库资产，coverage 为 `trend_pool_only`。
- `CommodityDirectoryProvider`：未来接期货/ETF/商品指数目录。

这样 app 不需要知道基金为什么有 27,010 条、加密为什么暂时只有 8 条；它只看 category 的 coverage 和 capabilities。

## Storage 设计

长期更优方案是通用目录表加类别原始元数据：

- `asset_directory_entries`：统一保存 category、symbol、label、market、asset_type、provider、provider_key、pool_state、asset_id。
- `asset_directory_snapshots`：保存 latest_value、latest_value_at、1D/1M/3M/6M/1Y、metric_source、synced_at。
- `asset_directory_facets`：可选缓存类型、行业、主题、交易所等 facet count。
- `asset_directory_raw_payloads`：保存 provider 原始行，便于后续字段补齐和排错。

现有基金表可以先保留，由 `FundDirectoryProvider` 映射成统一 contract；等其它目录稳定后再考虑迁移到通用表，避免为了抽象一次性重写已验证逻辑。

## App 与 UI 设计

前端应该只有一套目录页面结构：

- `DirectoryLayout`：标题、说明、能力提示、同步状态。
- `DirectoryToolbar`：搜索、facet、状态、排序、同步动作。
- `DirectoryTable`：统一基础列。
- `DirectoryActionAdapter`：按 category 生成行级动作。

基础列契约：

1. 名称：用户可识别 label 为主，symbol/provider 为辅。
2. 类别/市场：统一展示 market、assetType 或 category facet。
3. 状态：是否已加入走势池。
4. 最新值：最新价、净值或点位，label 来自数据。
5. 1D、1M、3M、6M、1Y：统一收益字段和颜色语义。
6. 数据：快照、完整历史、数据点、滞后状态。
7. 操作：加入走势池、更新、查看走势、对比等。

特殊列只允许作为扩展插槽插入，例如基金可以多一个“基金类型”，股票可以多一个“行业/市值”，加密可以多一个“交易所/计价币”。但同义字段不能换一套名字和样式。

## 迁移路线

第一阶段：在 app/ui 层统一表格外壳、收益展示、sticky 列和资产目录导航；基金目录继续走现有基金 API，加密目录只展示真实已入库资产。

第二阶段：在 `market-domain` 加 `AssetDirectory*` contract，在 runtime 加统一 `/api/directories/*` API，并让基金 provider 适配到新 contract。

第三阶段：接入加密全量目录和轻量 ticker 快照，目录页从“走势池-only”升级到“候选目录 + 加入走势池”。

第四阶段：商品、股票、指数等目录按 provider 接入。新增目录只写 provider 和少量 category adapter，不复制页面和表格。

