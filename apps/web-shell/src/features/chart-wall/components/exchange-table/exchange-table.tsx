import { ArrowDown, ArrowUp, GitCompare, Star } from "lucide-react";
import { EmptyState, PriceChange, SignalBadge, TrendBadge, useTableScrollShadows } from "@gold-insights/ui";
import type { ChartWallItem, ChartWallSortOrder } from "@gold-insights/market-domain";
import { formatDateTime, formatPrice } from "@/shared/utils/format-number.utils";
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

  return (
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
            <th>数据</th>
            <th className="exchange-table__actions-heading">操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <ExchangeTableRow key={item.id} rank={index + 1} item={item} onSelect={onSelect} onPin={onPin} onCompare={onCompare} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExchangeTableRow({ rank, item, onSelect, onPin, onCompare }: { rank: number; item: ChartWallItem; onSelect(assetId: string): void; onPin(assetId: string): void; onCompare(assetId: string): void }): JSX.Element {
  return (
    <tr onDoubleClick={() => onSelect(item.id)}>
      <td className="exchange-table__rank">{rank}</td>
      <td className="exchange-table__asset-cell">
        <button type="button" className="exchange-table__identity" onClick={() => onSelect(item.id)}>
          <strong>{item.name}</strong>
          <span>{item.symbol}</span>
        </button>
      </td>
      <td><SignalBadge label={item.market} tone={marketTone(item.market)} /></td>
      <td><SignalBadge label={assetTypeLabel(item.assetType)} tone="blue" /></td>
      <td className="exchange-table__price">{formatPrice(item.lastPrice, item.currency)}</td>
      <MetricCell><PriceChange value={item.return1d} /></MetricCell>
      <MetricCell><PriceChange value={item.return1m} /></MetricCell>
      <MetricCell><PriceChange value={item.return3m} /></MetricCell>
      <MetricCell><PriceChange value={item.return6m} /></MetricCell>
      <MetricCell><PriceChange value={item.return1y} /></MetricCell>
      <td><SignalBadge label={formatVolumeRatio(item.volumeRatio)} tone={volumeRatioTone(item.volumeRatio)} /></td>
      <MetricCell><PriceChange value={item.drawdownPct} /></MetricCell>
      <td><TrendBadge label={`${item.trendScore}`} score={item.trendScore} /></td>
      <td><SignalBadge label={macdLabel(item.macdState)} tone={macdTone(item.macdState)} /></td>
      <td><SignalBadge label={`${item.events.length}`} tone={item.events.length > 0 ? "amber" : "neutral"} /></td>
      <td>
        <span className="exchange-table__data-density">
          <strong>{item.dataPointCount.toLocaleString("en-US")}</strong>
          <small>{item.source} / {formatDateTime(item.latestBarAt)}</small>
        </span>
      </td>
      <td className="exchange-table__actions-cell">
        <div className="row-actions exchange-table__actions">
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

function MetricCell({ children }: { children: JSX.Element }): JSX.Element {
  return <td className="exchange-table__metric">{children}</td>;
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
