# 全球资产趋势雷达方案设计

## 背景

Gold Insights 要做的不是普通行情看板，也不是先用 AI 生成投资结论。第一阶段的核心价值是信息整合和可视化：把全球大类资产、地区市场、细分板块、主题篮子、重点公司放在同一个分层资产宇宙里，用多周期走势图、技术指标和机会扫描，让用户肉眼快速发现值得研究的走势。

本方案按终态架构设计。实现可以分阶段，但数据链路、存储模型、代码边界不以假数据为前提。第一版可以只覆盖少量真实资产，但不做无意义 mock 行情。

## 产品原则

1. 真实数据优先：宁可第一版只有 50 个真实资产，也不要 500 个假资产。
2. 走势优先：页面核心是图表和时间跨度，不是单点涨跌数字。
3. 多图同屏：支持类似币安大盘的图表墙，一页看很多资产走势。
4. 分层下钻：从全球资产、地区市场、宽基指数、行业指数、主题篮子一路下钻到重点公司。
5. 信号可解释：MACD、均线、突破、相对强弱等信号必须来自可复算的数据和规则。
6. AI 后置：AI 只解释真实信号、整理证据链、列风险，不凭空推荐。
7. 投研辅助定位：产品表达使用“值得研究”“触发信号”“风险提示”，避免直接投资建议口吻。

## 核心用户场景

### 场景一：一屏扫全市场

用户打开首页，看到几十到几百张小图。每张图展示一个资产在当前周期下的走势、涨跌幅、MACD 状态、突破状态。用户可以按市场、资产类型、主题、信号、强弱排名过滤。

目标是回答：

- 哪些资产正在变强？
- 哪些板块刚刚突破？
- 哪些资产明显弱于同类？
- 哪些走势形态值得点进去？

### 场景二：从宏观下钻到公司

用户看到铜价多周期走强，点击铜后看到相关链条：有色金属、铜矿、电网设备、AI 电力基础设施。再进入 A 股电网设备板块，看到板块指数和重点公司走势，判断机会是否从商品扩散到股票。

目标是回答：

- 大类资产走势是否传导到相关板块？
- 哪些公司领先板块？
- 哪些资产只是在跟随，哪些已经提前启动？

### 场景三：技术信号发现机会

系统扫描所有资产，生成“MACD 金叉”“突破 60 日新高”“多周期趋势共振”“价格新高但 MACD 背离”等事件。用户点开事件后看到对应 K 线、指标、相关资产和反面风险。

目标是回答：

- 机会是如何被发现的？
- 哪些证据支持这个信号？
- 哪些风险会让这个信号失效？

## 产品信息架构

### 一级页面

1. 全市场图表墙
2. 资产宇宙
3. 机会扫描
4. 单资产详情
5. 自选图表墙
6. 数据源与任务状态

### 全市场图表墙

这是首页核心。

顶部控制区：

- 市场：全球、A 股、港股、美股、商品、外汇、加密、自选。
- 层级：大类资产、宽基指数、行业指数、主题篮子、重点公司。
- 周期：15m、1H、4H、1D、1W、1M。
- 区间：1D、1W、1M、3M、6M、1Y、3Y、5Y。
- 指标：价格、成交量、MACD、均线、新高新低、相对强弱。
- 排序：涨幅、动量、成交额、趋势评分、MACD 事件、突破事件、波动率。

图表卡片：

- 资产名称、代码、市场。
- 当前价或点位。
- 当前周期涨跌幅。
- 小 K 线或折线图。
- 成交量迷你条。
- MACD 状态：金叉、死叉、零轴上方、零轴下方、背离。
- 趋势标签：多头、空头、横盘、突破、回踩、新高、新低。

交互：

- Hover：显示十字光标和当前点 OHLC。
- 单击：右侧抽屉展开完整详情图。
- 双击：进入单资产详情页。
- Pin：固定到自选图表墙。
- Compare：加入多资产对比。

### 资产宇宙

资产宇宙是一棵可维护的树，不是硬编码列表。

层级示例：

```txt
资产
  股票
    中国 A 股
      宽基指数
      行业指数
        半导体
          设备
          材料
          设计
        机器人
        创新药
      主题篮子
        AI 算力链
        低空经济
        电网设备
      重点公司
    美股
    港股
  商品
    贵金属
    工业金属
    能源
  债券
  外汇
  加密
  宏观指标
```

每个节点都可以拥有：

- 自己的走势。
- 子节点排名。
- 成分资产。
- 相关资产。
- 机会事件。

### 单资产详情

详情页用于深入分析，不承载全市场扫描。

模块：

- 主 K 线图。
- 周期切换：15m、1H、4H、1D、1W、1M。
- 区间切换：1M、3M、6M、1Y、3Y、5Y、Max。
- 均线：MA20、MA50、MA200。
- 成交量。
- MACD 面板。
- 后续指标：RSI、布林带、ATR。
- 事件标注：财报、公告、CPI、FOMC、政策事件、链上/交易所事件。
- 相关资产：所属板块、上游、下游、同主题、龙头、替代资产。
- 信号解释：为什么进入机会池，触发了哪些规则。

## 数据源设计

### 数据源分层

终态支持多供应商，但第一版只接最少真实闭环。

推荐顺序：

1. 加密：Binance Kline API。
2. 宏观：FRED。
3. 美股/ETF/指数：Polygon/Massive、Nasdaq Data Link 或 Databento。
4. A 股：优先授权数据源，如 Wind、Choice、聚宽、Tushare Pro。AKShare/Baostock 可作为内部研究备选，不作为商业终态默认依赖。

### 数据源适配器责任

每个数据源一个 adapter，统一输出 canonical bars。

Adapter 负责：

- 拉取原始数据。
- 记录请求参数和响应元数据。
- 处理分页、限流、重试。
- 映射供应商 symbol 到内部 asset_id。
- 标准化时间戳、时区、货币、字段名。
- 输出 raw record 和 canonical record。

