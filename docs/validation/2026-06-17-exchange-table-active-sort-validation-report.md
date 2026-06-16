# 行情表当前排序列高亮验证报告

## 背景

图表墙的表格视图承担“交易所式快速扫盘”的职责。此前表头会显示当前排序字段，但表体缺少贯穿高亮，用户需要自己对应列位置，尤其在横向滚动表格里不够直观。本轮增强当前排序列在每一行中的可见性。

## 职责边界

- `apps/web-shell`：增强行情表展示状态。
- `packages/local-runtime`：未改动，排序结果仍来自既有图表墙 API。
- `packages/market-domain`：未改动，继续复用 `ChartWallItem` 和 `ChartWallSortOrder`。
- `packages/ui`：未改动。

## 变更范围

- `ExchangeTableRow` 接收当前 `sort`。
- 当前排序字段对应的行内单元格添加 `exchange-table__cell--active-sort`。
- 支持高亮字段：
  - `symbol`
  - `market`
  - `asset_type`
  - `return_1d`
  - `return_1m`
  - `return_3m`
  - `return_6m`
  - `return_1y`
  - `volume_ratio`
  - `drawdown`
  - `trend_score`
  - `event_count`
- 新增 `exchange-table-active-sort.css` 承载排序列高亮样式，避免继续扩大主表格 CSS。

## 浏览器验证

### 1M 涨幅排序

访问：

```txt
http://127.0.0.1:5193/chart-wall?view=table&range=6m&timeframe=1d&market=商品&tag=贵金属&sort=return_1m&order=desc
```

验证结果：

```json
{
  "rowCount": 10,
  "activeCellCount": 10,
  "firstActiveCell": {
    "index": 6,
    "text": "-3.79%"
  },
  "toolbarText": "10 个资产当前按 1M 涨幅 降序 排列上涨 6下跌 4有事件 0强趋势 0"
}
```

表头第 6 列为 `1M`，证明行内高亮列与当前排序口径一致。

### 趋势分排序

访问：

```txt
http://127.0.0.1:5193/chart-wall?view=table&range=6m&timeframe=1d&market=商品&tag=贵金属&sort=trend_score&order=desc
```

验证结果：

```json
{
  "rowCount": 10,
  "activeCellCount": 10,
  "firstActiveCell": {
    "index": 12,
    "text": "13"
  },
  "toolbarText": "10 个资产当前按 趋势 降序 排列上涨 6下跌 4有事件 0强趋势 0"
}
```

表头第 12 列为 `趋势`，证明切换排序后高亮列随排序字段更新。

浏览器 console error：

```json
[]
```

## 自动验证

- `pnpm typecheck`：通过。
- `pnpm lint:maintainability:guard`：通过。
- `pnpm lint`：通过。
- `pnpm build`：通过。
- `pnpm lint:maintainability:hotspots`：通过。
- `pnpm smoke`：通过。

`pnpm smoke` 摘要：

```json
{
  "status": "passed",
  "assetCount": 154,
  "chartWallItems": 133,
  "fundItems": 80,
  "commodityItems": 34,
  "fundCatalogCount": 27018
}
```

## 维护性结论

- 没有新增红区文件或红区目录。
- 主表格 CSS 保持 304 行，新增高亮样式拆到 17 行的小文件。
- `exchange-table` 目录直接文件数为 3，低于目录上限。
- 本轮让表格排序状态更可扫读，符合交易所式高密度行情表的预期。
