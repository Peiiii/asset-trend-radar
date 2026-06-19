import { Eye, GitCompare, Star } from "lucide-react";
import { PriceChange, SignalBadge, TrendBadge } from "@gold-insights/ui";
import type { ChartWallItem } from "@gold-insights/market-domain";
import { formatPrice } from "@/shared/utils/format-number.utils";
import { getValuationDisplay } from "../../utils/valuation-format.utils";
import { DataQualityIndicator } from "../data-quality/data-quality-indicator";
import { ValuationStack } from "../valuation-stack/valuation-stack";
import {
  activeSortCellClassName,
  assetTypeLabel,
  formatVolumeRatio,
  macdLabel,
  macdTone,
  marketTone,
  volumeRatioTone
} from "./exchange-table-formatters";

type ExchangeTableRowProps = {
  rank: number;
  item: ChartWallItem;
  sort: string;
  showValuationColumn: boolean;
  onSelect(assetId: string): void;
  onPin(assetId: string): void;
  onCompare(assetId: string): void;
};

export function ExchangeTableRow({ rank, item, sort, showValuationColumn, onSelect, onPin, onCompare }: ExchangeTableRowProps): JSX.Element {
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
      {showValuationColumn && <ValuationCell item={item} active={sort === "market_cap"} />}
      <MetricCell active={sort === "return"}><PriceChange value={item.returnPct} /></MetricCell>
      <MetricCell active={sort === "return_1d"}><PriceChange value={item.return1d} /></MetricCell>
      <MetricCell active={sort === "return_1w"}><PriceChange value={item.return1w} /></MetricCell>
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

function ValuationCell({ item, active }: { item: ChartWallItem; active: boolean }): JSX.Element {
  const display = getValuationDisplay(item.valuation, item.currency, { assetType: item.assetType });

  return (
    <td className={`${activeSortCellClassName(active, "exchange-table__valuation")} exchange-table__valuation--${display.status}`} title={display.title}>
      <ValuationStack display={display} />
    </td>
  );
}

function MetricCell({ children, active = false }: { children: JSX.Element; active?: boolean }): JSX.Element {
  return <td className={activeSortCellClassName(active, "exchange-table__metric")}>{children}</td>;
}
