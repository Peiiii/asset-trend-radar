# 对比选择托盘功能验证报告

日期：2026-06-17

## 背景

在机会榜单、图表卡片和表格里点击“对比”后，原实现只有选择 2 个以上资产才显示对比面板。用户选择第 1 个资产时没有明确反馈，容易误以为点击没有生效。本次增强补齐这个基础体验。

## 实现范围

- `ComparePanel` 在选择 1 个资产时不再隐藏。
- 选择 1 个资产时显示待对比提示：已选择 1 个资产，再选择 1 个即可开始对比。
- 选择 2 个以上资产时继续展示归一化走势对比图和指标表。
- 对比面板从图表列表底部移动到“走势总览”标题下方，反馈位置更靠近用户当前操作流。

## 职责边界

- 对比数据仍由 `chartWallApiService.fetchCompare` 调用 runtime API 获取。
- 前端只增强选择状态展示，不改变 compare API contract。
- 改动限定在 `apps/web-shell` 组件层，未新增后端业务逻辑。

## 浏览器验证

地址：

```text
http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&sort=trend_score
```

使用本机 Chrome + Playwright 验证：

```json
{
  "pendingShownAfterOne": true,
  "compareChartShownAfterTwo": true,
  "tokenCount": 2,
  "hasNormalizedCopy": true,
  "errors": []
}
```

已确认：

- 点击第 1 个对比按钮后出现选择托盘。
- 托盘展示“已选择 1 个资产”和继续选择提示。
- 点击第 2 个对比按钮后展示归一化对比图。
- 当前对比资产 token 数为 2。
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
  "barCount": 162306,
  "chartWallItems": 111,
  "fundItems": 69,
  "commodityItems": 12,
  "compareAssets": 4
}
```

## 维护性结论

- `compare-panel.tsx` 107 行，`compare-panel.css` 174 行，低于 360 行限制。
- `chart-wall-page.tsx` 只移动 `ComparePanel` 渲染位置，仍在既有 oversized baseline 内。
- `lint:maintainability:guard` 通过，red-zone 文件/目录数量未增加。

## 结论

对比选择体验已补齐。用户从机会榜单、图表卡片或表格加入第 1 个资产后可以立即看到反馈，选择第 2 个资产后自动进入可视化对比，交易所式比较工作流更连续。
