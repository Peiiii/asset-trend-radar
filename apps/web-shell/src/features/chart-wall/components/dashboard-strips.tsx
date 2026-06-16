import type { ChartWallSummary } from "@gold-insights/market-domain";
import type { ChartWallPageData } from "@/shared/types/api.types";
import { formatDateTime } from "@/shared/utils/format-number.utils";

export function SummaryStrip({ data, visibleSearchCount }: { data: ChartWallPageData; visibleSearchCount: number }): JSX.Element {
  const summary = getSummary(data);
  const rawFileCount = data.dataHealth.rawFileCount ?? 0;

  return (
    <section className="summary-strip" aria-label="数据状态">
      <SummaryCard label="可交易资产" value={`${summary.visibleItems}/${summary.totalUniverseAssets}`} />
      <SummaryCard label="搜索可见" value={visibleSearchCount.toString()} />
      <SummaryCard label="K 线记录" value={data.dataHealth.barCount.toLocaleString("en-US")} />
      <SummaryCard label="Raw 文件" value={rawFileCount.toLocaleString("en-US")} />
      <SummaryCard label="最新 K 线" value={formatDateTime(data.dataHealth.latestBarAt)} />
      <SummaryCard label="最近采集" value={formatDateTime(data.dataHealth.lastIngestionAt)} />
    </section>
  );
}

export function BreadthStrip({ data }: { data: ChartWallPageData }): JSX.Element {
  const summary = getSummary(data);

  return (
    <section className="breadth-strip" aria-label="市场宽度">
      <MetricPill label="上涨" value={summary.positiveItems} tone="positive" />
      <MetricPill label="下跌" value={summary.negativeItems} tone="negative" />
      <MetricPill label="强趋势" value={summary.strongTrendItems} tone="positive" />
      <MetricPill label="偏弱" value={summary.weakTrendItems} tone="negative" />
      <MetricPill label="有事件" value={summary.eventfulItems} tone="blue" />
      <MetricPill label="平均收益" value={formatPercent(summary.averageReturnPct)} tone={(summary.averageReturnPct ?? 0) >= 0 ? "positive" : "negative"} />
      <MetricPill label="平均量比" value={summary.averageVolumeRatio === null ? "暂无" : `${summary.averageVolumeRatio.toFixed(2)}x`} tone="neutral" />
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function MetricPill({ label, value, tone }: { label: string; value: number | string; tone: "positive" | "negative" | "blue" | "neutral" }): JSX.Element {
  return (
    <article className={`metric-pill metric-pill--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function getSummary(data: ChartWallPageData): ChartWallSummary {
  const runtimeSummary = data.chartWall.summary as ChartWallSummary | undefined;

  if (runtimeSummary) {
    return runtimeSummary;
  }

  const items = data.chartWall.items;
  const latestTimestamp = Math.max(
    ...items
      .map((item) => (item.latestBarAt ? new Date(item.latestBarAt).getTime() : NaN))
      .filter((timestamp) => Number.isFinite(timestamp))
  );

  return {
    totalUniverseAssets: items.length,
    visibleItems: items.length,
    positiveItems: items.filter((item) => (item.returnPct ?? 0) > 0).length,
    negativeItems: items.filter((item) => (item.returnPct ?? 0) < 0).length,
    strongTrendItems: items.filter((item) => item.trendScore >= 30).length,
    weakTrendItems: items.filter((item) => item.trendScore <= -10).length,
    eventfulItems: items.filter((item) => item.events.length > 0).length,
    pinnedItems: items.filter((item) => item.isPinned).length,
    comparedItems: items.filter((item) => item.isCompared).length,
    averageReturnPct: average(items.map((item) => item.returnPct)),
    averageTrendScore: average(items.map((item) => item.trendScore)),
    averageVolumeRatio: average(items.map((item) => item.volumeRatio)),
    latestBarAt: Number.isFinite(latestTimestamp) ? new Date(latestTimestamp).toISOString() : null
  };
}

function average(values: Array<number | null | undefined>): number | null {
  const finiteValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return finiteValues.length > 0 ? finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length : null;
}

function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? "暂无" : `${value.toFixed(2)}%`;
}