Adapter 不负责：

- 产品扫描规则。
- 前端展示格式。
- 用户权限。
- 资产关系推断。

### 数据质量要求

必须显式处理：

- 交易日历。
- 时区。
- 停牌。
- 缺失 K 线。
- 拆股、分红、复权。
- 指数、股票、商品、加密的交易时间差异。
- 供应商 symbol 变更。
- 数据延迟和更新状态。
- 不同供应商同一资产的冲突。

## 存储架构

### 本地优先原则

Gold Insights 第一形态是运行在本机的 Web 应用：浏览器前端 + 本地 API/worker 进程 + 本地数据库。未来可以部署到 server，但本地版本不能依赖 Postgres、ClickHouse、S3 这类外部基础设施。

默认存储选择：

1. SQLite：本地主数据库，负责资产、关系、OHLCV、指标、趋势快照、扫描事件、自选、任务状态。
2. 本地文件系统：保存原始供应商响应和可重算的大块数据文件。
3. 可选 DuckDB/Parquet：当历史数据量变大、需要批量分析或离线研究时作为分析缓存，不是第一阶段必需依赖。

Postgres、ClickHouse、对象存储只作为未来 server/multi-user 部署的替换实现，不作为本地默认方案。

### 总体链路

```txt
真实数据源
  -> 本地 raw 文件
  -> SQLite 标准化资产库
  -> SQLite OHLCV / 指标 / 快照表
  -> 指标计算层
  -> 趋势快照层
  -> 机会扫描层
  -> 本地 API
  -> 图表墙 / 详情页 / 机会列表
```

### 本地 raw 文件

原始数据必须保留，不覆盖，只追加。本地版本不需要 S3/R2/MinIO，直接使用项目数据目录。

建议目录：

```txt
data/
  gold-insights.sqlite
  raw/
    vendor=binance/
      dataset=klines/
        date=2026-06-16/
          BTCUSDT-1d.jsonl
    vendor=tushare/
      dataset=daily/
        date=2026-06-16/
          000001.SZ.jsonl
  exports/
    parquet/
  cache/
    chart-wall/
    thumbnails/
```

用途：

- 数据回放。
- 指标重算。
- 供应商问题排查。
- 数据审计。
- 迁移到新模型或 server 版本。

### SQLite 主库

SQLite 负责本地全部核心数据。单用户、本地读写、日线/小时线为主的第一阶段，SQLite 足够支撑产品闭环。关键是表结构、索引、预计算和查询边界要设计好。

核心表：

```sql
create table assets (
  id text primary key,
  symbol text not null,
  name text not null,
  asset_type text not null,
  market text not null,
  exchange text,
  currency text,
  timezone text not null,
  parent_id text references assets(id),
  status text not null,
  created_at integer not null,
  updated_at integer not null
);

create table asset_aliases (
  id text primary key,
  asset_id text not null references assets(id),
  vendor text not null,
  vendor_symbol text not null,
  vendor_exchange text,
  is_primary integer not null default 0,
  unique (vendor, vendor_symbol)
);

create table asset_relations (
  id text primary key,
  source_asset_id text not null references assets(id),
  target_asset_id text not null references assets(id),
  relation_type text not null,
  weight real,
  source text,
  created_at integer not null
);

create table ohlcv_bars (
  asset_id text not null references assets(id),
  timeframe text not null,
  ts integer not null,
  open real not null,
  high real not null,
  low real not null,
  close real not null,
  volume real,
  amount real,
  source text not null,
  adjusted_type text not null default 'none',
  ingested_at integer not null,
  primary key (asset_id, timeframe, ts, adjusted_type)
);

create table indicator_values (
  asset_id text not null references assets(id),
  timeframe text not null,
  ts integer not null,
  ma20 real,
  ma50 real,
  ma200 real,
  ema12 real,
  ema26 real,
  macd_dif real,
  macd_dea real,
  macd_hist real,
  rsi14 real,
  calculated_at integer not null,
  primary key (asset_id, timeframe, ts)
);

create table trend_snapshots (
  asset_id text not null references assets(id),
  timeframe text not null,
  ts integer not null,
  return_1d real,
  return_1w real,
  return_1m real,
  return_3m real,
  return_6m real,
  return_1y real,
  trend_score real not null,
  relative_strength_rank integer,
  macd_state text not null,
  breakout_state text not null,
  volume_state text not null,
  calculated_at integer not null,
  primary key (asset_id, timeframe, ts)
);

create table chart_wall_snapshots (
  id text primary key,
  universe_id text not null,
  level text not null,
  timeframe text not null,
  range_key text not null,
  sort_key text not null,
  generated_at integer not null,
  items_json text not null
);

create table scan_events (
  id text primary key,
  asset_id text not null references assets(id),
  timeframe text not null,
  event_type text not null,
  severity integer not null,
  title text not null,
  summary text not null,
  evidence_json text not null,
  triggered_at integer not null,
  invalidated_at integer,
  created_at integer not null
);

create table watchlists (
  id text primary key,
  name text not null,
  created_at integer not null,
  updated_at integer not null
);

create table watchlist_assets (
  watchlist_id text not null references watchlists(id),
  asset_id text not null references assets(id),
  position integer not null,
  primary key (watchlist_id, asset_id)
);

create table ingestion_jobs (
  id text primary key,
  vendor text not null,
  dataset text not null,
  status text not null,
  started_at integer,
  finished_at integer,
  error_message text,
  metadata_json text not null default '{}'
);
```

关键索引：

