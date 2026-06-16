# 快捷策略预设功能验证报告

日期：2026-06-17

## 背景

图表墙已经支持多维筛选、排序和市场/机会榜单，但用户仍需要手动组合市场、品种、信号、排序、时间范围。成熟行情产品通常提供常用策略入口，让用户一键切换到高价值视图。本次新增快捷策略预设，减少重复配置成本。

## 实现范围

新增 `StrategyPresetStrip`，提供 6 个一键视图：

- 强趋势：强趋势信号 + 趋势分排序。
- 放量异动：量能放大信号 + 量比排序。
- MACD 金叉：MACD 金叉信号 + MACD/事件排序。
- 基金领涨：基金市场 + fund 品种 + 1M 涨幅排序。
- 商品异动：商品市场 + commodity 品种 + 量比排序。
- 加密动量：加密市场 + crypto 品种 + 1M 涨幅排序。

点击预设会更新 URL query，并清除搜索词与层级筛选，避免旧搜索导致预设视图为空。

## 职责边界

- 预设只组合已有 URL 筛选参数。
- 不新增后端 API、不改变排序口径、不引入假数据。
- 组件位于 `apps/web-shell/src/features/chart-wall/components/strategy-preset-strip/`。

## 浏览器验证

验证地址：

```text
http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&q=华夏
```

使用本机 Chrome + Playwright 验证：

```json
{
  "hasPresetStrip": true,
  "fundPresetApplied": true,
  "fundChipVisible": true,
  "activeAfterFund": true,
  "volumePresetApplied": true,
  "volumeChipVisible": true,
  "errors": []
}
```

已确认：

- 快捷策略条可见。
- 基金领涨预设会应用 `market=基金`、`assetType=fund`、`sort=return_1m`，并清除旧搜索词。
- 放量异动预设会应用 `signal=volume_breakout`、`sort=volume_ratio`，并移除基金市场筛选。
- active preset 样式可见。
- 浏览器 console 无错误。

## 自动化验证

已执行：

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
pnpm build
pnpm smoke
```

结果均通过。`pnpm smoke` 关键输出：

```json
{
  "status": "passed",
  "sources": ["yahoo", "eastmoney"],
  "assetCount": 132,
  "barCount": 162318,
  "chartWallItems": 111,
  "fundItems": 69,
  "commodityItems": 12
}
```

## 维护性结论

- `strategy-preset-strip.tsx` 101 行，CSS 89 行，低于 360 行限制。
- `chart-wall-page.tsx` 只新增预设应用函数与组件入口，仍在既有 oversized baseline 内。
- `lint:maintainability:guard` 通过，red-zone 文件/目录数量未增加。

## 结论

快捷策略预设已可用。用户可以从常见投资机会视角一键切换筛选和排序，图表墙的探索效率更接近成熟行情产品。
