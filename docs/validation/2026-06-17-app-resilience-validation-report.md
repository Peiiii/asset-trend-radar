# App 韧性与路由配置验证报告

## 背景

历史浏览器验证中多次出现 React Router v7 future flag warning；同时应用入口没有全局错误边界，一旦页面组件抛错会直接白屏。本轮补齐 app 级兜底体验，并启用 React Router future flags，降低开发期噪音和页面崩溃时的用户困惑。

## 边界

- `apps/web-shell`：新增 `AppErrorBoundary`，在 app 入口包裹主应用；`BrowserRouter` 启用 future flags。
- `packages/ui`：未改动。错误边界是 app 级运行兜底，不抽到通用 UI 包。
- `packages/local-runtime` / `data-storage`：未改动。

## 功能验证

浏览器打开：

```txt
http://127.0.0.1:5193/chart-wall?range=6m&timeframe=1d
```

页面状态：

```json
{
  "hasApp": true,
  "hasChartWall": true,
  "hasErrorBoundary": false,
  "url": "http://127.0.0.1:5193/chart-wall?range=6m&timeframe=1d"
}
```

说明：

- 正常页面没有误触发错误边界。
- 错误边界 fallback 提供 `重新加载` 与 `回到图表墙` 两个恢复动作。
- 浏览器日志接口仍会返回旧 HMR 历史日志；本轮以当前 DOM 状态、源码配置、typecheck 和 build 作为验证依据。

## 回归验证

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
pnpm build
```

全部通过。

## 维护性结论

- 新增错误边界文件和独立 CSS，没有继续扩大 `index.css` 红区。
- 未触碰现有红区文件。
- `lint:maintainability:guard` 通过，红区数量未增长。