```sql
create index idx_assets_parent on assets(parent_id);
create index idx_asset_relations_source on asset_relations(source_asset_id, relation_type);
create index idx_asset_relations_target on asset_relations(target_asset_id, relation_type);
create index idx_ohlcv_lookup on ohlcv_bars(asset_id, timeframe, adjusted_type, ts desc);
create index idx_indicator_lookup on indicator_values(asset_id, timeframe, ts desc);
create index idx_trend_wall on trend_snapshots(timeframe, ts desc, trend_score desc);
create index idx_scan_events_lookup on scan_events(timeframe, event_type, triggered_at desc);
create index idx_jobs_status on ingestion_jobs(status, started_at desc);
```

SQLite 运行配置：

```sql
pragma journal_mode = WAL;
pragma synchronous = NORMAL;
pragma foreign_keys = ON;
pragma temp_store = MEMORY;
```

迁移与备份：

- 使用明确版本号的 SQL migration，不手动改库。
- 本地升级前自动备份 `gold-insights.sqlite`。
- 提供导出能力，把资产、关系、自选和扫描结果导出为 SQLite/JSON。
- 原始数据文件可按供应商和日期重新导入，避免数据库损坏后不可恢复。

relation_type 建议枚举：

```txt
parent_child
index_constituent
sector_member
theme_member
upstream
downstream
leader_of
related_macro
peer
hedge
```

### 图表墙缓存

本地 SQLite 查询几十个资产的日线数据没问题，但图表墙会频繁渲染、排序、过滤。不要每次前端请求都临时聚合全部历史。

策略：

- `ohlcv_bars` 保存完整标准化行情。
- `indicator_values` 保存可复算指标。
- `trend_snapshots` 保存每个资产每个周期的最新评分和状态。
- `chart_wall_snapshots` 保存某个 universe/level/timeframe/range/sort 的预计算响应 JSON。
- ingestion 或 scanner 完成后增量刷新受影响的 chart wall snapshot。

这样图表墙接口可以一次读取一个 JSON 快照，详情页再查完整 bars。

### 可选分析层

当本地数据增长到几十万到几百万根 K 线，SQLite 仍可承担按 asset/timeframe 的点查和范围查。如果后续需要大批量横截面分析，可以增加 DuckDB/Parquet：

```txt
SQLite：产品主库、交互查询、用户状态、扫描事件。
Parquet：历史行情导出和批量分析文件。
DuckDB：离线研究、批量回测、跨资产统计。
```

这不是第一阶段依赖。第一阶段不要因为未来分析需求提前引入重型服务。

### Server 部署兼容

为了未来能迁移到 server，代码不要把 SQLite SQL 散落在业务层。

抽象边界：

```txt
MarketDataRepository
AssetRepository
IndicatorRepository
ScannerEventRepository
ChartWallSnapshotRepository
JobRepository
```

本地实现：

```txt
SqliteMarketDataRepository
SqliteAssetRepository
SqliteScannerEventRepository
```

未来 server 实现可以替换为：

```txt
PostgresAssetRepository
ClickHouseMarketDataRepository
ObjectStoreRawDataRepository
```

业务层依赖 repository interface，不依赖具体数据库。

event_type 第一批：

```txt
macd_golden_cross
macd_dead_cross
macd_above_zero_expansion
price_breakout_20d
price_breakout_60d
price_breakout_120d
ma20_reclaim
ma50_reclaim
ma200_reclaim
multi_timeframe_alignment
relative_strength_leader
sector_leader_confirmed
volume_breakout
volatility_squeeze_breakout
bearish_macd_divergence
bullish_macd_divergence
```

## 指标计算

### MACD

统一计算口径：

```txt
EMA12 = EMA(close, 12)
EMA26 = EMA(close, 26)
DIF = EMA12 - EMA26
DEA = EMA(DIF, 9)
MACD_HIST = DIF - DEA
```

显示层可以配置是否使用 `2 * MACD_HIST`，但数据库存储原始 `DIF - DEA`。

### 趋势评分

趋势评分用于图表墙排序，不直接作为投资建议。

建议输入：

- 1M、3M、6M 收益。
- 收盘价相对 MA20、MA50、MA200 的位置。
- MACD 状态。
- 是否突破近期高点。
- 回撤幅度。
- 成交量变化。
- 相对同层资产强弱排名。

输出：

```txt
trend_score: -100 到 100
trend_label: 强多 / 偏多 / 横盘 / 偏空 / 强空
```

### 多周期共振

同一资产在多个周期上同时满足趋势条件：

```txt
1W 趋势转强
1M 位于 MA20 上方
3M 收益为正
6M 高于 MA50 或 MA200
```

共振事件要记录证据，不只记录结论。

## 后端服务设计

### 服务边界

本地版本仍然使用 Web 架构，但不是远程后端。它是一个本地应用进程，对浏览器暴露 localhost API，同时在同一进程或子进程里运行采集和计算任务。

本地运行形态：

```txt
Thin Local Entry
  -> Local Runtime Package
       - Static Web Host / Vite Dev Server adapter
       - Local API Server
       - Job Scheduler
       - Ingestion Worker
       - Indicator Worker
       - Scanner Worker
       - SQLite Connection
       - Local Data Directory
```

逻辑边界仍然拆成四类 owner：

1. API Server：服务前端查询。
2. Ingestion Worker：拉取真实数据。
3. Indicator Worker：计算指标。
4. Scanner Worker：生成机会事件和趋势快照。

部署边界可以后移。第一阶段不需要把它们拆成多个服务，也不需要 Docker Compose、Postgres 或 ClickHouse。

后端实现主体必须在 package 内。真正的入口只是一层薄壳，负责读取环境变量、确定数据目录、注入端口和 token，然后调用 runtime package 的公共入口。入口不拥有 API 路由、采集逻辑、指标计算、数据库连接细节或扫描规则。

### Package 与 App 职责边界

`packages` 是产品能力的 owner，`apps` 是运行形态和页面组合的 owner。判断规则是：只要逻辑需要被多个入口、页面、接口或未来 server 复用，就不能放在 app 里。

