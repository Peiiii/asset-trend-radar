import { ArrowDown, ArrowUp, Eye, GitCompare, Star } from "lucide-react";
import { EmptyState, PriceChange, SignalBadge, TrendBadge, useTableScrollShadows } from "@gold-insights/ui";
import type { ChartWallItem, ChartWallSortOrder } from "@gold-insights/market-domain";
import { formatPrice } from "@/shared/utils/format-number.utils";
import { DataQualityIndicator } from "../data-quality/data-quality-indicator";
import { RankingQualitySummary } from "../ranking-quality-summary/ranking-quality-summary";
import "./exchange-table-active-sort.css";
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

const assetTypeLabels: Record<string, string> = {
  index: "指数",
  fund: "基金/ETF",
  equity: "公司",
  commodity: "商品",
  macro: "宏观/外汇/债券",
  crypto: "加密"
};

const macdLabels: Record<string, string> = {
  "bullish-cross": "金叉",
  "bearish-cross": "死叉",
  "above-zero": "零轴上",
  "below-zero": "零轴下",
  neutral: "中性"
};

const sortLabels: Record<string, string> = {
  symbol: "资产",
  market: "市场",
  asset_type: "品种",
  return_1d: "1D 涨幅",
  return_1m: "1M 涨幅",
  return_3m: "3M 涨幅",
  return_6m: "6M 涨幅",
  return_1y: "1Y 涨幅",
  volume_ratio: "量比",
  drawdown: "回撤",
  trend_score: "趋势",
  event_count: "事件",
  data_point_count: "数据"
};

export function ExchangeTable({ items, sort, order, onSort, onSelect, onPin, onCompare }: ExchangeTableProps): JSX.Element {
  const tableScroll = useTableScrollShadows(items.length);

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
              <ExchangeTableRow key={item.id} rank={index + 1} item={item} sort={sort} onSelect={onSelect} onPin={onPin} onCompare={onCompare} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExchangeTableRow({ rank, item, sort, onSelect, onPin, onCompare }: { rank: number; item: ChartWallItem; sort: string; onSelect(assetId: string): void; onPin(assetId: string): void; onCompare(assetId: string): void }): JSX.Element {
  return (
    <tr onDoubleClick={() => onSelect(item.id)}>
      <td className="exchange-table__rank">{rank}</td>
      <td className={activeSortCellClassName(sort === "symbol", "exchange-table__asset-cell")}>
        <button type="button" className="exchange-table__identity" onClick={() => onSelect(item.id)}>
          <strong>{item.name}</strong>
          <span>{item.symbol}</span>
        </button>
      </td>
      <td className={activeSortCellClassName(sort === "market")}><SignalBadge label={item.market} tone={marketTone(item.market)} /></td>
      <td className={activeSortCellClassName(sort === "asset_type")}><SignalBadge label={assetTypeLabel(item.assetType)} tone="blue" /></td>
      <td className="exchange-table__price">{formatPrice(item.lastPrice, item.currency)}</td>
      <MetricCell active={sort === "return_1d"}><PriceChange value={item.return1d} /></MetricCell>
      <MetricCell active={sort === "return_1m"}><PriceChange value={item.return1m} /></MetricCell>
      <MetricCell active={sort === "return_3m"}><PriceChange value={item.return3m} /></MetricCell>
      <MetricCell active={sort === "return_6m"}><PriceChange value={item.return6m} /></MetricCell>
      <MetricCell active={sort === "return_1y"}><PriceChange value={item.return1y} /></MetricCell>
      <td className={activeSortCellClassName(sort === "volume_ratio")}><SignalBadge label={formatVolumeRatio(item.volumeRatio)} tone={volumeRatioTone(item.volumeRatio)} /></td>
      <MetricCell active={sort === "drawdown"}><PriceChange value={item.drawdownPct} /></MetricCell>
      <td className={activeSortCellClassName(sort === "trend_score")}><TrendBadge label={`${item.trendScore}`} score={item.trendScore} /></td>
      <td><SignalBadge label={macdLabel(item.macdState)} tone={macdTone(item.macdState)} /></td>
      <td className={activeSortCellClassName(sort === "event_count")}><SignalBadge label={`${item.events.length}`} tone={item.events.length > 0 ? "amber" : "neutral"} /></td>
      <td className={activeSortCellClassName(sort === "data_point_count")}>
        <DataQualityIndicator item={item} compact />
      </td>
      <td className="exchange-table__actions-cell">
        <div className="row-actions exchange-table__actions">
          <button type="button" onClick={() => onSelect(item.id)}>
            <Eye size={13} aria-hidden="true" />
            详情
          </button>
          <button type="button" onClick={() => onPin(item.id)}>
            <Star size={13} aria-hidden="true" />
            {item.isPinned ? "取消" : "自选"}
          </button>
          <button type="button" onClick={() => onCompare(item.id)}>
            <GitCompare size={13} aria-hidden="true" />
            {item.isCompared ? "取消" : "对比"}
          </button>
        </div>
      </td>
    </tr>
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

function MetricCell({ children, active = false }: { children: JSX.Element; active?: boolean }): JSX.Element {
  return <td className={activeSortCellClassName(active, "exchange-table__metric")}>{children}</td>;
}

function activeSortCellClassName(active: boolean, baseClassName?: string): string | undefined {
  return [baseClassName, active ? "exchange-table__cell--active-sort" : ""].filter(Boolean).join(" ") || undefined;
}

function assetTypeLabel(assetType: string): string {
  return assetTypeLabels[assetType] ?? assetType;
}

function macdLabel(state: string): string {
  return macdLabels[state] ?? state;
}

function macdTone(state: string): "positive" | "negative" | "neutral" | "amber" | "blue" {
  if (state === "bullish-cross" || state === "above-zero") {
    return "positive";
  }
  if (state === "bearish-cross" || state === "below-zero") {
    return "negative";
  }
  return "neutral";
}

function marketTone(market: string): "positive" | "negative" | "neutral" | "amber" | "blue" {
  if (market === "加密" || market === "商品") {
    return "amber";
  }
  if (market === "美股" || market === "港股") {
    return "blue";
  }
  if (market === "基金" || market === "A 股") {
    return "positive";
  }
  return "neutral";
}

function volumeRatioTone(value: number | null): "positive" | "negative" | "neutral" | "amber" | "blue" {
  if (value === null) {
    return "neutral";
  }
  if (value >= 1.5) {
    return "amber";
  }
  if (value >= 1) {
    return "positive";
  }
  return "neutral";
}

function formatVolumeRatio(value: number | null): string {
  return typeof value === "number" ? `${value.toFixed(2)}x` : "暂无";
}

function toggleSortOrder(value: ChartWallSortOrder): ChartWallSortOrder {
  return value === "desc" ? "asc" : "desc";
}

function defaultOrderForSort(sort: string): ChartWallSortOrder {
  return sort === "symbol" || sort === "market" || sort === "asset_type" ? "asc" : "desc";
}
