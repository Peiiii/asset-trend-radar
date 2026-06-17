# Package 与 App 职责边界契约

## 目的

Gold Insights 是本地优先的 Web 架构：前端 app 运行在浏览器，本地 runtime 提供 API、任务和 SQLite 数据。为了避免后续功能越做越散，所有新增功能必须先判断“业务事实、数据访问、业务查询、界面状态、视觉组件”分别属于哪一层。

本契约优先级高于单个页面里的临时便利写法。新增代码如果需要违反这里的边界，必须先更新本文并说明原因。

## 总体依赖方向

依赖只能从外向内，不能反向依赖：

```txt
apps/*
  -> packages/ui
  -> packages/local-runtime API contract through HTTP only
  -> packages/market-domain types only

packages/local-runtime
  -> packages/market-domain
  -> packages/data-storage
  -> packages/data-adapters
  -> packages/indicator-engine
  -> packages/scanner-engine

packages/data-storage
  -> packages/market-domain types

packages/data-adapters
  -> packages/market-domain types

packages/indicator-engine
  -> packages/market-domain types

packages/scanner-engine
  -> packages/market-domain types
  -> packages/indicator-engine outputs

packages/market-domain
  -> no workspace package dependency
```

禁止：

- 跨 package deep import，例如从 app 引入 `packages/local-runtime/src/...`。
- `packages/ui` 依赖业务 package 或 API。
- `packages/data-adapters` 写 SQLite。
- `packages/data-storage` 调外部 HTTP 数据源。
- app 直接读 SQLite、本地文件、供应商 API。
- React component 内实现可复用业务查询、指标计算、数据拼装规则。

## apps/web-shell

职责：

- 页面路由、URL query、浏览器交互状态。
- 调用本地 API service。
- 组合 feature component 和 `packages/ui` 组件。
- 处理页面级 loading、error、empty 状态。
- 做纯展示映射，例如中文 label、按钮文案、表格列顺序。

不负责：

- 指标计算。
- 数据供应商调用。
- SQLite 查询。
- 资产筛选的权威统计口径。
- 基金是否已入库、涨幅如何计算这类业务事实。

约束：

- 复杂页面状态应收敛到 hook/service/class，避免单个 React 文件无限增长。
- URL 是页面状态的来源，但不是业务事实来源。
- 如果需要新接口字段，先在 `market-domain` 定义 response contract，再在 app 使用。
- 资产规模、市值、流通市值、完全稀释估值、成交额快照使用 `market-domain` 的 `AssetValuation`
  contract。app 只负责格式化和“未接入/源未提供”展示；外部估值源的拉取、缓存、失败降级和排序补全属于
  `data-adapters` + `local-runtime`。

### 概览页与图表墙

`/overview` 和 `/chart-wall` 可以共用同一套筛选、排序、搜索与时间范围 query；这些 query 表达“当前观察口径”，不是某个页面私有状态。两个页面的区别在信息任务：

- `/overview`：市场驾驶舱。展示筛选口径下的市场宽度、板块强弱、排序异动、机会榜单和扫描事件，帮助用户先判断机会集中在哪里。
- `/chart-wall`：交易所式走势列表。展示筛选口径下的资产卡片/表格、排名质量、对比和单资产入口，帮助用户批量浏览具体走势。

约束：

- 不要把概览型模块继续塞进图表墙列表区；概览型组件优先进入 `overview-section`。
- 不要为了概览页复制一套筛选状态；筛选控件应复用同一套 URL query 和 API 口径。
- 只要概览指标来自已有 `ChartWallResponse`，就留在 app 展示层编排；如果需要新的权威聚合字段，先扩展 `market-domain` response contract，再由 `local-runtime` 计算。
- 图表墙只在 runtime 中按需补全真实 `AssetValuation` 后再做 `market_cap` 排序。跨币种场景必须由
  `data-adapters` 的真实汇率快照和 `local-runtime` 的 USD 归一化字段提供可比排序值；前端不得用成交量、价格、
  固定汇率或其它展示字段伪造规模排序。没有估值来源或汇率来源的资产应作为缺值排到后面，只有同币种列表可以回退原币种数值排序。

### 资产目录

`/directories/*` 是“轻量目录 + 走势池状态”的入口族，不绑定某一个资产类别。它与图表墙的区别是信息任务：

- 目录页：先看某类资产是否存在、是否已在走势池、是否有轻量快照或可导入动作。
- 图表墙：只看已经进入走势池、可绘制完整走势和指标的资产。

约束：

- `资产目录` 是导航父级，默认展开；子目录按资产类别扩展，例如基金、加密、商品。
- 已有基金目录继续由 `local-runtime` 的基金 catalog API 提供权威目录与导入动作。
- 加密目录由 `data-adapters` 的交易所轻量 catalog 提供候选池，并由加密市场数据源补充市值/成交额快照；`local-runtime` 合并本地走势池状态；候选池完整性不等于默认全量导入走势池。
- 美股目录由 `data-adapters` 的 NASDAQ Trader 官方符号目录提供股票/ETF 候选池，由 Nasdaq screener/quote summary
  补充股票和重点 ETF 的真实市值快照，`local-runtime` 合并本地走势池状态；未入池条目可以按需拉取 Yahoo 历史走势后进入走势池。
