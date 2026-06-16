# 数据质量筛选与任务可观测联动验证报告

## 背景

用户需要能发现后台是否在同步，同时也需要在图表墙快速识别数据是否新鲜、样本是否足够。本轮补齐图表墙的数据质量筛选与排序入口，让“数据滞后/样本少”可以被筛出来，再由现有任务中心查看后台任务状态。

## 边界说明

- `packages/market-domain`：新增数据质量纯领域工具，统一 fresh/thin/lagged/missing/unknown 口径。
- `packages/local-runtime`：负责权威筛选计数和排序，新增 `data_fresh`、`data_thin`、`data_lagged` 信号与 `data_point_count` 排序。
- `apps/web-shell`：只展示筛选项、排序项、卡片指标和表格高亮，不自行决定业务口径。
- 任务管理仍由既有 `/api/tasks`、`/tasks`、顶部任务状态按钮和后台活动提示承接；后台任务事实不由页面 loading 猜测。

## 功能验证

### API 验证

`GET /api/chart-wall?...&signal=data_fresh&sort=data_point_count&order=desc`

结果摘要：

```json
{
  "signal": "data_fresh",
  "itemCount": 136,
  "signalFacet": {
    "value": "data_fresh",
    "label": "数据新鲜",
    "count": 136
  },
  "top": {
    "dataPointCount": 183
  },
  "allFresh": true
}
```

`GET /api/tasks?limit=8`

结果摘要：

```json
{
  "totalCount": 22,
  "runningCount": 0,
  "failedCount": 0,
  "staleRunningCount": 0,
  "pipelineSummaries": 2,
  "latestTask": "全市场行情同步"
}
```

### 浏览器验证

地址：

```txt
http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&signal=data_fresh&sort=data_point_count&order=desc
```

结果：

```json
{
  "cardCount": 136,
  "hasDataFresh": true,
  "hasDataPointSort": true,
  "signalCountLine": "136",
  "statusButtonText": "任务正常最近 全市场行情同步运行 0卡住 0失败 0"
}
```

地址：

```txt
http://127.0.0.1:5193/chart-wall?view=table&range=6m&timeframe=1d&signal=data_fresh&sort=data_point_count&order=desc
```

结果：

```json
{
  "rowCount": 136,
  "activeSortCells": 136,
  "dataCellsActive": true,
  "compactQualityCount": 136,
  "dataHeaderText": "数据"
}
```

## 维护性结论

- 数据质量口径从前端组件抽到 `market-domain`，避免前后端各算各的。
- 后端筛选和排序仍在 `local-runtime` 的专门 service 中，符合 package/app 边界契约。
- 表格复用既有 active sort 样式，没有新增并行样式体系。
- `scripts/smoke/functional-smoke.mjs` 目前 311 行，接近 360 行 guard 阈值；后续继续扩 smoke 时应拆分场景脚本。
