# 主题快捷策略验证报告

## 背景

图表墙已经支持 `tag` 主题筛选，但如果主题只藏在下拉里，发现效率仍不够高。顶级行情产品通常会把常见机会视角做成一键入口。本轮把主题筛选接入快捷策略，让用户可以直接进入贵金属、能源链、农产品等视角。

## 改动范围

- `apps/web-shell/src/features/chart-wall/components/strategy-preset-strip/strategy-preset-strip.tsx`
- `apps/web-shell/src/features/chart-wall/components/chart-wall-page.tsx`

新增预设：

- 贵金属：`market=商品&tag=贵金属&sort=return_1m`
- 能源链：`market=商品&tag=能源&sort=volume_ratio`
- 农产品：`market=商品&tag=农产品&sort=return_1m`

同时修复一个交互细节：应用任何快捷策略时会清理旧的 `tag`，只有主题预设主动设置 tag，避免用户先选了贵金属后再点“强趋势”时仍被旧主题限制。

## 浏览器验证

验证路径：

```txt
http://127.0.0.1:5193/chart-wall?view=table&range=6m&timeframe=1d
```

验证结果：

```json
{
  "preciousPresetSetsTag": true,
  "preciousChipVisible": true,
  "strongPresetClearsOldTag": true,
  "errors": []
}
```

说明：

- 点击“贵金属”预设后，URL 包含 `market=商品` 和 `tag=贵金属`。
- 表格显示 `10 个资产`。
- active chip 显示 `主题: 贵金属`。
- 再点击“强趋势”后，旧的 `tag=贵金属` 被清除。
- 浏览器 console/page error 为空。

## 命令验证

```bash
pnpm typecheck
pnpm lint:maintainability:guard
pnpm lint
pnpm build
pnpm smoke
```

结果：

- `pnpm typecheck`：通过。
- `pnpm lint:maintainability:guard`：通过。
- `pnpm lint`：通过。
- `pnpm build`：通过。
- `pnpm smoke`：通过。

smoke 关键摘要：

```json
{
  "assetCount": 154,
  "chartWallItems": 133,
  "fundItems": 80,
  "commodityItems": 34,
  "preciousMetalsItems": 10,
  "agricultureItems": 7
}
```

## 维护性结论

- `lint:maintainability:guard` 通过。
- 触碰了既有红区 `chart-wall-page.tsx`，只增加 1 行，仍低于采用基线。
- `strategy-preset-strip.tsx` 为 123 行，保持在安全范围。
- 变更没有新增后端口径；只是让既有 `tag` 筛选能力更容易被使用。