- A 股目录由 `data-adapters` 的东方财富 A 股行情列表提供股票候选池、1D 快照和市值快照，`local-runtime` 合并本地指数/ETF/重点公司走势池状态；未入池股票可以按需拉取 Yahoo 历史走势后进入走势池。
- NASDAQ Trader 符号目录和 Yahoo chart 端点不提供 market cap；美股估值必须来自 Nasdaq screener/quote summary 或后续
  新增的真实 fundamentals 源。不得用成交额、价格或本地 K 线估算市值。
- 其它资产类别在没有全量 catalog API 前，只能展示真实已入库资产，不做假全量；如果需要全量目录，先扩展 `market-domain` contract 和 `local-runtime` catalog service。
- 商品、债券、宏观等趋势池目录里的 USD ETF/基金代理标的可以复用 Nasdaq quote summary 的真实规模快照；商品期货、宏观指数、
  外汇等没有适用份额规模语义的资产不得伪造市值。
- 通用目录表格、状态 badge、详情/对比入口可以在 app 层复用；外部目录同步、导入、去重和走势池写入必须在 runtime 层实现。
- 目录表格采用统一基础列契约：名称、类别/市场、走势池状态、最新价/净值、规模/市值、1D、1M、3M、6M、1Y、数据状态、操作。各资产类别可以通过 adapter 提供不同字段取值和类别特有动作，但不要为同义字段另起一套布局、颜色或交互。
- 表格横向滚动、首列/操作列 fixed、收益颜色语义、hover/focus 等基础体验应复用公共组件；除非某类资产有明确业务差异，否则不要复制一套近似 CSS 或列结构。

## apps/local-shell

职责：

- 本地 runtime 的薄入口。
- 读取环境变量和启动参数。
- 创建 `LocalRuntimeService` 并启动/停止。

不负责：

- 业务逻辑。
- 数据源适配。
- API 路由细节。
- SQLite schema。

约束：

- 入口应保持薄层。新增 runtime 行为优先进入 `packages/local-runtime`。

## packages/market-domain

职责：

- 跨层共享的领域类型。
- API request/response 类型。
- 资产、K 线、指标、扫描事件、基金目录等 canonical contract。
- 纯领域工具，例如时间范围计算、稳定枚举、轻量格式无关规则。

不负责：

- HTTP fetch。
- SQLite 查询。
- React 展示。
- Node 本地文件访问。

约束：

- 新 API 返回结构必须在这里声明。
- 类型命名表达业务语义，不表达某个 UI 组件。
- 纯工具可以是函数；有状态或业务流程不放这里。

## packages/data-adapters

职责：

- 外部真实数据源适配。
- 供应商 symbol 到 canonical 数据的映射。
- HTTP 请求、分页、重试、限流、供应商响应解析。
- 输出 raw records 和 canonical records。

不负责：

- 写数据库。
- 维护 app 状态。
- 扫描规则。
- 产品筛选和排序。

约束：

- provider 返回 canonical 类型或 provider-specific raw payload 包装。
- 供应商异常要保留上下文，便于 runtime 记录任务失败。
- 不在 adapter 内判断“这个资产是否应显示在图表墙”。

## packages/data-storage

职责：

- SQLite schema 初始化和迁移。
- Repository 读写。
- 本地 raw 文件追加存储。
- 查询可以做数据库层聚合，但不做产品语义决策。

不负责：

- HTTP 数据抓取。
- React 展示。
- 扫描策略。
- 业务 service 编排。

约束：

- Repository 方法应表达数据访问能力，例如 `listCatalogPage`、`getSummary`、`upsertBars`。
- 不把某个页面的筛选逻辑硬编码进 repository。
- 大查询要优先在 SQLite 层分页、过滤、计数，不把 27010 条全量拉到 app。

## packages/local-runtime

职责：

- 本地 API server。
- Controller 解析 HTTP、校验 query/body、返回 JSON。
- Service 编排 repository、adapter、indicator、scanner。
- 资产走势池、基金目录、图表墙、详情页、数据状态等业务查询口径。
- 本地任务启动、刷新、导入、重算。

不负责：

- 视觉组件。
- CSS。
- 页面组件状态。
- 供应商响应的底层解析细节。

约束：

- 后端尽量以 class 组织业务逻辑，实例方法优先箭头函数。
- Controller 不写复杂业务；复杂逻辑进入 service。
- Service 可以组合多个 repository/provider，形成真正业务边界。
- API 路由返回的是 `market-domain` 定义的 contract。

## packages/indicator-engine

职责：

- MA、EMA、MACD、RSI 等可复算指标。
- 纯计算，无副作用。

