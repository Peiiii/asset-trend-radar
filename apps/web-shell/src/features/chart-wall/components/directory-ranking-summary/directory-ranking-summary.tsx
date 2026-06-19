import { BarChart3 } from "lucide-react";
import type { AssetDirectoryItem, AssetDirectorySortKey, AssetDirectorySortOrder } from "@gold-insights/market-domain";
import { SignalBadge } from "@gold-insights/ui";
import { DirectoryRankingSummaryBuilder, type DirectoryRankingSummaryMetric, type DirectoryRankingSummaryModel } from "./directory-ranking-summary.builder";
import "./directory-ranking-summary.css";

type DirectoryRankingSummaryProps = {
  items: AssetDirectoryItem[];
  totalCount: number;
  sort: AssetDirectorySortKey;
  order: AssetDirectorySortOrder;
};

const summaryBuilder = new DirectoryRankingSummaryBuilder();

export function DirectoryRankingSummary({ items, totalCount, sort, order }: DirectoryRankingSummaryProps): JSX.Element {
  const summary = summaryBuilder.build(items, totalCount, sort, order);

  return <DirectoryRankingSummaryCard summary={summary} ariaLabel="目录排序质量" />;
}

export function DirectoryRankingSummaryCard({ summary, ariaLabel }: { summary: DirectoryRankingSummaryModel; ariaLabel: string }): JSX.Element {
  return (
    <section className="directory-ranking-summary" aria-label={ariaLabel}>
      <div className="directory-ranking-summary__heading">
        <BarChart3 size={16} aria-hidden="true" />
        <div>
          <strong>{summary.label}</strong>
          <p>{summary.description}</p>
        </div>
        <SignalBadge label={summary.badgeLabel} tone={summary.badgeTone} />
      </div>
      <dl className="directory-ranking-summary__metrics">
        {summary.metrics.map((metric) => (
          <DirectoryRankingMetric key={metric.label} metric={metric} />
        ))}
      </dl>
    </section>
  );
}

function DirectoryRankingMetric({ metric }: { metric: DirectoryRankingSummaryMetric }): JSX.Element {
  return (
    <div className={`directory-ranking-summary__metric directory-ranking-summary__metric--${metric.tone}`}>
      <dt>{metric.label}</dt>
      <dd>{metric.value}</dd>
    </div>
  );
}
