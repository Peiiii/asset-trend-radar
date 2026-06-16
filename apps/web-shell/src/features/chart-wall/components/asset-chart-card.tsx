import { GitCompare, Pin } from "lucide-react";
import { ChartCardShell, IconButton, PriceChange, SignalBadge, TechnicalChart, TrendBadge } from "@gold-insights/ui";
import type { ChartWallItem, MacdState } from "@gold-insights/market-domain";
import { formatPrice } from "@/shared/utils/format-number.utils";

type AssetChartCardProps = {
  item: ChartWallItem;
  onSelect?(assetId: string): void;
  onPin?(assetId: string): void;
  onCompare?(assetId: string): void;
};

const macdLabels: Record<MacdState, string> = {
  "bullish-cross": "MACD 金叉",
  "bearish-cross": "MACD 死叉",
  "above-zero": "零轴上",
  "below-zero": "零轴下",
  neutral: "MACD 中性"
};

const getMacdTone = (state: MacdState): "positive" | "negative" | "neutral" | "amber" | "blue" => {
  if (state === "bullish-cross" || state === "above-zero") {
    return "positive";
  }

  if (state === "bearish-cross" || state === "below-zero") {
    return "negative";
  }

  return "neutral";
};

const getBreakoutLabel = (state: string): string => {
  if (state === "breakout-60d") {
    return "60D 突破";
  }

  if (state === "breakout-20d") {
    return "20D 突破";
  }

  if (state === "insufficient-data") {
    return "数据积累中";
  }

  return "区间内";
};

export function AssetChartCard({ item, onSelect, onPin, onCompare }: AssetChartCardProps): JSX.Element {
  const topEvent = item.events[0];

  return (
    <ChartCardShell className={`${item.isPinned ? "asset-chart-card--pinned" : ""} ${item.isCompared ? "asset-chart-card--compared" : ""}`}>
      <header className="asset-chart-card__header">
        <button type="button" className="asset-chart-card__identity" onClick={() => onSelect?.(item.id)} onDoubleClick={() => onSelect?.(item.id)}>
          <h3>{item.name}</h3>
          <p>{item.symbol}</p>
        </button>
        <TrendBadge label={item.trendLabel} score={item.trendScore} />
      </header>

      <div className="asset-chart-card__price-row">
        <strong>{formatPrice(item.lastPrice, item.currency)}</strong>
        <PriceChange value={item.returnPct} />
      </div>

      <div className="asset-chart-card__meta-row">
        <span>{item.market}</span>
        <span>{assetTypeLabel(item.assetType)}</span>
        <span>{item.source ?? item.dataSource ?? "unknown"}</span>
      </div>

      <TechnicalChart points={item.sparkline} indicators={item.indicators} />

      <div className="asset-chart-card__return-grid">
        <ReturnCell label="1D" value={item.return1d} />
        <ReturnCell label="1M" value={item.return1m} />
        <ReturnCell label="6M" value={item.return6m} />
      </div>

      <div className="asset-chart-card__signal-row">
        <SignalBadge label={macdLabels[item.macdState]} tone={getMacdTone(item.macdState)} />
        <SignalBadge label={getBreakoutLabel(item.breakoutState)} tone={item.breakoutState.startsWith("breakout") ? "blue" : "neutral"} />
        {typeof item.volumeRatio === "number" && <SignalBadge label={`量比 ${item.volumeRatio.toFixed(2)}x`} tone={item.volumeRatio >= 1.5 ? "amber" : "neutral"} />}
      </div>

      <div className="asset-chart-card__risk-row">
        <span>回撤 {formatPercent(item.drawdownPct)}</span>
        <span>点数 {item.dataPointCount ?? item.sparkline.length}</span>
        <span>事件 {item.events.length}</span>
      </div>

      <footer className="asset-chart-card__footer">
        <span>趋势分 {item.trendScore}</span>
        <span>{topEvent ? topEvent.title : "暂无事件"}</span>
      </footer>

      <div className="asset-chart-card__actions">
        <IconButton className={item.isPinned ? "gi-icon-button--active" : ""} label={item.isPinned ? "取消自选" : "加入自选"} onClick={() => onPin?.(item.id)}>
          <Pin size={15} aria-hidden="true" />
        </IconButton>
        <IconButton className={item.isCompared ? "gi-icon-button--active" : ""} label={item.isCompared ? "取消对比" : "加入对比"} onClick={() => onCompare?.(item.id)}>
          <GitCompare size={15} aria-hidden="true" />
        </IconButton>
      </div>
    </ChartCardShell>
  );
}

function ReturnCell({ label, value }: { label: string; value: number | null | undefined }): JSX.Element {
  const tone = value === null || value === undefined ? "neutral" : value >= 0 ? "positive" : "negative";
  return (
    <span className={`asset-chart-card__return-cell asset-chart-card__return-cell--${tone}`}>
      <small>{label}</small>
      <strong>{formatPercent(value)}</strong>
    </span>
  );
}

function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? "暂无" : `${value.toFixed(2)}%`;
}

function assetTypeLabel(assetType: string): string {
  const labels: Record<string, string> = {
    index: "指数",
    fund: "基金/ETF",
    equity: "公司",
    commodity: "商品",
    macro: "宏观",
    crypto: "加密"
  };
  return labels[assetType] ?? assetType;
}