不负责：

- 数据抓取。
- 数据存储。
- UI 展示。
- 扫描事件落库。

约束：

- 输入输出使用 canonical bar / indicator 类型。
- 不读取全局时间或环境变量。

## packages/scanner-engine

职责：

- 根据 bars 与 indicators 生成扫描事件。
- 规则解释、severity、evidence。

不负责：

- 拉取行情。
- 写数据库。
- 前端排序和布局。

约束：

- 规则应该可测试、可复算。
- 新扫描规则优先作为独立 rule/manager 能力，不塞进查询 service。

## packages/ui

职责：

- 业务无关或低业务耦合的视觉组件。
- Button、Select、RangePicker、TimeframePicker、Chart、Badge、Empty/Error/Loading。
- 组件交互基础规范，例如 hover、focus-visible、disabled。

不负责：

- 调 API。
- 读取 URL。
- 理解基金目录、资产池、扫描事件的业务含义。
- 决定筛选、排序和入库逻辑。

约束：

- UI 组件通过 props 接收数据和回调。
- 不依赖 `apps/*` 或 `local-runtime`。
- 图表组件可以接收 canonical points，但不负责补数、算指标。

## 基金目录功能的边界示例

基金目录是后续最容易漂移的功能，按以下边界执行。

### 正确分层

```txt
Eastmoney catalog/search/nav API
  -> data-adapters: 拉取和解析供应商数据
  -> data-storage: fund_catalog / asset / ohlcv_bars 读写
  -> local-runtime: 目录分页、是否已入库、导入走势池、已入库指标聚合
  -> market-domain: FundCatalogPageResponse 等 contract
  -> apps/web-shell: 基金目录页面、筛选、分页、按钮交互
  -> packages/ui: 通用 Select/Button/Table/状态组件
```

### 目录与走势池

- `fund_catalog` 是轻量目录，目标是尽量全，允许 27010+ 条。
- `assets + ohlcv_bars` 是走势池，目标是可画图、可排序、可扫描，只放已导入或系统精选的基金。
- 图表墙只展示走势池，不展示未导入目录条目。
- 基金目录页可以展示全量目录，但未导入条目不能伪造走势图或涨幅。
- 已导入条目的轻量涨幅来自真实 `ohlcv_bars`，不由前端计算。

### 未来轻量涨幅快照

如果要让未导入基金也有近 1D/1W/1M/3M 涨幅，应新增轻量表，例如：

```txt
fund_catalog_metrics(
  code,
  snapshot_at,
  latest_nav,
  latest_nav_date,
  return_1d,
  return_1w,
  return_1m,
  return_3m,
  source
)
```

这个表由 `data-adapters` 拉供应商轻量排行/估值接口，`data-storage` 保存，`local-runtime` 合并到目录页。前端只展示 contract，不自己推导。

## 任务管理模块的边界示例

后台任务是本地 runtime 的可观测事实，不是某个页面自己的 loading 状态。同步行情、基金目录、基金导入、未来的扫描重算和数据修复任务，都应进入同一条任务记录链路。

### 正确分层

```txt
业务任务启动
  -> data-storage: ingestion_jobs / task tables 读写
  -> local-runtime: 任务生命周期、聚合、疑似卡住判断、API contract 填充
  -> market-domain: RuntimeTask / TaskCenterResponse 等 contract
  -> apps/web-shell: 顶部活动提示、任务中心页面、筛选与跳转
  -> packages/ui: 通用按钮、Badge、状态组件
```

### 任务中心与页面 loading

- `ingestion_jobs` 是任务事实来源，记录本地后台任务的开始、结束、状态、错误和元数据。
- `TaskCenterService` 负责把底层 job 聚合成用户可理解的运行中、疑似卡住、失败、管线健康度。
- 页面自己的 `isLoading` / `isRefreshing` 只表达当前页面请求状态，不能替代后台任务事实。
- 顶部任务按钮和全局活动提示条只消费 `/api/tasks`，不直接猜测某个业务请求是否还在运行。
- 面向页面按钮的长任务启动接口应快速返回 `taskId/status`，进度、失败和疑似卡住状态交给任务中心轮询展示。
- 新增任务类型时，先确保 runtime 记录任务生命周期，再让前端展示；不要只在按钮旁边放一个局部 spinner。

## 新功能落地检查

新增功能前先回答：

1. 这是领域类型、数据源、存储、业务查询、页面状态还是视觉组件？
2. 这个文件是否依赖了不该依赖的 package？
3. 这个逻辑是否以后会被另一个页面复用？如果会，不能只写在 React component 内。
4. 这个数据是否是业务事实？如果是，应由 API 返回，不由前端猜。
5. 这个页面是否把未加载/未导入数据展示成了已存在事实？

提交前检查：

- `pnpm typecheck`
- `pnpm lint`
- 涉及代码时运行 `pnpm lint:maintainability:guard`
- 涉及 API/数据时运行 `pnpm smoke`
