# 多资产对比洞察条验证报告

## 背景

多资产对比已有归一化走势图和指标表，但用户仍需要自己判断“谁领跑、谁相对落后、谁更抗跌、样本覆盖是否一致”。本轮在对比面板顶部新增洞察条，把关键结论直接提炼出来，提升肉眼发现机会的效率。

## 边界说明

- `apps/web-shell`：新增 `CompareInsightStrip` 展示组件，基于已有 `CompareResponse` 和图表墙资产数据做展示派生。
- `compare-panel.utils.ts`：新增纯展示计算，包括领跑、末位、抗跌、样本覆盖。
- `packages/local-runtime` / `market-domain`：未改动；不新增 API 字段，不伪造数据。
- `packages/ui`：未改动；该洞察条是 compare 面板的业务展示，不抽成通用 UI。

## 浏览器验证

地址：

```txt
http://127.0.0.1:5193/chart-wall?view=grid&range=6m&timeframe=1d&sort=return_1m&order=desc
```

操作：

1. 滚动到图表卡片区。
2. 点击前两张资产卡的“加入对比”按钮。
3. 读取多资产对比面板。

结果摘要：

```json
{
  "chartVisible": true,
  "rowCount": 2,
  "insightCards": [
    {
      "className": "compare-insight-card compare-insight-card--positive",
      "text": "领跑+153.14%财通成长优选混合A001480 / 区间涨幅"
    },
    {
      "className": "compare-insight-card compare-insight-card--blue",
      "text": "末位+99.23%创金合信专精特新股票发起A014736 / 区间涨幅"
    },
    {
      "className": "compare-insight-card compare-insight-card--positive",
      "text": "抗跌-9.10%财通成长优选混合A001480 / 最大回撤"
    },
    {
      "className": "compare-insight-card compare-insight-card--blue",
      "text": "样本119 点覆盖一致2 个资产参与对比"
    }
  ],
  "errorLogs": []
}
```

## 维护性结论

- 新增组件位于 `compare-panel/` role folder，没有向页面根组件继续堆逻辑。
- 洞察计算是无副作用纯函数，只依赖已有 compare metrics。
- 文件体积仍低于 guard 限制：`compare-panel.utils.ts` 192 行，`compare-panel.css` 272 行，`compare-insight-strip.tsx` 22 行。
