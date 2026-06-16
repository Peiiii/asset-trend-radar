# Gold Insights 资产宇宙工作台验证报告

## 本轮目标

本轮增强“资产宇宙”页面。原页面只展示树形卡片，节点内最多露出 14 个资产，用户很难通过搜索/筛选快速定位细分资产。现在资产宇宙页会响应顶部搜索、市场、品种、层级筛选，并提供完整匹配资产列表。

## 实现范围

- 新增 `universe-section` 组件目录。
- 从 `chart-wall-page.tsx` 移除内联 `UniverseSection` / `UniverseNodeCard`。
- 新增资产宇宙摘要：资产数、节点数、市场数、品种数。
- 顶部搜索与筛选联动资产宇宙页面：
  - `q` 搜索名称、代码、市场、交易所、标签。
  - `market` 筛选市场。
  - `assetType` 筛选品种。
  - `level` 筛选资产层级。
- 新增“匹配资产”结果区，解决旧树节点只显示前 14 个资产的问题。
- 树形节点会跟随当前匹配资产裁剪，只显示相关分支。
- 资产按钮增加市场、品种、层级 badge，并保留点击进入资产详情。
- 旧 universe 样式从 `index.css` 迁移到组件 CSS。

## 边界确认

- `apps/web-shell`：搜索/筛选联动、树形裁剪、结果列表、点击交互。
- `packages/local-runtime`：继续负责 `/api/universe/tree` 的资产宇宙事实。
- `packages/market-domain`：沿用 `UniverseTreeResponse` / `UniverseTreeNode` / `AssetSummary`。
- `packages/ui`：复用 `SignalBadge`、`EmptyState`。

## 功能验证

筛选 URL 可达：

```txt
curl http://127.0.0.1:5193/universe?q=NVIDIA&market=美股&assetType=equity&level=company -> 200
```

资产宇宙接口样例：

```json
{
  "roots": 7,
  "nodes": 20,
  "uniqueAssets": 114,
  "markets": ["债券", "加密", "商品", "A 股", "基金", "港股", "美股", "外汇", "宏观"],
  "assetTypes": ["fund", "crypto", "commodity", "macro", "index", "equity"],
  "matched": [
    {
      "id": "us-nvda",
      "symbol": "NVDA",
      "name": "NVIDIA",
      "assetType": "equity",
      "market": "美股",
      "level": "company"
    }
  ]
}
```

## 验证命令

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm lint:maintainability:guard`
- `pnpm smoke`

完整 smoke：

```json
{
  "status": "passed",
  "assetCount": 132,
  "barCount": 162308,
  "chartWallItems": 111,
  "fundItems": 69,
  "commodityItems": 12,
  "compareAssets": 4,
  "taskCenter": {
    "tasks": 4,
    "runningCount": 0,
    "failedCount": 0
  }
}
```

## 维护性结果

- `chart-wall-page.tsx` 从 982 行降到 950 行。
- `index.css` 从 1347 行降到 1262 行。
- 新增 `universe-section.tsx` 150 行、`universe-section.utils.ts` 94 行，均低于单文件上限。
- `lint:maintainability:guard` 通过，没有新增 package deep import 或红区增长。

## 已知限制

资产宇宙仍使用 `/api/universe/tree` 的现有树结构。本轮不改变后端层级生成规则，也不新增服务端分页；前端结果区目前展示前 80 个匹配资产，适合当前本地资产池规模。