| Owner | 应该放什么 | 不应该放什么 |
| --- | --- | --- |
| `packages/market-domain` | 领域类型、API response contract、时间范围语义、纯领域工具 | React 组件、fetch、SQLite、供应商 API |
| `packages/ui` | Button、Select、FilterChip、AppShell、图表展示组件、视觉 token | 业务 API 调用、MACD/收益计算、资产筛选规则、页面路由 |
| `packages/local-runtime` | 本地 API、查询服务、采集任务、基金口径统计、图表墙聚合响应 | React 状态、URL query、页面文案、浏览器交互 |
| `packages/data-storage` | SQLite schema、repository、索引、迁移 | 趋势评分、页面筛选、供应商请求 |
| `packages/data-adapters` | 供应商请求、raw/canonical 映射、分页限流 | UI 展示、扫描规则、数据库表结构决策 |
| `packages/indicator-engine` | MA、EMA、MACD、RSI 等可复算指标 | API 路由、图表组件、供应商接入 |
| `packages/scanner-engine` | 突破、相对强弱、MACD 事件、趋势评分 | UI 排版、网络请求、SQLite 连接 |
| `apps/web-shell` | React Router、URL query、页面布局、feature 组合、展示文案 | 指标计算、时间范围裁剪、基金总数统计、通用控件实现 |
| `apps/local-shell` | 读取 env/CLI、确定本地数据目录、启动 runtime | API controller、worker、repository、业务 service |

当前实现遵循以下硬规则：

1. 时间范围的真实语义在 `market-domain`，例如 `3m` 是按最新 K 线向前裁剪三个自然月；前端只传 `range=3m` 并展示返回结果。
2. 图表墙、详情、对比接口都必须使用同一套 range/timeframe 裁剪工具，不能在不同页面各自解释。
3. 基金 `45/70` 这类口径统计由 `local-runtime` 放进 API response；前端不遍历资产树自行计算。
4. 筛选下拉、chip、按钮等可复用交互组件放在 `packages/ui`，页面不能临时写第二套样式相似但行为不同的控件。
5. app 里的 feature 组件可以做“把 query param 转成 label”这种展示适配，但不能拥有领域判断，例如“哪些基金算场外基金”“3 个月从哪天开始”。

### API

```txt
GET /api/universe/tree
GET /api/assets?parentId=:assetId
GET /api/assets/:assetId
GET /api/assets/:assetId/bars?timeframe=1d&range=1y
GET /api/assets/:assetId/indicators?timeframe=1d&range=1y
GET /api/chart-wall?universe=a-share&level=sector&timeframe=1d&range=1y&sort=trend_score
GET /api/scanner/events?universe=a-share&timeframe=1d&eventType=macd_golden_cross
GET /api/compare?assetIds=xau,copper,us10y&timeframe=1d&range=1y
GET /api/watchlists
POST /api/watchlists
POST /api/watchlists/:watchlistId/assets
DELETE /api/watchlists/:watchlistId/assets/:assetId
GET /api/data-health
```

### Chart Wall 响应

图表墙接口必须专门优化，不能让前端为 100 个资产分别发 100 次请求。

```ts
type ChartWallResponse = {
  universe: string;
  timeframe: string;
  range: string;
  generatedAt: string;
  items: ChartWallItem[];
};

type ChartWallItem = {
  assetId: string;
  symbol: string;
  name: string;
  market: string;
  assetType: string;
  lastPrice: number | null;
  returnPct: number | null;
  trendScore: number;
  trendLabel: string;
  macdState: string;
  breakoutState: string;
  sparkline: SparklinePoint[];
};

type SparklinePoint = {
  t: number;
  o?: number;
  h?: number;
  l?: number;
  c: number;
  v?: number;
};
```

sparkline 使用降采样数据。详情页再加载完整 OHLCV。

## 前端架构

前端必须先设计复用组件体系，再进入页面实现。这个产品会大量出现筛选器、时间周期切换、图表卡片、趋势标签、详情抽屉、资产列表、机会事件卡。如果不建立共享 UI 层，后续每个 feature 都会复制一套相似组件，体验也会不一致。

前端组件分四层：

```txt
Design Tokens
  -> UI Primitives
  -> Domain UI / Financial Components
  -> Feature Components
```

各层职责：

1. Design Tokens：颜色、字号、间距、圆角、阴影、边框、涨跌色、图表色板。
2. UI Primitives：按钮、输入框、选择器、Tabs、弹窗、抽屉、Tooltip、表格、空状态等基础组件。
3. Domain UI：资产标签、涨跌幅、趋势徽章、周期选择器、图表卡片壳、MACD 状态、信号卡等金融产品专用组件。
4. Feature Components：图表墙页面、资产树、扫描列表、详情页等业务组合组件。

原则：feature 可以组合共享组件，但不重复发明基础 UI；基础 UI 不知道任何资产、行情、MACD 业务；Domain UI 可以知道金融展示语义，但不直接请求 API。

### 目录命名治理基线

本项目目录与文件命名参考 `../nextbot` 的以下规范 skill：

- `file-naming-convention`：文件统一 kebab-case，并使用角色后缀。
- `role-first-file-organization`：先判断文件角色，再判断领域归属。
- `collapsible-feature-root-architecture`：feature-first，按复杂度渐进展开，不提前铺满模板。
- `file-organization-governance`：目录白名单、scope root 边界和治理检查入口。

落到 Gold Insights 的规则：

