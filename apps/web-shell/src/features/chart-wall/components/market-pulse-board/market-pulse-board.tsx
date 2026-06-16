import { ArrowRight, Layers } from "lucide-react";
import { EmptyState, PriceChange, SignalBadge } from "@gold-insights/ui";
import type { ChartWallItem } from "@gold-insights/market-domain";
import "./market-pulse-board.css";

type MarketPulseBoardProps = {
  items: ChartWallItem[];
  activeMarket: string;
  onMarketSelect(market: string): void;
};

type MarketPulse = {
  market: string;
  count: number;
  positiveRatio: number;
  averageReturn1m: number | null;
  averageTrendScore: number | null;
  eventCount: number;
  leader: ChartWallItem | null;
};

export function MarketPulseBoard({ items, activeMarket, onMarketSelect }: MarketPulseBoardProps): JSX.Element {
  const pulses = createMarketPulses(items);

  if (pulses.length === 0) {
    return <EmptyState title="暂无市场强弱" description="当前筛选没有可聚合的市场数据。" />;
  }

  return (
    <section className="market-pulse-board" aria-label="市场强弱">
      <div className="market-pulse-board__header">
        <div>
          <h2>市场强弱</h2>
          <p>按市场聚合当前结果，先判断机会集中在哪个市场，再深入具体资产。</p>
        </div>
        <SignalBadge label={`${pulses.length} 个市场`} tone="blue" />
      </div>

      <div className="market-pulse-board__grid">
        {pulses.map((pulse) => (
          <MarketPulseCard key={pulse.market} pulse={pulse} isActive={activeMarket === pulse.market} onSelect={onMarketSelect} />
        ))}
      </div>
    </section>
  );
}

function MarketPulseCard({ pulse, isActive, onSelect }: { pulse: MarketPulse; isActive: boolean; onSelect(market: string): void }): JSX.Element {
  return (
    <button type="button" className={`market-pulse-card ${isActive ? "market-pulse-card--active" : ""}`} onClick={() => onSelect(pulse.market)}>
      <header>
        <div>
          <strong>{pulse.market}</strong>
          <span>{pulse.count.toLocaleString("en-US")} 个资产</span>
        </div>
        <ArrowRight size={15} aria-hidden="true" />
      </header>

      <div className="market-pulse-card__primary">
        <span>平均 1M</span>
        <PriceChange value={pulse.averageReturn1m} />
      </div>

      <div className="market-pulse-card__metrics">
        <Metric label="上涨占比" value={`${Math.round(pulse.positiveRatio * 100)}%`} tone={pulse.positiveRatio >= 0.55 ? "positive" : pulse.positiveRatio <= 0.35 ? "negative" : "neutral"} />
        <Metric label="趋势分" value={formatNumber(pulse.averageTrendScore)} tone={(pulse.averageTrendScore ?? 0) >= 60 ? "positive" : "neutral"} />
        <Metric label="事件" value={pulse.eventCount.toLocaleString("en-US")} tone={pulse.eventCount > 0 ? "amber" : "neutral"} />
      </div>

      <div className="market-pulse-card__leader">
        <Layers size={13} aria-hidden="true" />
        <span>{pulse.leader ? `${pulse.leader.name} ${formatSignedPercent(pulse.leader.return1m)}` : "暂无领头资产"}</span>
      </div>
    </button>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "positive" | "negative" | "neutral" | "amber" }): JSX.Element {
  return (
    <span className={`market-pulse-metric market-pulse-metric--${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function createMarketPulses(items: ChartWallItem[]): MarketPulse[] {
  const groups = new Map<string, ChartWallItem[]>();

  for (const item of items) {
    groups.set(item.market, [...(groups.get(item.market) ?? []), item]);
  }

  return Array.from(groups.entries())
    .map(([market, groupItems]) => {
      const positiveCount = groupItems.filter((item) => (item.return1m ?? item.returnPct ?? 0) > 0).length;
      return {
        market,
        count: groupItems.length,
        positiveRatio: groupItems.length > 0 ? positiveCount / groupItems.length : 0,
        averageReturn1m: average(groupItems.map((item) => item.return1m)),
        averageTrendScore: average(groupItems.map((item) => item.trendScore)),
        eventCount: groupItems.reduce((sum, item) => sum + item.events.length, 0),
        leader: [...groupItems].sort((left, right) => (right.return1m ?? Number.NEGATIVE_INFINITY) - (left.return1m ?? Number.NEGATIVE_INFINITY))[0] ?? null
      };
    })
    .sort((left, right) => (right.averageReturn1m ?? Number.NEGATIVE_INFINITY) - (left.averageReturn1m ?? Number.NEGATIVE_INFINITY));
}

function average(values: Array<number | null | undefined>): number | null {
  const finiteValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return finiteValues.length > 0 ? finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length : null;
}

function formatNumber(value: number | null): string {
  return value === null ? "暂无" : value.toFixed(0);
}

function formatSignedPercent(value: number | null): string {
  if (value === null) {
    return "";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
