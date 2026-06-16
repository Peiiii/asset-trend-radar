# Gold Insights 数据健康工作台验证报告

## 本轮目标

本轮增强“数据源与任务状态”页面。真实数据产品需要让用户快速判断数据是否可信、是否新鲜、来源覆盖是否足够，以及最近任务是否异常。原页面只是路径、文件数和简单 provider 列表，本轮升级为数据健康工作台。

## 实现范围

- `DataHealthSection` 移入独立组件目录，避免继续扩大 `components` 根目录。
- 新增数据健康摘要：
  - 数据新鲜度。
  - 资产覆盖。
  - K 线数量。
  - 本地存储。
- 将“同步任务”文案调整为“最近记录任务”，避免把基金导入任务误读为全市场行情同步任务。
- 最近任务状态增加语义色：成功、运行中、失败。
- 数据源 provider 卡片增加语义色：
  - active 且有资产：positive。
  - active 但资产数为 0：amber。
  - reserved：neutral。
- 按周期、按来源统计继续保留。
- data-health/provider/mini-count 样式从全局 `index.css` 移到组件 CSS。

## 边界确认

- `apps/web-shell`：数据健康页面展示、数据新鲜度解释、颜色语义、文案。
- `packages/local-runtime`：继续负责 `/api/data-health` 数据事实。
- `packages/market-domain`：沿用 `DataHealthResponse`。
- `packages/ui`：复用 `SignalBadge`。

## 功能验证

页面可达：

```txt
curl http://127.0.0.1:5193/data-health -> 200
```

数据健康接口样例：

```json
{
  "assetCount": 134,
  "barCount": 168915,
  "latestBarAt": "2026-06-16T17:12:59.000Z",
  "lastIngestionAt": "2026-06-16T17:39:31.512Z",
  "providers": [
    { "id": "yahoo", "status": "active", "assetCount": 67 },
    { "id": "eastmoney", "status": "active", "assetCount": 47 },
    { "id": "binance", "status": "active", "assetCount": 0 },
    { "id": "fred", "status": "reserved", "assetCount": 0 }
  ],
  "latestJob": {
    "vendor": "eastmoney",
    "dataset": "fund-import:000001",
    "status": "success"
  }
}
```

完整 smoke：

```json
{
  "status": "passed",
  "assetCount": 132,
  "barCount": 162304,
  "chartWallItems": 111,
  "fundItems": 69,
  "commodityItems": 12,
  "taskCenter": {
    "tasks": 4,
    "runningCount": 0,
    "failedCount": 0
  }
}
```

## 验证命令

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm lint:maintainability:guard`
- `pnpm smoke`

## 维护性结果

- `data-health-section` 已收敛到独立目录。
- `index.css` 从 1247 行降到 1138 行。
- `lint:maintainability:guard` 通过，没有新增 package deep import 或红区增长。
- 新增 `data-health-section.tsx` 101 行、`data-health-section.utils.ts` 97 行，均低于单文件上限。

## 已知限制

本轮没有改变 `/api/data-health` 契约。页面根据当前返回字段解释最近任务和数据新鲜度；如果未来需要同时展示“最近全市场行情同步任务”和“最近任意任务”，应在 `market-domain` 和 `local-runtime` 增加明确字段，而不是前端猜测。
