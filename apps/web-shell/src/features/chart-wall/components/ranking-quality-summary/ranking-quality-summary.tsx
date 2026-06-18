import { BarChart3 } from "lucide-react";
import { SignalBadge } from "@gold-insights/ui";
import type { ChartWallItem, ChartWallSortOrder } from "@gold-insights/market-domain";
import { formatLargeMoney, getValuationDisplay, getValuationSortableValue, type ValuationDisplayStatus } from "../../utils/valuation-format.utils";
import "./ranking-quality-summary.css";

type RankingQualitySummaryProps = {
  items: ChartWallItem[];
  sort?: string;
  order?: ChartWallSortOrder;
};

type SortMetricDefinition = {
  label: string;
  unit: "percent" | "number" | "ratio" | "money";
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

type MissingSummary = {
  value: string;
  title: string;
};

const sortMetrics: Record<string, SortMetricDefinition> = {
  return: { label: "区间涨幅", unit: "percent", getValue: (item) => item.returnPct },
  return_1d: { label: "1D 涨幅", unit: "percent", getValue: (item) => item.return1d },
  return_1w: { label: "1W 涨幅", unit: "percent", getValue: (item) => item.return1w },
  return_1m: { label: "1M 涨幅", unit: "percent", getValue: (item) => item.return1m },
  return_3m: { label: "3M 涨幅", unit: "percent", getValue: (item) => item.return3m },
  return_6m: { label: "6M 涨幅", unit: "percent", getValue: (item) => item.return6m },
  return_1y: { label: "1Y 涨幅", unit: "percent", getValue: (item) => item.return1y },
  market_cap: { label: "市值", unit: "money", getValue: (item) => getValuationSortableValue(item.valuation) },
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
  const missingSummary = sort === "market_cap" ? buildValuationMissingSummary(items) : { value: summary.missingCount.toLocaleString("en-US"), title: "当前排序字段缺少可排名数值的资产数量" };
  const hasValidSamples = summary.validCount > 0;
  const badgeLabel = hasValidSamples ? `${summary.label} ${order === "desc" ? "降序" : "升序"}` : `${summary.label} 无样本`;
  const badgeTone = hasValidSamples ? "blue" : "amber";
  const emptyMetricLabel = hasValidSamples ? "暂无" : "无样本";

  return (
    <section className="ranking-quality-summary" aria-label="榜单质量">
      <div className="ranking-quality-summary__heading">
        <BarChart3 size={16} aria-hidden="true" />
        <strong>榜单质量</strong>
        <SignalBadge label={badgeLabel} tone={badgeTone} />
      </div>
      <dl className="ranking-quality-summary__metrics">
        <RankSummaryMetric label="有效样本" value={`${summary.validCount.toLocaleString("en-US")} / ${items.length.toLocaleString("en-US")}`} tone={coverageTone} />
        <RankSummaryMetric label={sort === "market_cap" ? "市值空态" : "缺值"} value={missingSummary.value} title={missingSummary.title} tone={summary.missingCount > 0 ? "amber" : "positive"} />
        <RankSummaryMetric label="中位数" value={formatMetricValue(summary.median, summary.unit, emptyMetricLabel)} tone="neutral" />
        <RankSummaryMetric label="首尾差" value={formatMetricValue(spread, summary.unit, emptyMetricLabel)} tone={spread !== null && spread > 0 ? "blue" : "neutral"} />
      </dl>
    </section>
  );
}

function RankSummaryMetric({ label, value, title, tone }: { label: string; value: string; title?: string; tone: "positive" | "negative" | "neutral" | "amber" | "blue" }): JSX.Element {
  return (
    <div className={`ranking-quality-summary__metric ranking-quality-summary__metric--${tone}`} title={title}>
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

const valuationMissingLabels: Record<Exclude<ValuationDisplayStatus, "available">, string> = {
  turnover_only: "仅成交额",
  source_missing_value: "源未返回",
  source_unavailable: "未接入源",
  not_applicable: "不适用"
};

const valuationMissingOrder: Exclude<ValuationDisplayStatus, "available">[] = ["not_applicable", "source_unavailable", "source_missing_value", "turnover_only"];

function buildValuationMissingSummary(items: ChartWallItem[]): MissingSummary {
  const counts = new Map<Exclude<ValuationDisplayStatus, "available">, number>(valuationMissingOrder.map((status) => [status, 0]));

  for (const item of items) {
    const status = getValuationDisplay(item.valuation, item.currency, { assetType: item.assetType }).status;

    if (status !== "available") {
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
  }

  const parts = valuationMissingOrder
    .map((status) => ({ status, count: counts.get(status) ?? 0 }))
    .filter((part) => part.count > 0);

  if (parts.length === 0) {
    return {
      value: "0",
      title: "当前列表全部资产都有可用于市值排序的真实规模快照"
    };
  }

  return {
    value: parts.map((part) => `${valuationMissingLabels[part.status]} ${part.count.toLocaleString("en-US")}`).join(" / "),
    title: `${parts.map((part) => `${valuationMissingLabels[part.status]} ${part.count.toLocaleString("en-US")}`).join("；")}。这些状态不是后台加载中。`
  };
}

function formatMetricValue(value: number | null, unit: SortMetricDefinition["unit"], emptyLabel = "暂无"): string {
  if (value === null) {
    return emptyLabel;
  }

  if (unit === "percent") {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  }

  if (unit === "ratio") {
    return `${value.toFixed(2)}x`;
  }

  if (unit === "money") {
    return formatLargeMoney(value, "USD");
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
