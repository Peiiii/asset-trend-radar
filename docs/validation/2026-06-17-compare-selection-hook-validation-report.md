# 对比选择 Hook 抽离验证报告

## 背景

`chart-wall-page.tsx` 是当前前端红区之一，页面同时承担 URL 状态、对比选择、对比数据加载、资产详情加载和多个业务视图组合。多资产对比已经成为图表墙发现机会的重要链路，本轮先把对比选择与 compare 请求抽离到专门 hook，减少页面组件内的状态编排。

## 边界说明

- `apps/web-shell/src/features/chart-wall/hooks/use-compare-selection.ts`：负责对比资产选择、最多 6 个资产、compare 数据加载和取消过期请求结果。
- `chart-wall-page.tsx`：只消费 hook 返回的 `compareAssetIds`、`compareData`、`comparedSet`、`toggleCompare`、`clearCompare`。
- `packages/local-runtime` / `market-domain`：未改动；仍使用既有 `/api/compare` contract。
- 没有把 compare 行为放进 React 组件树深层，也没有新增跨 package deep import。

## 浏览器验证

地址：

```txt
http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&sort=return_1m&order=desc
```

操作：

1. 打开新 tab 加载图表墙。
2. 点击前两张图表卡的“加入对比”按钮。
3. 读取当前页面对比面板状态。

结果摘要：

```json
{
  "bodyHasRuntimeError": false,
  "panelVisible": true,
  "insightCount": 4,
  "rowCount": 2,
  "tokenCount": 2,
  "insightText": [
    "领跑+153.14%财通成长优选混合A001480 / 区间涨幅",
    "末位+99.23%创金合信专精特新股票发起A014736 / 区间涨幅",
    "抗跌-9.10%财通成长优选混合A001480 / 最大回撤",
    "样本119 点覆盖一致2 个资产参与对比"
  ]
}
```

清空操作验证：

```json
{
  "panelVisible": false,
  "insightCount": 0,
  "rowCount": 0,
  "tokenCount": 0
}
```

浏览器 dev log 中保留了热更新期间旧 bundle 的 `handleCompare is not defined` 历史错误；重新加载后的页面正文不包含该错误，源码搜索无 `handleCompare` 残留，`pnpm typecheck` 与 `pnpm lint` 均通过。

## 维护性结论

- `chart-wall-page.tsx` 从 816 行降到 802 行，仍是红区，但对比状态已经形成独立 hook 边界。
- 新增 `use-compare-selection.ts` 61 行，低于 guard 限制。
- 这次没有改变后端和 API contract，属于前端页面状态编排收口。
