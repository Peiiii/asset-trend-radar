# 图表墙数据质量可见性验证报告

## 变更范围

- 新增 `DataQualityIndicator` 业务展示组件，复用 `ChartWallItem` 中已有的 `source`、`latestBarAt`、`firstBarAt`、`dataPointCount`。
- 资产卡片新增数据质量条，展示数据新鲜度、来源、最新时间和样本点数。
- 交易所式表格的 `数据` 列改用同一组件的紧凑版，避免卡片和表格口径分叉。
- 删除表格中旧的数据密度样式，`exchange-table.css` 从 304 行降到 285 行。

## 自动化验证

```txt
pnpm typecheck
passed

pnpm lint
passed

pnpm lint:maintainability:guard
passed

pnpm build
passed

pnpm smoke
passed
- assetCount: 154
- chartWallItems: 133
- fundItems: 80
- commodityItems: 34
- fundCatalogCount: 27018
- taskCenter.runningCount: 0
```

## 浏览器验证

### 卡片视图

URL: `http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&sort=return_1m&order=desc`

- 卡片数量：`136`。
- 数据质量组件数量：`136`。
- 前 5 个组件均包含 `数据新鲜`、数据源、最新时间、点数。
- 示例：`数据新鲜 eastmoney 06/16 00:00 119 点`。
- `aria-label` 包含完整说明，例如 `数据状态: 数据新鲜，覆盖 12/16 00:00 起的走势`。
- 控制台错误数：`0`。

### 交易所表格视图

URL: `http://127.0.0.1:5193/chart-wall?view=table&range=6m&timeframe=1d&sort=return_1m&order=desc`

- 表格行数：`136`。
- `数据` 列存在。
- 数据质量组件数量：`136`。
- 紧凑版组件数量：`136`。
- 前 5 个组件均包含 `数据新鲜`、数据源、最新时间、点数。
- 控制台错误数：`0`。

## 维护性结论

- 未新增后端字段，后端继续只负责返回事实；前端组件只做展示映射。
- 数据质量展示复用于卡片和表格，减少重复 UI 口径。
- 没有新增或扩大红区；`exchange-table.css` 行数下降。
- 本轮新增组件放在 `components/data-quality/` 子目录，没有继续向拥挤的 feature 根组件目录增加同级文件。
