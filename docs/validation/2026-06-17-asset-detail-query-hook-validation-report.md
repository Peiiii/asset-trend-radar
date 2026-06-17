# 资产详情查询 Hook 验证报告

## 背景

资产详情页是图表墙进入单个资产后的核心路径。此前详情页的数据请求、取消请求、错误态和详情内自选状态更新都放在 `chart-wall-page.tsx`，让页面红区继续膨胀。本轮把资产详情加载逻辑抽到 app 层 hook，页面只消费查询状态并组合详情组件。

## 边界

- `apps/web-shell`：新增 `useAssetDetailQuery`，负责调用本地 API、维护 loading/error/data、同步详情内 pinned 状态。
- `packages/local-runtime`：未改动，资产详情业务口径仍由 `/api/assets/:id/detail` 提供。
- `packages/market-domain`：未改动，继续使用既有 `AssetDetailResponse` contract。
- `packages/ui`：未改动，图表展示能力保持不变。

## 功能验证

### API

```bash
curl -s 'http://127.0.0.1:3193/api/assets/us-nvda/detail?range=6m&timeframe=1d'
```

结果摘要：

```json
{
  "id": "us-nvda",
  "name": "NVIDIA",
  "points": 125,
  "indicators": 125,
  "events": 1
}
```

### 浏览器

地址：

```txt
http://127.0.0.1:5193/assets/us-nvda?range=6m&timeframe=1d&from=/chart-wall%3Fview%3Dgrid%26range%3D6m%26timeframe%3D1d
```

页面验证：

- 标题显示 `NVIDIA`。
- 详情页返回按钮存在。
- 详情控制条显示区间与周期控件。
- 技术图表主体存在。
- 固定周期收益矩阵存在。
- 自选按钮和对比按钮存在。
- 页面没有 `资产详情加载失败` 或接口错误。

浏览器自动化点击返回按钮时出现一次 Playwright 动作超时，但页面随后仍稳定，返回按钮和详情主体仍存在；本报告不把该点击作为通过证据。

## 回归验证

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
pnpm build
```

全部通过。

## 维护性结论

- `chart-wall-page.tsx` 从约 800 行降到 769 行。
- 资产详情请求副作用从页面移动到 `useAssetDetailQuery`，页面职责更接近路由、URL、组合和事件接线。
- 触碰红区 `chart-wall-page.tsx`，仍在 adopted baseline 内。
- `lint:maintainability:guard` 通过，红区数量未增长。
