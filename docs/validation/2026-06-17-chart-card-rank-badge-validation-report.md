# 图表卡片排序名次验证报告

## 背景

图表墙网格是用户肉眼扫机会的核心视图。此前交易所式表格有排名列，但图表卡片模式只有卡片顺序，没有显式名次。用户按 1M、3M 涨幅、趋势分等指标排序后，需要靠位置猜测排名，不够直观。

## 本轮调整

- `ChartGrid` 按当前已排序的 `items` 顺序传入 `rank=index+1`。
- `AssetChartCard` 在 header 身份区展示 `#1`、`#2`、`#3` 等名次。
- 前三名使用更醒目的 top 样式，其余名次保持轻量。
- 详情页和自选页没有排序语义，继续不传 `rank`。

## 边界确认

- `apps/web-shell`：只展示当前排序后的名次，不重新排序、不计算业务指标。
- `packages/market-domain`：未改动，现有 `ChartWallItem` 足够。
- `packages/local-runtime`：未改动，排序和数据事实不变。
- `packages/ui`：未改动，卡片业务布局仍在 feature 内。

## 浏览器验证

地址：

`http://127.0.0.1:5193/chart-wall?view=grid&range=3m&timeframe=1d&sort=return_3m&order=desc`

验证结果：

```json
{
  "cardCount": 136,
  "cards": [
    {
      "rank": "#1",
      "name": "财通成长优选混合A",
      "metric": "排序 3M 涨幅+123.15%",
      "rankClass": "asset-chart-card__rank asset-chart-card__rank--top"
    },
    {
      "rank": "#2",
      "name": "iShares 半导体 ETF",
      "metric": "排序 3M 涨幅+75.01%",
      "rankClass": "asset-chart-card__rank asset-chart-card__rank--top"
    },
    {
      "rank": "#3",
      "name": "创金合信专精特新股票发起A",
      "metric": "排序 3M 涨幅+71.05%",
      "rankClass": "asset-chart-card__rank asset-chart-card__rank--top"
    },
    {
      "rank": "#4",
      "name": "VanEck 半导体 ETF",
      "metric": "排序 3M 涨幅+56.38%",
      "rankClass": "asset-chart-card__rank asset-chart-card__rank--normal"
    }
  ]
}
```

结论：

- 网格卡片能够显式展示排序名次。
- 排名与当前排序指标一致。
- 前三名有明确视觉强调，适合一屏多图快速扫机会。

## 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
pnpm build
```

## 维护性

- 变更集中在 `AssetChartCard` 与 `ChartGrid`。
- 没有新增 package deep import。
- 没有触碰已收养红区文件。
- 卡片只接收展示用 `rank`，没有把排序逻辑塞进组件。