1. 目录名统一使用 kebab-case。
2. 文件名统一使用 kebab-case。
3. 非组件、非页面、非 hook 文件必须使用角色后缀：`.service.ts`、`.manager.ts`、`.repository.ts`、`.store.ts`、`.config.ts`、`.types.ts`、`.utils.ts`、`.controller.ts`、`.provider.ts`。
4. `services/` 只放 `*.service.ts`，且服务文件内部必须有真实 class owner。
5. `repositories/` 只放 `*.repository.ts`。
6. `controllers/` 只放 `*.controller.ts`。
7. `types/` 只放 `*.types.ts`。
8. `utils/` 只放 `*.utils.ts`。
9. `hooks/` 只放 `use-<domain>.ts(x)`，并且必须平铺，不能再套子目录。
10. `pages/` 只放 `<domain>-page.tsx`。
11. `components/` 可以放普通 kebab-case React 组件文件，但一文件只能有一个主职责。
12. `lib/` 只作为模块容器，根下不能直接放文件；必须是 `lib/<module>/index.ts` 作为模块唯一公共入口。
13. `index.ts` 只允许做公共出口聚合，不承载业务逻辑。
14. `shared/` 只能放真实跨 feature 复用的稳定抽象，不能因为暂时不知道放哪就放进去。
15. 禁止新建弱语义兜底目录：`common/`、`helpers/`、`misc/`、`support/`、`modules/`。

当前文档早期版本中的 `models/`、`shared/domain/`、`packages/ui/src/primitives/`、`packages/ui/src/financial/`、`packages/ui/src/charting/`、`apps/api/src/modules/`、`packages/data-storage/src/sqlite/` 这类目录不应作为最终规范。它们要么不是角色白名单，要么把领域词当成目录角色，要么让 shared 变成宽泛回收层。修正后的结构如下。

### 前端目录组织

终态推荐把可复用 UI 独立成 `packages/ui`。第一阶段如果还不拆 monorepo，也要直接使用 `src/shared/components`、`src/shared/configs`、`src/shared/types`、`src/shared/utils` 这些角色目录，避免新增 `shared/ui` 这种宽泛中间层。

```txt
apps/
  web/
    src/
      app/
        app.tsx
        configs/
          routes.config.tsx
        providers/
          app-providers.provider.tsx
      features/
        chart-wall/
          components/
            chart-wall-page.tsx
            chart-wall-toolbar.tsx
            chart-card-grid.tsx
            chart-detail-drawer.tsx
          hooks/
            use-chart-wall-query.ts
          services/
            chart-wall-api.service.ts
          types/
            chart-wall.types.ts
        asset-universe/
          components/
            asset-universe-page.tsx
            asset-tree-panel.tsx
          services/
            asset-universe-api.service.ts
          types/
            asset-universe.types.ts
        asset-detail/
          components/
            asset-detail-page.tsx
            asset-chart-workspace.tsx
            related-assets-panel.tsx
            event-markers-panel.tsx
          services/
            asset-detail-api.service.ts
          types/
            asset-detail.types.ts
        opportunity-scanner/
          components/
            scanner-page.tsx
            scanner-filter-panel.tsx
            scanner-event-list.tsx
          services/
            scanner-api.service.ts
          types/
            scanner.types.ts
        watchlists/
          components/
            watchlist-page.tsx
            watchlist-manager-panel.tsx
          services/
            watchlist-api.service.ts
          types/
            watchlist.types.ts
      shared/
        lib/
          http-client/
            index.ts
            http-client.service.ts
            api-error.types.ts
        types/
          asset.types.ts
          timeframe.types.ts
          market.types.ts
        utils/
          number-format.utils.ts
          date-time.utils.ts
packages/
  ui/
    src/
      components/
        app-shell.tsx
        asset-identity.tsx
        asset-path-breadcrumb.tsx
        button.tsx
        canvas-sparkline.tsx
        chart-card-shell.tsx
        chart-crosshair-tooltip.tsx
        checkbox.tsx
        command-bar.tsx
        dialog.tsx
        drawer.tsx
        empty-state.tsx
        error-state.tsx
        icon-button.tsx
        indicator-toggle-group.tsx
        input.tsx
        lightweight-chart-wrapper.tsx
        macd-mini-panel.tsx
        metric-cell.tsx
        mini-candlestick.tsx
        page-header.tsx
        panel.tsx
        popover.tsx
        price-change.tsx
        range-picker.tsx
        scanner-event-card.tsx
        scroll-area.tsx
        segmented-control.tsx
        select.tsx
        signal-badge.tsx
        sidebar.tsx
        skeleton.tsx
        slider.tsx
        split-pane.tsx
        switch.tsx
        table.tsx
        tabs.tsx
        timeframe-picker.tsx
        tooltip.tsx
        top-bar.tsx
        trend-badge.tsx
      configs/
        chart-colors.config.ts
        spacing.config.ts
        typography.config.ts
        ui-theme.config.ts
      types/
        theme.types.ts
      utils/
        chart-series.utils.ts
        class-name.utils.ts
      index.ts
```

### 基础 UI 组件设计

基础组件是体验一致性的底座。所有页面必须从 `packages/ui/src/components` 复用这些组件，不允许 feature 自己写相同功能的按钮、输入框、弹层、筛选器。

第一批基础组件：

| 组件 | 用途 | 必须支持的状态 |
| --- | --- | --- |
| `Button` | 主要操作、次要操作、危险操作 | default、hover、active、disabled、loading |
| `IconButton` | 工具栏图标按钮 | tooltip、pressed、disabled、loading |
| `Input` | 搜索资产、输入数值 | error、disabled、clearable、prefix icon |
| `Select` | 市场、资产类型、排序选择 | single、multi、searchable、loading |
| `SegmentedControl` | 周期、区间、视图模式切换 | selected、disabled、overflow |
| `Tabs` | 页面内视图切换 | horizontal、compact、scrollable |
| `Checkbox` | 多选过滤 | checked、indeterminate、disabled |
| `Switch` | 布尔设置 | checked、disabled |
| `Slider` | 图表密度、阈值设置 | min、max、step、marks |
| `Tooltip` | 图标解释、指标解释 | delay、keyboard accessible |
| `Popover` | 轻量浮层过滤器 | anchored、dismissable |
| `Dialog` | 确认类操作 | title、description、actions |
| `Drawer` | 右侧详情、图表展开 | resizable、close、focus trap |
| `Table` | 数据源状态、资产列表 | sticky header、sortable、empty、loading |
| `ScrollArea` | 图表墙、列表区域滚动 | horizontal、vertical |
| `Skeleton` | 加载占位 | card、row、chart variants |
| `EmptyState` | 无数据状态 | action、description、icon |
| `ErrorState` | 请求失败状态 | retry、details、severity |

