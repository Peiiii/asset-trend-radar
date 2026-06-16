import { ArrowDownRight, ArrowUpRight, GitCompare, Minus } from "lucide-react";
import { EmptyState, PriceChange, SignalBadge } from "@gold-insights/ui";
import type { ChartWallItem, ChartWallSortOrder } from "@gold-insights/market-domain";
import "./sort-aware-movers-strip.css";
import "./sort-aware-movers-strip-cards.css";

type SortAwareMoversStripProps = {
  items: ChartWallItem[];
  sort: string;
  order: ChartWallSortOrder;
  onSelect(assetId: string): void;
  onCompare(assetId: string): void;
};

type SortMetric = {
  label: string;
  value: number | null;
  valueLabel: string;
  tone: "positive" | "negative" | "neutral" | "amber" | "blue";
  isPercent: boolean;
};

type MoverEntry = {
  item: ChartWallItem;
  metric: SortMetric;
};

type MoversSnapshot = {
  metricLabel: string;
  leaders: MoverEntry[];
  laggards: MoverEntry[];
  median: SortMetric | null;
  coverageLabel: string;
};

export function SortAwareMoversStrip({ items, sort, order, onSelect, onCompare }: SortAwareMoversStripProps): JSX.Element {
  const snapshot = buildMoversSnapshot(items, sort);

  if (items.length === 0) {
    return <EmptyState title="暂无排序异动" description="当前筛选没有资产，无法生成排序榜。" />;
  }

  if (!snapshot) {
    return (
      <section className="sort-aware-movers" aria-label="排序异动">
        <div className="sort-aware-movers__header">
          <div>
            <h2>排序异动</h2>
            <p>当前排序不是数值指标，切换到涨幅、趋势、量比或回撤后可查看领涨领跌。</p>
          </div>
          <SignalBadge label={`${items.length.toLocaleString("en-US")} 个资产`} tone="neutral" />
        </div>
      </section>
    );
  }

  const primary = order === "asc" ? snapshot.laggards[0] : snapshot.leaders[0];

  return (
    <section className="sort-aware-movers" aria-label="排序异动">
      <div className="sort-aware-movers__header">
        <div>
          <h2>排序异动</h2>
          <p>按当前排序指标提炼领涨、承压和中位数，先看分布再进具体图表。</p>
        </div>
        <span>
          {snapshot.metricLabel}
          <small>{order === "desc" ? "降序" : "升序"}</small>
        </span>
      </div>

      <div className="sort-aware-movers__grid">
        <FeaturedMover entry={primary} title="当前榜首" description="按当前排序方向最靠前" icon={order === "desc" ? "up" : "down"} onSelect={onSelect} onCompare={onCompare} />
        <MoverList title="领涨/高值" entries={snapshot.leaders} icon="up" onSelect={onSelect} />
        <MoverList title="承压/低值" entries={snapshot.laggards} icon="down" onSelect={onSelect} />
        <DistributionCard median={snapshot.median} coverageLabel={snapshot.coverageLabel} totalCount={items.length} />
      </div>
    </section>
  );
}

function FeaturedMover({ entry, title, description, icon, onSelect, onCompare }: { entry: MoverEntry | undefined; title: string; description: string; icon: "up" | "down"; onSelect(assetId: string): void; onCompare(assetId: string): void }): JSX.Element {
  if (!entry) {
    return (
      <article className="sort-aware-featured-mover">
        <span className="sort-aware-featured-mover__eyebrow">{title}</span>
        <p className="sort-aware-featured-mover__empty">暂无可排名数据</p>
      </article>
    );
  }

  return (
    <article className={`sort-aware-featured-mover sort-aware-featured-mover--${entry.metric.tone}`}>
      <span className="sort-aware-featured-mover__eyebrow">{title}</span>
      <button type="button" className="sort-aware-featured-mover__identity" onClick={() => onSelect(entry.item.id)}>
        <span>{icon === "up" ? <ArrowUpRight size={18} aria-hidden="true" /> : <ArrowDownRight size={18} aria-hidden="true" />}</span>
        <strong>{entry.item.name}</strong>
        <small>{entry.item.symbol} / {entry.item.market}</small>
      </button>
      <div className="sort-aware-featured-mover__metric">
        <span>{description}</span>
        <MetricValue metric={entry.metric} />
      </div>
      <button type="button" className="sort-aware-featured-mover__compare" onClick={() => onCompare(entry.item.id)}>
        <GitCompare size={14} aria-hidden="true" />
        加入对比
      </button>
    </article>
  );
}

