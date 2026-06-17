# 资产详情区间涨幅样式验证报告

## 问题

资产详情页顶部指标区中，`区间涨幅` 使用了 `PriceChange` 胶囊组件，同时详情页 CSS 使用 `.asset-detail-metric span` 选择器，导致内部 span 被误设为 block，正涨幅胶囊横向撑满卡片。

## 修复

- 详情页顶部 `区间涨幅` 改为 `formatPercent + returnTone`，与下方固定周期收益矩阵保持一致。
- `.asset-detail-metric span` 收窄为 `.asset-detail-metric > span`，避免误伤嵌套 span。

## 浏览器验证

验证页面：

```txt
http://127.0.0.1:5193/assets/fund-cn-001480?range=6m&timeframe=1d&from=/overview
```

验证结果：

- 资产：财通成长优选混合A
- `区间涨幅`: `+153.14%`
- `区间涨幅` 指标卡 class: `asset-detail-metric asset-detail-metric--positive`
- `区间涨幅` 指标卡内不再包含 `.gi-price-change`
- 指标值为普通 18px 重点数字，不再横向撑满成胶囊
- 页面无 error state，控制台无错误日志

## 命令验证

- `pnpm typecheck`
- `pnpm lint`
- `pnpm lint:maintainability:guard`

## 维护性说明

- 变更仅限资产详情组件与样式。
- 没有修改 package/app 边界。
- 没有新增业务逻辑或跨 package 深导入。