基础组件视觉规范：

- 圆角统一 8px；小控件可以 6px；不要随意出现大圆角卡片。
- 按钮高度统一：compact 32px、default 40px、large 48px。
- 工具型按钮优先 icon + tooltip；不是所有按钮都写长文字。
- 表单控件、筛选控件、图表卡片要使用同一套 focus ring。
- 涨跌色统一由 token 控制，不能在 feature CSS 中临时写绿色/红色。
- 空状态和错误状态必须可复用，不能每个页面各写一套文案结构。

### 金融领域组件设计

金融领域组件也放在 `packages/ui/src/components`，通过文件名表达金融语义，例如 `asset-identity.tsx`、`trend-badge.tsx`、`chart-card-shell.tsx`。它们知道资产、价格、趋势、指标这些展示语义，但不请求后端、不计算 MACD、不持有业务状态。

第一批领域组件：

| 组件 | 用途 | 输入 |
| --- | --- | --- |
| `AssetIdentity` | 展示资产名称、代码、市场、类型 | asset summary |
| `AssetPathBreadcrumb` | 展示资产层级路径 | ancestor assets |
| `PriceChange` | 展示涨跌幅和方向 | number、precision、direction |
| `TrendBadge` | 展示强多、偏多、横盘、偏空、强空 | trend label |
| `SignalBadge` | 展示 MACD 金叉、突破、新高等事件 | event type、severity |
| `TimeframePicker` | 选择 15m/1H/4H/1D/1W/1M | available timeframes |
| `RangePicker` | 选择 1M/3M/6M/1Y/3Y/5Y | available ranges |
| `IndicatorToggleGroup` | 开关 MA、MACD、RSI 等指标 | indicator options |
| `MetricCell` | 趋势矩阵中的指标格 | value、state、sparkline |
| `ChartCardShell` | 图表墙卡片统一外壳 | asset、status、actions |
| `ScannerEventCard` | 机会事件卡片统一外壳 | event summary |
| `CanvasSparkline` | 图表墙迷你走势图 | compressed points |
| `MiniCandlestick` | 图表墙迷你 K 线 | compressed OHLC points |
| `MacdMiniPanel` | 卡片级 MACD 小面板 | histogram、state |
| `LightweightChartWrapper` | 详情图 TradingView 封装 | bars、series config |

领域组件边界：

- `ChartCardShell` 不知道图表墙排序和过滤，只负责统一卡片布局。
- `ScannerEventCard` 不判断事件是否成立，只展示 API 返回的事件。
- `TimeframePicker` 不决定哪些市场支持分钟级，只展示传入 options。
- `CanvasSparkline` 不做指标计算，只绘制传入数据。
- `LightweightChartWrapper` 只封装图表生命周期、主题、resize 和 series 管理。

### 组件复用规则

1. 所有页面级 feature 只能组合 UI 组件，不复制基础控件。
2. feature 内部组件只保留业务布局和数据绑定，例如 `chart-wall-page.tsx`、`scanner-filter-panel.tsx`。
3. 只要一个组件跨两个 feature 使用，就必须上移到 `packages/ui` 或 `apps/web/src/shared`。
4. 基础组件不允许依赖 `features/*`。
5. `packages/ui` 只能依赖 React、图标库、图表库和纯工具，不依赖业务 API。
6. 图表主题、涨跌色、指标色必须来自 `packages/ui/src/configs`。
7. 组件 props 使用业务无关命名；领域组件可以使用 `asset`、`timeframe`、`signal` 等金融语义。
8. 每个共享组件必须有 loading、empty、error、disabled 中适用的状态设计。
9. 图表墙卡片和详情页图表共享主题、坐标轴、tooltip 和颜色规则。
10. 新页面上线前必须检查是否新增了重复按钮、重复筛选器、重复卡片壳。

### 页面组合方式

全市场图表墙页面：

```txt
ChartWallPage
  AppShell
  Sidebar
  TopBar
  ChartWallToolbar
    Select
    SegmentedControl
    IndicatorToggleGroup
    IconButton
  ChartCardGrid
    ChartCardShell
      AssetIdentity
      PriceChange
      TrendBadge
      CanvasSparkline / MiniCandlestick
      MacdMiniPanel
  ChartDetailDrawer
    Drawer
    LightweightChartWrapper
```

机会扫描页面：

```txt
ScannerPage
  PageHeader
  ScannerFilterPanel
    Select
    TimeframePicker
    RangePicker
    Checkbox
  ScannerEventList
    ScannerEventCard
      AssetIdentity
      SignalBadge
      PriceChange
      TrendBadge
```

单资产详情页：

```txt
AssetDetailPage
  AssetPathBreadcrumb
  AssetIdentity
  AssetChartWorkspace
    TimeframePicker
    RangePicker
    IndicatorToggleGroup
    LightweightChartWrapper
  RelatedAssetsPanel
    Table
    MetricCell
  EventMarkersPanel
    ScannerEventCard
```

### UI 一致性验收

前端实现阶段要把 UI 复用作为验收条件，而不是“后面再整理”。

验收标准：

