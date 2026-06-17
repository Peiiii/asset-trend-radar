# 图表墙筛选弹层与任务轮询稳定性验证报告

## 背景

用户反馈全市场图表墙每几秒闪/抖一下，随后又发现筛选项下拉打不开。本轮定位到两个前端体验问题：

- `useTaskCenterQuery` 每 3 秒轮询都会短暂设置 `isLoading=true`，导致运行中任务提示条在轮询期间被卸载，页面高度发生变化。
- 通用 `Select` 的菜单渲染在触发器所在 DOM 内。图表墙筛选区为了横向容纳多筛选项使用 `overflow-x: auto`，浏览器会把纵向 overflow 也计算为 `auto`，菜单被滚动容器裁剪，看起来像打不开。

## 改动

- `apps/web-shell/src/features/chart-wall/hooks/use-task-center-query.ts`
  - 首次加载任务中心时仍展示 loading。
  - 首次成功后，后续轮询静默刷新数据、错误和最近拉取时间，不再触发页面级 loading。
- `packages/ui/src/components/select.tsx`
  - 下拉菜单通过 `createPortal` 挂到 `document.body`。
  - 菜单使用触发器坐标做 fixed 定位，支持窗口 resize 与页面/容器 scroll 后重算位置。
  - outside click 同时识别触发器和 portal 菜单，避免点击菜单项前被关闭。
- `packages/ui/package.json`
  - 明确 `react-dom` 为 UI 包 peer dependency。
- 榜单质量摘要从网格专用组件提炼为 `RankingQualitySummary`，图表网格和交易所表格共用。

## 边界

- 任务事实仍由 `packages/data-storage` 的 `ingestion_jobs`、`packages/local-runtime` 的 `/api/tasks` 和 `TaskCenterService` 提供。
- 前端只改变轮询展示策略，不自行推断后台任务状态。
- Select 弹层属于 `packages/ui` 的通用交互能力，不在图表墙页面做局部 hack。
- 榜单质量摘要仍是 app 展示层汇总，不改变后端排序口径。

## 浏览器验证

### 任务运行中稳定性

URL:

`http://127.0.0.1:5193/chart-wall?view=table&range=6m&timeframe=1d&market=商品&assetType=all&sort=volume_ratio&order=desc`

触发真实后台同步后，等待超过一个 3 秒轮询周期：

```json
{
  "before": {
    "noticeCount": 1,
    "statusButtonText": "运行中 1全市场行情同步运行 1卡住 0历史失败 1",
    "tableTop": 2149,
    "summaryTop": 2227
  },
  "after": {
    "noticeCount": 1,
    "statusButtonText": "运行中 1全市场行情同步运行 1卡住 0历史失败 1",
    "tableTop": 2149,
    "summaryTop": 2227
  }
}
```

结论：运行中提示条没有在轮询时消失，表格位置没有跳动。

### 空闲态稳定性

同步完成后再次等待超过一个 3 秒轮询周期：

```json
{
  "before": {
    "noticeCount": 0,
    "rowCount": 40,
    "tableTop": 2061,
    "summaryTop": 2139
  },
  "after": {
    "noticeCount": 0,
    "rowCount": 40,
    "tableTop": 2061,
    "summaryTop": 2139
  }
}
```

结论：空闲态轮询不再引发布局跳动。

### 市场筛选下拉

点击 `市场` 筛选：

```json
{
  "portalParent": "BODY",
  "filtersContainsContent": false,
  "filtersOverflowX": "auto",
  "filtersOverflowY": "auto",
  "rootOpenCount": 1,
  "listboxText": "全部市场142A 股指数、ETF、重点公司12基金Eastmoney 场外基金47..."
}
```

选择 `基金` 后：

```json
{
  "url": "http://127.0.0.1:5193/chart-wall?view=table&range=6m&timeframe=1d&market=%E5%9F%BA%E9%87%91&assetType=all&sort=volume_ratio&order=desc",
  "selectedMarketText": "基金47",
  "toolbarText": "47 个资产当前按 量比 降序 排列上涨 32下跌 15有事件 27强趋势 8",
  "rowCount": 47,
  "listboxCountAfterChoose": 0
}
```

结论：菜单脱离滚动容器裁剪，能打开并正常选择。

### 排序筛选下拉

点击 `排序` 后选择 `1M 涨幅`：

```json
{
  "sortText": "1M 涨幅",
  "rankingText": "榜单质量1M 涨幅 降序有效样本47 / 47缺值0中位数+0.19%首尾差+64.50%",
  "toolbarText": "47 个资产当前按 1M 涨幅 降序 排列上涨 32下跌 15有事件 27强趋势 8",
  "listboxCount": 0
}
```

结论：排序下拉可打开、可选择，榜单质量摘要同步更新。

## 命令验证

- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- `pnpm lint:maintainability:guard`：通过。
- `pnpm build`：通过。
- `git diff --check`：通过。
- `pnpm smoke`：通过。

Smoke 摘要：

```json
{
  "status": "passed",
  "assetCount": 160,
  "barCount": 216020,
  "chartWallItems": 139,
  "fundItems": 86,
  "commodityItems": 40,
  "fundCatalogCount": 27010,
  "taskCenter": {
    "tasks": 4,
    "runningCount": 0,
    "staleRunningCount": 0,
    "failedCount": 0,
    "pipelineSummaries": 3
  }
}
```

## 维护性结论

- 这次没有新增 `packages/ui/src/components` 下的 peer 文件，只修改已有 `Select`。maintainability guard 提醒该目录已经在 adopted budget 内，后续新增组件前应拆分目录。
- `select.tsx` 为 170 行，`use-task-center-query.ts` 为 79 行，新增 `RankingQualitySummary` 组件 120 行，均低于单文件硬限制。
- 本轮把下拉弹层能力放回通用 UI 组件，把任务轮询语义放在任务查询 hook，避免页面继续堆交互细节。
