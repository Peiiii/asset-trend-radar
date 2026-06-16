# Gold Insights 机会扫描工作台验证报告

## 本轮目标

本轮把“机会扫描”从简单事件表格升级为更适合肉眼发现机会的工作台：保留后端真实扫描事件口径，前端只负责 URL 状态、筛选、摘要、视觉语义和点击进入资产详情。

## 实现范围

- 从 `chart-wall-page.tsx` 中抽出 `ScannerSection`，扫描页成为独立 feature 组件。
- 增加扫描摘要：当前命中、覆盖资产、高强度、MACD、突破。
- 增加前端展示筛选：事件类型、市场、强度、关键词搜索。
- 事件类型与市场下拉直接显示真实计数，不做懒加载。
- 增加优先机会卡片，把强度高、触发时间新的事件前置。
- 表格增加市场/事件/强度语义 badge、触发时间和明确“查看”操作。
- 修正强度筛选口径：当前真实 `severity` 是百分制风格，本轮改为 `>=40 / >=60 / >=80`，不再沿用旧的 `>=2 / >=3 / >=4`。
- 扫描页样式从全局 `index.css` 移到 `scanner-section.css`，避免继续扩大主页面样式。

## 边界确认

- `apps/web-shell`：URL query、搜索框、筛选状态、视觉摘要、点击进入资产详情。
- `packages/local-runtime` / `packages/scanner-engine`：扫描事件事实、触发规则、severity 计算。
- `packages/ui`：继续复用 `Select`、`FilterChip`、`SignalBadge`、`Button`、`EmptyState`，本轮没有把业务含义下沉到 UI 包。

## 功能验证

页面可达：

```txt
curl http://127.0.0.1:5193/scanner -> 200
```

扫描事件接口真实数据：

```json
{
  "events": 63,
  "markets": ["美股", "基金", "外汇", "港股", "商品", "A 股", "债券", "宏观"],
  "sample": [
    {
      "asset": "道琼斯工业指数",
      "symbol": "^DJI",
      "market": "美股",
      "type": "price_breakout_60d",
      "severity": 85
    }
  ]
}
```

完整 smoke：

```json
{
  "status": "passed",
  "assetCount": 132,
  "barCount": 162299,
  "chartWallItems": 111,
  "fundItems": 69,
  "fundCatalogCount": 27010,
  "taskCenter": {
    "tasks": 4,
    "runningCount": 0,
    "failedCount": 0
  }
}
```

## 验证命令

- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`
- `pnpm lint:maintainability:guard`
- `pnpm smoke`

## 维护性结果

- `chart-wall-page.tsx` 从 1327 行基线内继续下降到 1171 行，扫描页逻辑不再内联在主页面。
- `index.css` 删除旧扫描表格样式，扫描样式移动到组件目录。
- 维护性 guard 通过，没有新增 package deep import 或红区增长。
- guard 提示 `scanner-section.tsx` 当前 322 行，接近 360 行阈值；下一轮如果继续增强扫描页，应优先拆出 scanner options、summary 或 row 子组件，避免继续增长。

## 已知限制

本轮无法通过 Computer Use 操作 Codex 内置浏览器窗口，原因是工具禁止控制 `com.openai.codex`。Chrome DevTools MCP 也提示 profile 已被占用。因此本轮使用页面 HTTP 可达、真实 API 数据、生产构建和完整 smoke 作为功能验证依据。
