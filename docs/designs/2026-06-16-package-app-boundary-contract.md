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
