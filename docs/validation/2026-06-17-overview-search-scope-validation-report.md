# 概览搜索口径一致性验证报告

## 背景

概览页已经保留筛选和排序能力，但搜索关键字是前端二次过滤。如果顶部摘要和市场宽度仍使用后端 `ChartWallResponse.summary`，用户搜索某个关键词后会看到机会榜单按搜索结果变了，但“上涨/下跌/平均收益”等概览指标仍按原筛选全集计算，容易误判。

## 改动

- `SummaryStrip` 改为接收当前可见资产 `items`。
- `BreadthStrip` 改为基于当前可见资产计算上涨、下跌、强趋势、偏弱、有事件、平均收益和平均量比。
- 概览页继续保留数据源健康信息，例如 K 线记录、Raw 文件、最新 K 线和最近采集。

## 浏览器验证

URL:

`http://127.0.0.1:5193/overview?range=6m&timeframe=1d&market=基金&assetType=all&sort=return_1m&q=华夏`

页面结果：

```json
{
  "activeNav": "概览",
  "searchValue": "华夏",
  "marketText": "基金47",
  "summaryCards": [
    { "label": "当前资产", "value": "5" },
    { "label": "筛选资产", "value": "47/142" }
  ],
  "breadthCards": [
    { "label": "上涨", "value": "5" },
    { "label": "下跌", "value": "0" },
    { "label": "有事件", "value": "4" },
    { "label": "平均收益", "value": "28.19%" }
  ],
  "eventCards": 5
}
```

机会榜单也显示 `5 个资产`，事件名称均为华夏相关基金。

## API 交叉验证

同一后端筛选结果再按 `华夏` 关键词过滤：

```json
{
  "filteredItems": 5,
  "positive": 5,
  "negative": 0,
  "eventful": 4,
  "averageReturnPct": 28.19,
  "names": [
    "华夏大盘精选混合A",
    "华夏成长混合",
    "华夏国证半导体芯片ETF联接C",
    "华夏沪深300ETF联接A",
    "华夏能源革新股票A"
  ]
}
```

结论：概览摘要、市场宽度、机会榜单和机会事件都遵循同一套当前可见资产口径。

## 命令验证

- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- `pnpm lint:maintainability:guard`：通过。
- `pnpm build`：通过。
- `git diff --check`：通过。

## 维护性结论

- 口径计算集中在 `dashboard-strips.tsx`，没有把搜索逻辑复制到多个卡片组件。
- 没有新增后端 contract；这是 app 层展示口径修正。
- 触碰既有红区 `chart-wall-page.tsx` 只是删除旧传参，guard 通过。
