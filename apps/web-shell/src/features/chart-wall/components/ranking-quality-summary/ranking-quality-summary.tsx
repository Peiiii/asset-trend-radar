import { BarChart3 } from "lucide-react";
import { SignalBadge } from "@gold-insights/ui";
import type { ChartWallItem, ChartWallSortOrder } from "@gold-insights/market-domain";
import "./ranking-quality-summary.css";

type RankingQualitySummaryProps = {
  items: ChartWallItem[];
  sort?: string;
  order?: ChartWallSortOrder;
};

type SortMetricDefinition = {
  label: string;
  unit: "percent" | "number" | "ratio";
  getValue(item: ChartWallItem): number | null;
};

type RankSummary = {
  label: string;
  unit: SortMetricDefinition["unit"];
  validCount: number;
  missingCount: number;
  median: number | null;
  leader: number | null;
  laggard: number | null;
};

const sortMetrics: Record<string, SortMetricDefinition> = {
  return: { label: "区间涨幅", unit: "percent", getValue: (item) => item.returnPct },
  return_1d: { label: "1D 涨幅", unit: "percent", getValue: (item) => item.return1d },
  return_1w: { label: "1W 涨幅", unit: "percent", getValue: (item) => item.return1w },
  return_1m: { label: "1M 涨幅", unit: "percent", getValue: (item) => item.return1m },
  return_3m: { label: "3M 涨幅", unit: "percent", getValue: (item) => item.return3m },
  return_6m: { label: "6M 涨幅", unit: "percent", getValue: (item) => item.return6m },
  return_1y: { label: "1Y 涨幅", unit: "percent", getValue: (item) => item.return1y },
  volume_ratio: { label: "量比", unit: "ratio", getValue: (item) => item.volumeRatio },
  drawdown: { label: "回撤", unit: "percent", getValue: (item) => item.drawdownPct },
  trend_score: { label: "趋势分", unit: "number", getValue: (item) => item.trendScore },
  event_count: { label: "事件数", unit: "number", getValue: (item) => item.events.length },
  data_point_count: { label: "数据点", unit: "number", getValue: (item) => item.dataPointCount }
};

export function RankingQualitySummary({ items, sort = "trend_score", order = "desc" }: RankingQualitySummaryProps): JSX.Element {
  const metric = sortMetrics[sort];

  if (!metric) {
    return (
      <section className="ranking-quality-summary ranking-quality-summary--muted" aria-label="榜单质量">
        <div className="ranking-quality-summary__heading">
          <BarChart3 size={16} aria-hidden="true" />
          <strong>榜单质量</strong>
        </div>
        <p>当前按非数值字段排序，名次仅代表列表顺序。</p>
      </section>
    );
  }

  const summary = buildRankSummary(items, metric);
  const spread = summary.leader !== null && summary.laggard !== null ? Math.abs(summary.leader - summary.laggard) : null;
  const coverageTone = summary.validCount === items.length ? "positive" : summary.validCount / Math.max(items.length, 1) >= 0.8 ? "blue" : "amber";

  return (
    <section className="ranking-quality-summary" aria-label="榜单质量">
      <div className="ranking-quality-summary__heading">
        <BarChart3 size={16} aria-hidden="true" />
        <strong>榜单质量</strong>
        <SignalBadge label={`${summary.label} ${order === "desc" ? "降序" : "升序"}`} tone="blue" />
      </div>
      <dl className="ranking-quality-summary__metrics">
        <RankSummaryMetric label="有效样本" value={`${summary.validCount.toLocaleString("en-US")} / ${items.length.toLocaleString("en-US")}`} tone={coverageTone} />
        <RankSummaryMetric label="缺值" value={summary.missingCount.toLocaleString("en-US")} tone={summary.missingCount > 0 ? "amber" : "positive"} />
        <RankSummaryMetric label="中位数" value={formatMetricValue(summary.median, summary.unit)} tone="neutral" />
        <RankSummaryMetric label="首尾差" value={formatMetricValue(spread, summary.unit)} tone={spread !== null && spread > 0 ? "blue" : "neutral"} />
      </dl>
    </section>
  );
}

function RankSummaryMetric({ label, value, tone }: { label: string; value: string; tone: "positive" | "negative" | "neutral" | "amber" | "blue" }): JSX.Element {
  return (
    <div className={`ranking-quality-summary__metric ranking-quality-summary__metric--${tone}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function buildRankSummary(items: ChartWallItem[], metric: SortMetricDefinition): RankSummary {
  const values = items
    .map((item) => metric.getValue(item))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .sort((left, right) => left - right);
  const median = values.length > 0 ? values[Math.floor(values.length / 2)] : null;

  return {
    label: metric.label,
    unit: metric.unit,
    validCount: values.length,
    missingCount: items.length - values.length,
    median,
    leader: values.at(-1) ?? null,
    laggard: values[0] ?? null
  };
}

function formatMetricValue(value: number | null, unit: SortMetricDefinition["unit"]): string {
  if (value === null) {
    return "暂无";
  }

  if (unit === "percent") {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  }

  if (unit === "ratio") {
    return `${value.toFixed(2)}x`;
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
