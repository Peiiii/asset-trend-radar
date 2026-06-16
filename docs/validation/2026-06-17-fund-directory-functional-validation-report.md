# Gold Insights 基金目录功能验证报告

验证时间：2026-06-17 CST

## 结论

本轮基金目录和图表墙治理改造已通过验证。系统现在把“基金目录”和“走势池”分开：

- 基金目录：东方财富基金目录轻索引，当前本地目录总量 27,010 支；其中开放式基金排行快照可提供无需完整导入的最新净值和阶段收益。
- 走势池：已经拉取完整历史净值并写入本地 K 线库的基金，当前验证环境为 47 支。

因此页面上的 47 不是筛选出的基金总数，也不是可搜索基金上限，而是“本地已具备完整走势数据、可进入图表墙/MACD/详情页分析”的基金数量。用户在基金目录点击“加入走势池”后，这个数量会增加。

## 本轮实现范围

- 新增 `/funds` 基金目录页面，作为一级导航，但资产详情仍是上下文详情页，不再作为独立菜单。
- 新增基金目录分页、搜索、基金类型筛选、导入状态筛选、状态/类型 eager facet count。
- 新增未导入基金的轻量快照收益：最新净值、1D、1M、3M、6M、1Y，用于初筛是否值得加入走势池。
- 基金目录支持按名称、最新净值、阶段收益和数据点排序；排序由后端 SQLite 分页查询完成，不在前端假排序。
- 基金目录名称列固定在左侧，操作列固定在右侧，避免宽表横向滚动后丢失上下文或找不到操作入口。
- 固定列阴影按滚动边界动态显示：在最左侧不显示左阴影，在最右侧不显示右阴影，中间滚动时两侧按需显示。
- 阶段收益、快照来源、数据点展示增加语义颜色和强弱层级：上涨/下跌/暂无不再使用同一种视觉表达。
- 支持从目录把基金加入走势池，导入后可更新净值、查看走势和 MACD。
- 后端新增 `/api/funds/eastmoney/catalog`，返回目录轻数据、导入状态、已导入基金的真实收益指标。
- 保持职责边界：目录查询和指标补全在 `local-runtime`，SQLite catalog 查询在 `data-storage`，类型契约在 `market-domain`，页面状态和展示在 `apps/web-shell`。
- 为维护性拆出图表墙摘要、数据健康、资产卡片样式、图表基础样式、图表墙排序服务；通用表格滚动阴影 hook 放入 `packages/ui` 公共出口复用。

## 数据口径

手工 API 验证：

```json
{
  "catalog": {
    "totalCount": 27010,
    "syncedAt": "2026-06-16T15:32:01.677Z",
    "source": "eastmoney"
  },
  "keyword": "华夏",
  "totalCount": 981,
  "importedTotalCount": 47,
  "first": {
    "code": "000001",
    "name": "华夏成长混合",
    "isImported": true,
    "dataPointCount": 756,
    "latestNav": 1.358,
    "latestNavDate": "2026-06-15",
    "return1d": 0.9665,
    "return1m": 8.5532,
    "return3m": 25.3924,
    "return6m": 30.9547,
    "return1y": 64.0097
  }
}
```

未导入基金优先展示东方财富排行快照里的轻量收益；少数不在排行快照覆盖范围内的目录基金会显示“暂无快照”。系统不会为未导入基金伪造完整走势或 MACD。

## 自动化验证

已通过：

```bash
pnpm typecheck
pnpm lint
pnpm lint:maintainability:guard
pnpm build
pnpm smoke
```

`pnpm smoke` 结果摘要：

```json
{
  "status": "passed",
  "sources": ["yahoo", "eastmoney"],
  "assetCount": 132,
  "barCount": 162417,
  "chartWallItems": 111,
  "fundItems": 69,
  "commodityItems": 12,
  "fundCatalogCount": 27010,
  "sortedFundCatalogTopReturn1m": 30.01,
  "importedFund": {
    "id": "fund-cn-000001",
    "barsImported": 756,
    "chartWallVisible": true
  }
}
```

## 浏览器验证

验证地址：

```text
http://127.0.0.1:5193/funds?fundKeyword=%E5%8D%8E%E5%A4%8F&fundType=all&fundStatus=all&fundPage=1
```

浏览器检查结果：

- 页面标题为“基金目录”。
- 显示目录总量 27,010。
- 显示走势池 47。
- 搜索“华夏”命中 981，当前页 50 行。
- 已导入基金显示本地完整走势指标、净值、1D、1M、3M、6M、1Y、数据点。
- 未导入基金显示目录快照净值和阶段收益；无快照覆盖时显示“暂无快照”。
- 基金名称列和表头均为 `position: sticky; left: 0`，宽表横向滚动时固定在左侧。
- 操作列和表头均为 `position: sticky; right: 0`，宽表横向滚动时固定在右侧。
- 初始位于最左侧时，表格类名为 `fund-directory-table-wrapper fund-directory-table-wrapper--right-shadow`，只显示右侧可滚动提示。
- 横向滚到最右侧后，表格类名变为 `fund-directory-table-wrapper fund-directory-table-wrapper--left-shadow`，右侧阴影消失。
- 按 `1M` 升序时，前 5 行均为负收益基金，页面包含 209 个下跌语义 pill、21 个上涨语义 pill、133 个强波动 pill。
- 按 `1M` 降序时，前 8 行收益依次为 30.01%、30.01%、26.95%、26.88%、25.22%、25.15%、24.22%、23.94%，与后端排序一致。

图表墙抽查：

```text
http://127.0.0.1:5193/chart-wall?view=grid&range=1m&timeframe=1d&assetType=fund&sort=return_1m&order=desc
```

- 卡片数量 72。
- 资产卡片样式保持 8px radius、402px 最小高度。
- 技术图表高度保持 172px。
- 排序指标 `1M 涨幅` 作为主指标展示。
- 区间涨幅仍保留，未被隐藏。

## 维护性验证

`pnpm lint:maintainability:guard` 通过。触碰过的红区没有增长：

- `apps/web-shell/src/features/chart-wall/components/chart-wall-page.tsx`：1292 行，低于 adopted baseline 1327。
- `apps/web-shell/src/features/chart-wall/components/fund-directory-section.tsx`：315 行，接近 360 行新代码阈值但未超限。
- `apps/web-shell/src/features/chart-wall/components/fund-directory-section.css`：340 行，接近 360 行新代码阈值但未超限。
- `packages/data-storage/src/repositories/sqlite-fund-catalog.repository.ts`：346 行，接近 360 行新代码阈值但未超限。
- `apps/web-shell/src/index.css`：1680 行，低于 adopted baseline 1820。
- `packages/local-runtime/src/services/chart-wall-query.service.ts`：640 行，低于 adopted baseline 645。

本轮代码整体不是单纯增量堆叠：新增基金目录能力的同时，把基金目录 URL 状态抽到 app feature hook，把 SQLite 排序 SQL 抽到 data-storage order builder，把通用表格滚动阴影抽到 `packages/ui`，降低了页面组件继续膨胀的风险。