function MoverList({ title, entries, icon, onSelect }: { title: string; entries: MoverEntry[]; icon: "up" | "down"; onSelect(assetId: string): void }): JSX.Element {
  return (
    <article className="sort-aware-mover-list">
      <header>
        <span>{icon === "up" ? <ArrowUpRight size={15} aria-hidden="true" /> : <ArrowDownRight size={15} aria-hidden="true" />}</span>
        <h3>{title}</h3>
      </header>
      {entries.length === 0 ? (
        <p>暂无可排名数据</p>
      ) : (
        <div className="sort-aware-mover-list__rows">
          {entries.slice(0, 3).map((entry, index) => (
            <button key={entry.item.id} type="button" className="sort-aware-mover-row" onClick={() => onSelect(entry.item.id)}>
              <span>{index + 1}</span>
              <strong>{entry.item.name}</strong>
              <small>{entry.item.symbol}</small>
              <MetricValue metric={entry.metric} />
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function DistributionCard({ median, coverageLabel, totalCount }: { median: SortMetric | null; coverageLabel: string; totalCount: number }): JSX.Element {
  return (
    <article className="sort-aware-distribution-card">
      <header>
        <span><Minus size={15} aria-hidden="true" /></span>
        <h3>样本分布</h3>
      </header>
      <dl>
        <div>
          <dt>中位数</dt>
          <dd>{median ? <MetricValue metric={median} /> : "暂无"}</dd>
        </div>
        <div>
          <dt>覆盖</dt>
          <dd>{coverageLabel}</dd>
        </div>
        <div>
          <dt>资产数</dt>
          <dd>{totalCount.toLocaleString("en-US")}</dd>
        </div>
      </dl>
    </article>
  );
}

function MetricValue({ metric }: { metric: SortMetric }): JSX.Element {
  if (metric.isPercent) {
    return <PriceChange value={metric.value} />;
  }

  return <SignalBadge label={metric.valueLabel} tone={metric.tone} />;
}

function buildMoversSnapshot(items: ChartWallItem[], sort: string): MoversSnapshot | null {
  const entries = items
    .map((item) => ({ item, metric: getSortMetric(item, sort) }))
    .filter((entry): entry is MoverEntry => entry.metric !== null && typeof entry.metric.value === "number" && Number.isFinite(entry.metric.value));

  if (entries.length === 0) {
    return null;
  }

  const sorted = [...entries].sort((left, right) => (right.metric.value ?? 0) - (left.metric.value ?? 0));
  const medianMetric = sorted[Math.floor(sorted.length / 2)]?.metric ?? null;

  return {
    metricLabel: entries[0]?.metric.label ?? "当前指标",
    leaders: sorted.slice(0, 3),
    laggards: [...sorted].reverse().slice(0, 3),
    median: medianMetric,
    coverageLabel: `${entries.length.toLocaleString("en-US")} / ${items.length.toLocaleString("en-US")}`
  };
}

function getSortMetric(item: ChartWallItem, sort: string): SortMetric | null {
  switch (sort) {
    case "return":
      return percentMetric("区间涨幅", item.returnPct);
    case "return_1d":
      return percentMetric("1D 涨幅", item.return1d);
    case "return_1w":
      return percentMetric("1W 涨幅", item.return1w);
    case "return_1m":
      return percentMetric("1M 涨幅", item.return1m);
    case "return_3m":
      return percentMetric("3M 涨幅", item.return3m);
    case "return_6m":
      return percentMetric("6M 涨幅", item.return6m);
    case "return_1y":
      return percentMetric("1Y 涨幅", item.return1y);
    case "volume_ratio":
      return numericMetric("量比", item.volumeRatio, (value) => `${value.toFixed(2)}x`, (value) => (value >= 1.5 ? "amber" : "neutral"));
    case "drawdown":
      return percentMetric("回撤", item.drawdownPct);
    case "trend_score":
      return numericMetric("趋势分", item.trendScore, (value) => value.toFixed(0), (value) => (value >= 60 ? "positive" : value >= 35 ? "blue" : "neutral"));
    case "event_count":
    case "macd":
      return numericMetric("事件数", item.events.length, (value) => value.toFixed(0), (value) => (value > 0 ? "amber" : "neutral"));
    default:
      return null;
  }
}

function percentMetric(label: string, value: number | null): SortMetric {
  return {
    label,
    value,
    valueLabel: value === null ? "暂无" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`,
    tone: value === null ? "neutral" : value >= 0 ? "positive" : "negative",
    isPercent: true
  };
}

function numericMetric(label: string, value: number | null, format: (value: number) => string, tone: (value: number) => SortMetric["tone"]): SortMetric {
  return {
    label,
    value,
    valueLabel: value === null ? "暂无" : format(value),
    tone: value === null ? "neutral" : tone(value),
    isPercent: false
  };
}