- 图表墙、扫描器、资产详情使用同一套 `TimeframePicker` 和 `RangePicker`。
- 所有 icon-only 操作都有 `Tooltip`。
- 所有图表卡片使用 `ChartCardShell`，不出现 feature-local 的重复卡片外壳。
- 所有涨跌幅使用 `PriceChange`。
- 所有趋势/信号状态使用 `TrendBadge` 和 `SignalBadge`。
- 所有右侧展开详情使用 `Drawer`。
- 所有加载、空、错误状态使用共享组件。
- 搜索、筛选、排序控件的高度、圆角、focus 状态一致。
- 图表色板、涨跌色、MACD 色来自 token。
- 移动端布局使用同一套 `AppShell` / `Panel` / `ScrollArea` 规则。

### 前端代码组织原则

1. feature 之间不互相深 import。跨 feature 共享类型放 `shared/types` 或 `packages/market-domain`。
2. API 调用放 service class，组件不直接写 fetch。
3. 业务计算优先 class 组织；纯格式化工具可以放 utils。
4. 图表墙小图用轻量 canvas/svg，不给每张卡创建完整 TradingView 实例。
5. 完整 K 线只在详情抽屉或详情页使用 TradingView Lightweight Charts。
6. 所有本地 API 查询状态使用 TanStack Query 管理缓存、刷新、错误状态。
7. 组件只负责状态选择和展示，不负责指标计算。
8. 页面禁止直接写裸 `<button>`、`<select>`、`<input>`，除非是在基础组件内部。
9. feature CSS 只能处理局部布局，颜色、字号、间距、圆角优先使用 `packages/ui/src/configs` 中的设计 token。
10. 可复用组件要通过 `packages/ui/src/index.ts` 显式导出，feature 不深 import 组件内部文件。

## 后端目录组织

推荐使用 monorepo，但第一阶段也可以单仓多 app。

```txt
apps/
  web/
    src/
  local-shell/
    src/
      main.ts
      configs/
        local-shell.config.ts
packages/
  local-runtime/
    src/
      index.ts
      controllers/
        health.controller.ts
      providers/
        error-response.provider.ts
        request-context.provider.ts
      services/
        local-api-server.service.ts
        local-runtime.service.ts
        scheduler.service.ts
        ingestion-worker.service.ts
        indicator-worker.service.ts
        scanner-worker.service.ts
      types/
        local-runtime-options.types.ts
      features/
        assets/
          controllers/
            assets.controller.ts
          services/
            asset-query.service.ts
        chart-wall/
          controllers/
            chart-wall.controller.ts
          services/
            chart-wall-query.service.ts
        scanner/
          controllers/
            scanner.controller.ts
          services/
            scanner-query.service.ts
        watchlists/
          controllers/
            watchlists.controller.ts
          services/
            watchlist-command.service.ts
        data-health/
          controllers/
            data-health.controller.ts
          services/
            data-health-query.service.ts
  market-domain/
    src/
      types/
        asset.types.ts
        bar.types.ts
        indicator.types.ts
        scanner-event.types.ts
      utils/
        timeframe.utils.ts
  data-adapters/
    src/
      providers/
        akshare-market-data.provider.ts
        binance-market-data.provider.ts
        fred-macro-data.provider.ts
        massive-market-data.provider.ts
        tushare-market-data.provider.ts
      types/
        market-data-adapter.types.ts
      utils/
        vendor-symbol.utils.ts
  data-storage/
    src/
      repositories/
        chart-wall-snapshot.repository.ts
        local-raw-file.repository.ts
        sqlite-asset.repository.ts
        sqlite-market-data.repository.ts
        sqlite-scanner-event.repository.ts
      services/
        sqlite-database.service.ts
      utils/
        sqlite-migration.utils.ts
  indicator-engine/
    src/
      utils/
        ema.utils.ts
        macd.utils.ts
        moving-average.utils.ts
        rsi.utils.ts
  scanner-engine/
    src/
      managers/
        scanner-engine.manager.ts
      utils/
        breakout-rule.utils.ts
        macd-cross-rule.utils.ts
        relative-strength-rule.utils.ts
  shared-config/
    src/
      configs/
        env.config.ts
        logger.config.ts
        timeframes.config.ts
docs/
  designs/
  plans/
  thoughts/
```

### 后端代码边界

`apps/local-shell`

- 本地运行入口薄壳。
- 读取 CLI/env/config。
- 解析本地数据目录、端口、日志级别。
- 从 `packages/local-runtime` 根公共入口导入 runtime owner。
- 调用 `GoldInsightsLocalRuntimeService.start()` 和 `stop()`。
- 不直接 import runtime package 内部 controllers/services/repositories。
- 不写数据库、API 路由、数据采集、指标计算或扫描逻辑。

`local-runtime`

- 本地后端运行时 package。
- 拥有 localhost API server。
- 拥有 scheduler、ingestion worker、indicator worker、scanner worker。
- 连接 SQLite、本地 raw 文件 repository、data adapters、indicator engine、scanner engine。
- 对外只通过 package 根 `index.ts` 暴露稳定公共入口。
- 内部 feature root 使用 controllers/services/types 等角色目录，不在 package 根平铺实现文件。

薄入口示例：

```ts
import { GoldInsightsLocalRuntimeService } from "@gold-insights/local-runtime";
import { localShellConfig } from "./configs/local-shell.config";

const runtime = new GoldInsightsLocalRuntimeService(localShellConfig);

await runtime.start();

process.once("SIGINT", () => void runtime.stop());
process.once("SIGTERM", () => void runtime.stop());
```

入口文件只允许出现这类启动/关闭装配。只要开始出现路由注册、SQL、数据源 adapter、指标计算或扫描规则，就说明 owner 放错了，应该下沉到 `packages/local-runtime` 或更底层 package。

`market-domain`

- 资产类型。
- 时间周期类型。
- OHLCV 类型。
- 指标类型。
- 扫描事件类型。

`data-adapters`

