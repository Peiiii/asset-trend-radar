import { ArrowDown, ArrowUp } from "lucide-react";
import { EmptyState, useTableScrollShadows } from "@gold-insights/ui";
import type { ChartWallItem, ChartWallSortOrder } from "@gold-insights/market-domain";
import { RankingQualitySummary } from "../ranking-quality-summary/ranking-quality-summary";
import { defaultOrderForSort, sortLabels, toggleSortOrder } from "./exchange-table-formatters";
import { ExchangeTableRow } from "./exchange-table-row";
import "./exchange-table-active-sort.css";
import "./exchange-table-toolbar.css";
import "./exchange-table-sticky.css";
import "./exchange-table.css";

type ExchangeTableProps = {
  items: ChartWallItem[];
  sort: string;
  order: ChartWallSortOrder;
  onSort(value: string, order?: ChartWallSortOrder): void;
  onSelect(assetId: string): void;
  onPin(assetId: string): void;
  onCompare(assetId: string): void;
};

export function ExchangeTable({ items, sort, order, onSort, onSelect, onPin, onCompare }: ExchangeTableProps): JSX.Element {
  const tableScroll = useTableScrollShadows(items.length);
  const showValuationColumn = sort === "market_cap" || items.some((item) => item.valuation.source !== null);

  if (items.length === 0) {
    return <EmptyState title="没有匹配资产" description="换一个市场、品种、信号或搜索词试试。" />;
  }

  const tableWrapperClassName = [
    "exchange-table-wrapper",
    tableScroll.canScrollLeft ? "exchange-table-wrapper--left-shadow" : "",
    tableScroll.canScrollRight ? "exchange-table-wrapper--right-shadow" : ""
  ].filter(Boolean).join(" ");

  const handleSort = (value: string): void => {
    onSort(value, value === sort ? toggleSortOrder(order) : defaultOrderForSort(value));
  };

  const summary = buildTableSummary(items, sort, order);

  return (
    <section className="exchange-table-shell" aria-label="交易所式资产表">
      <div className="exchange-table-toolbar">
        <div>
          <strong>{summary.totalLabel}</strong>
          <span>{summary.sortLabel}</span>
        </div>
        <div className="exchange-table-toolbar__stats" aria-label="表格摘要">
          <SummaryPill label="上涨" value={summary.positiveCount} tone="positive" />
          <SummaryPill label="下跌" value={summary.negativeCount} tone="negative" />
          <SummaryPill label="有事件" value={summary.eventfulCount} tone={summary.eventfulCount > 0 ? "amber" : "neutral"} />
          <SummaryPill label="强趋势" value={summary.strongTrendCount} tone={summary.strongTrendCount > 0 ? "blue" : "neutral"} />
        </div>
      </div>
      <RankingQualitySummary items={items} sort={sort} order={order} />
      <div ref={tableScroll.tableWrapperRef} className={tableWrapperClassName} onScroll={tableScroll.updateScrollEdges}>
        <table className="exchange-table">
          <thead>
            <tr>
              <th className="exchange-table__rank">#</th>
              <SortableHeader label="资产" sortValue="symbol" currentSort={sort} order={order} onSort={handleSort} />
              <SortableHeader label="市场" sortValue="market" currentSort={sort} order={order} onSort={handleSort} />
              <SortableHeader label="品种" sortValue="asset_type" currentSort={sort} order={order} onSort={handleSort} />
              <th>最新价</th>
              {showValuationColumn && <SortableHeader label="市值" sortValue="market_cap" currentSort={sort} order={order} onSort={handleSort} />}
              <SortableHeader label="区间" sortValue="return" currentSort={sort} order={order} onSort={handleSort} />
              <SortableHeader label="1D" sortValue="return_1d" currentSort={sort} order={order} onSort={handleSort} />
              <SortableHeader label="1M" sortValue="return_1m" currentSort={sort} order={order} onSort={handleSort} />
              <SortableHeader label="3M" sortValue="return_3m" currentSort={sort} order={order} onSort={handleSort} />
              <SortableHeader label="6M" sortValue="return_6m" currentSort={sort} order={order} onSort={handleSort} />
              <SortableHeader label="1Y" sortValue="return_1y" currentSort={sort} order={order} onSort={handleSort} />
              <SortableHeader label="量比" sortValue="volume_ratio" currentSort={sort} order={order} onSort={handleSort} />
              <SortableHeader label="回撤" sortValue="drawdown" currentSort={sort} order={order} onSort={handleSort} />
              <SortableHeader label="趋势" sortValue="trend_score" currentSort={sort} order={order} onSort={handleSort} />
              <th>MACD</th>
              <SortableHeader label="事件" sortValue="event_count" currentSort={sort} order={order} onSort={handleSort} />
              <SortableHeader label="数据" sortValue="data_point_count" currentSort={sort} order={order} onSort={handleSort} />
              <th className="exchange-table__actions-heading">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <ExchangeTableRow key={item.id} rank={index + 1} item={item} sort={sort} showValuationColumn={showValuationColumn} onSelect={onSelect} onPin={onPin} onCompare={onCompare} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: "positive" | "negative" | "neutral" | "amber" | "blue" }): JSX.Element {
  return (
    <span className={`exchange-table-toolbar__pill exchange-table-toolbar__pill--${tone}`}>
      {label} <strong>{value.toLocaleString("en-US")}</strong>
    </span>
  );
}

function SortableHeader({ label, sortValue, currentSort, order, onSort }: { label: string; sortValue: string; currentSort: string; order: ChartWallSortOrder; onSort(value: string): void }): JSX.Element {
  const isActive = currentSort === sortValue;

  return (
    <th className={sortValue === "symbol" ? "exchange-table__asset-heading" : undefined}>
      <button type="button" className={isActive ? "exchange-table__sort exchange-table__sort--active" : "exchange-table__sort"} onClick={() => onSort(sortValue)}>
        {label}
        {isActive && (order === "desc" ? <ArrowDown size={12} aria-hidden="true" /> : <ArrowUp size={12} aria-hidden="true" />)}
      </button>
    </th>
  );
}

function buildTableSummary(items: ChartWallItem[], sort: string, order: ChartWallSortOrder): { totalLabel: string; sortLabel: string; positiveCount: number; negativeCount: number; eventfulCount: number; strongTrendCount: number } {
  return {
    totalLabel: `${items.length.toLocaleString("en-US")} 个资产`,
    sortLabel: `当前按 ${sortLabels[sort] ?? sort} ${order === "desc" ? "降序" : "升序"} 排列`,
    positiveCount: items.filter((item) => (item.returnPct ?? 0) > 0).length,
    negativeCount: items.filter((item) => (item.returnPct ?? 0) < 0).length,
    eventfulCount: items.filter((item) => item.events.length > 0).length,
    strongTrendCount: items.filter((item) => item.trendScore >= 70).length
  };
}