- 一个供应商一个 adapter class。
- 不写业务扫描逻辑。
- 输出 raw record 和 canonical record。

`data-storage`

- SQLite repository。
- 本地 raw 文件 repository。
- 可选 Parquet/DuckDB analysis repository。
- 对外暴露 repository interface，未来 server 版本再替换成 Postgres/ClickHouse/Object Store。

`indicator-engine`

- 纯指标计算。
- 输入 bars，输出 indicator values。
- 无数据库依赖。

`scanner-engine`

- 规则引擎。
- 输入 bars、indicator values、asset relations。
- 输出 scan events。

`apps/api`

- 查询编排。
- 权限。
- 参数校验。
- 错误响应。

`apps/workers`

- 调度任务。
- 调用 adapters、storage、indicator engine、scanner engine。
- 记录 job 状态。

## 关键实现策略

### 图表墙性能

问题：一页可能展示 100 到 300 张图。

策略：

- 后端一次性返回图表墙数据。
- 返回降采样 sparkline，不返回完整历史。
- 前端使用虚拟滚动。
- 小图使用 canvas 批量绘制或极轻量 SVG。
- 详情抽屉再加载完整数据。
- 控制默认卡片数量，比如首屏 60 张，滚动加载更多。

### 多周期支持

数据存储分两类：

- 原始采集周期：例如 1m、1d。
- 派生周期：5m、15m、1H、4H、1W、1M。

加密可以从分钟级聚合，股票第一阶段可先日线、周线、月线。不要一开始承诺所有市场都有分钟级。

### 复权策略

A 股和美股股票必须支持复权。

存储字段：

```txt
adjusted_type:
  none
  forward
  backward
```

默认图表使用后复权或供应商推荐口径，必须在 UI 标注。

### 数据健康

必须有数据健康页面，否则用户无法信任图表。

展示：

- 各数据源最近同步时间。
- 失败任务。
- 缺失资产数量。
- 延迟资产数量。
- 今日应更新但未更新的资产。
- 供应商限流和错误。

## 实施阶段

### 阶段一：真实数据最小闭环

目标：用真实数据跑通采集、存储、指标、图表墙、详情页。

范围：

- Binance：BTC、ETH 等 10 个交易对。
- FRED：US10Y、CPI、DXY 替代序列或相关宏观序列。
- A 股：选择一个授权/可用源，接 10 个宽基/行业指数和 10 个重点公司。
- 日线为主。
- MACD、MA20、MA50、MA200。
- 图表墙和单资产详情。

验收：

- 不出现假行情。
- 任意资产可以查看真实 K 线。
- MACD 可复算。
- 图表墙一次加载至少 50 个真实资产。
- 数据健康页能显示最近更新时间。

### 阶段二：资产宇宙和下钻

目标：支持从全球资产下钻到行业、主题和公司。

范围：

- 资产树管理。
- asset_relations。
- 行业指数和重点公司关系。
- 主题 basket。
- 同层强弱排名。

验收：

- 可以从 A 股市场进入半导体板块，再进入重点公司。
- 每层都有趋势图和排名。
- 图表墙可按层级切换。

### 阶段三：机会扫描

目标：把技术信号转成机会事件。

范围：

- MACD 金叉/死叉。
- 价格突破 20/60/120 日新高。
- 多周期共振。
- 板块强于宽基。
- 龙头强于板块。

验收：

- 机会列表只展示真实数据触发的事件。
- 每个事件有 evidence_json。
- 点击事件可定位到图表对应时间点。

### 阶段四：多周期图表墙

目标：同一页面支持多周期对比。

范围：

- 单周期多资产图表墙。
- 多周期单资产卡片。
- 自选图表墙。
- 排序和过滤增强。

验收：

- 用户能一屏看多个资产的 1W、1M、3M、1Y 走势。
- 图表墙滚动和过滤不卡顿。

### 阶段五：信息整合与 AI 解释

目标：把走势、新闻、公告、宏观事件、财报整合到图表和信号解释中。

范围：

- 事件数据源。
- 图表事件 marker。
- AI 信号解释。
- 反面风险。
- 相关资产扩散分析。

验收：

- AI 解释必须引用真实数据和事件。
- 每个解释能回到图表、指标和事件证据。

## 测试策略

### 指标测试

- EMA 对固定样本输出稳定。
- MACD 对固定样本输出稳定。
- MA 对缺失值处理稳定。
- 周线/月线聚合边界正确。

### 数据测试

- adapter 能处理分页。
- adapter 能处理空返回。
- symbol 映射失败要显式报错。
- 缺失 K 线要被记录。
- 同一 asset/timeframe/ts 不重复写入。

### API 测试

- chart-wall 一次返回多资产。
- 详情接口按 range 正确裁剪。
- scanner events 按 universe/timeframe/eventType 过滤。
- data-health 能展示失败任务。

### 前端测试

- 图表墙空状态不是假数据。
- 图表墙加载失败展示真实错误。
- 图表卡片点击打开详情抽屉。
- MACD 状态和 API 返回一致。
- 移动端不出现页面级横向溢出；表格/图表区域可以局部滚动。

## 风险与约束

1. 数据授权是最大约束，尤其 A 股、指数、实时数据。
2. 多供应商数据口径不一致，必须保留 source 和 adjusted_type。
3. 图表墙性能不能靠堆完整图表实例解决。
4. MACD 等指标必须和行情复权口径一致。
5. A 股分钟级、实时行情和商业使用授权要谨慎。
6. AI 解释不能早于真实信号系统，否则会把产品带偏。

## 推荐下一步

1. 确定第一批真实资产清单。
2. 确定第一批数据源和授权方式。
3. 写 `docs/plans/` 下的阶段一实施计划。
4. 移除当前早期英文假数据原型，改成真实数据最小闭环。
5. 先实现数据健康页和真实 K 线详情，再实现大规模图表墙。
