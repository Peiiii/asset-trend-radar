import type { AssetDirectoryItem, AssetDirectorySortKey, AssetDirectorySortOrder, FundCatalogPageItem, FundCatalogSortKey, SortOrder } from "@gold-insights/market-domain";
import { formatLargeMoney, getValuationSortableValue } from "../../utils/valuation-format.utils";

export type DirectoryRankingSummaryTone = "positive" | "negative" | "neutral" | "amber" | "blue";

export type DirectoryRankingSummaryMetric = {
  label: string;
  value: string;
  tone: DirectoryRankingSummaryTone;
};

export type DirectoryRankingSummaryModel = {
  label: string;
  description: string;
  badgeLabel: string;
  badgeTone: DirectoryRankingSummaryTone;
  metrics: DirectoryRankingSummaryMetric[];
};

type DirectorySortMetricDefinition<TItem> = {
  label: string;
  unit: "percent" | "number" | "money" | "price";
  getValue(item: TItem): number | null;
};

const directorySortMetrics: Partial<Record<AssetDirectorySortKey, DirectorySortMetricDefinition<AssetDirectoryItem>>> = {
  latest_value: { label: "最新价", unit: "price", getValue: (item) => item.latestValue },
  market_cap: { label: "市值", unit: "money", getValue: (item) => getValuationSortableValue(item.valuation) },
  return_1d: { label: "1D 涨幅", unit: "percent", getValue: (item) => item.returns.return1d },
  return_1m: { label: "1M 涨幅", unit: "percent", getValue: (item) => item.returns.return1m },
  return_3m: { label: "3M 涨幅", unit: "percent", getValue: (item) => item.returns.return3m },
  return_6m: { label: "6M 涨幅", unit: "percent", getValue: (item) => item.returns.return6m },
  return_1y: { label: "1Y 涨幅", unit: "percent", getValue: (item) => item.returns.return1y },
  data_point_count: { label: "数据点", unit: "number", getValue: (item) => item.dataPointCount }
};

const fundDirectorySortMetrics: Partial<Record<FundCatalogSortKey, DirectorySortMetricDefinition<FundCatalogPageItem>>> = {
  latest_nav: { label: "最新净值", unit: "price", getValue: (item) => item.latestNav },
  return_1d: { label: "1D 涨幅", unit: "percent", getValue: (item) => item.return1d },
  return_1w: { label: "1W 涨幅", unit: "percent", getValue: (item) => item.return1w },
  return_1m: { label: "1M 涨幅", unit: "percent", getValue: (item) => item.return1m },
  return_3m: { label: "3M 涨幅", unit: "percent", getValue: (item) => item.return3m },
  return_6m: { label: "6M 涨幅", unit: "percent", getValue: (item) => item.return6m },
  return_1y: { label: "1Y 涨幅", unit: "percent", getValue: (item) => item.return1y },
  data_point_count: { label: "数据点", unit: "number", getValue: (item) => item.dataPointCount }
};

export class DirectoryRankingSummaryBuilder {
  public build = (items: AssetDirectoryItem[], totalCount: number, sort: AssetDirectorySortKey, order: AssetDirectorySortOrder): DirectoryRankingSummaryModel => {
    const metric = directorySortMetrics[sort];

    if (!metric) {
      return this.buildTextSortSummary(items.length, totalCount, sort === "label" ? "名称" : "相关性", order);
    }

    return this.buildNumericSortSummary(items, totalCount, metric, order);
  };

  public buildFund = (items: FundCatalogPageItem[], totalCount: number, sort: FundCatalogSortKey, order: SortOrder): DirectoryRankingSummaryModel => {
    const metric = fundDirectorySortMetrics[sort];

    if (!metric) {
      const labels: Partial<Record<FundCatalogSortKey, string>> = {
        relevance: "相关性",
        code: "代码",
        name: "名称"
      };

      return this.buildTextSortSummary(items.length, totalCount, labels[sort] ?? "文本字段", order);
    }

    return this.buildNumericSortSummary(items, totalCount, metric, order);
  };

  private buildTextSortSummary = (itemCount: number, totalCount: number, label: string, order: AssetDirectorySortOrder): DirectoryRankingSummaryModel => ({
    label: "排序质量",
    description: `当前按${label}排序，列表顺序不代表数值强弱。`,
    badgeLabel: "文本排序",
    badgeTone: "neutral",
    metrics: [
      { label: "本页资产", value: itemCount.toLocaleString("en-US"), tone: "blue" },
      { label: "筛选总数", value: totalCount.toLocaleString("en-US"), tone: "neutral" },
      { label: "方向", value: order === "desc" ? "降序" : "升序", tone: "neutral" },
      { label: "缺值", value: "不适用", tone: "neutral" }
    ]
  });

  private buildNumericSortSummary = <TItem>(items: TItem[], totalCount: number, metric: DirectorySortMetricDefinition<TItem>, order: SortOrder): DirectoryRankingSummaryModel => {
    const values = items
      .map((item) => metric.getValue(item))
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
      .sort((left, right) => left - right);
    const validCount = values.length;
    const missingCount = items.length - validCount;
    const coverage = items.length > 0 ? validCount / items.length : 0;
    const median = values.length > 0 ? values[Math.floor(values.length / 2)] : null;
    const leader = values.at(-1) ?? null;
    const laggard = values[0] ?? null;
    const spread = leader !== null && laggard !== null ? Math.abs(leader - laggard) : null;
    const hasValidSamples = validCount > 0;

    return {
      label: "排序质量",
      description: this.buildNumericSortDescription(validCount, missingCount, metric.label),
      badgeLabel: hasValidSamples ? `${metric.label} ${order === "desc" ? "降序" : "升序"}` : `${metric.label} 无样本`,
      badgeTone: !hasValidSamples || missingCount > 0 ? "amber" : "blue",
      metrics: [
        { label: "有效样本", value: `${validCount.toLocaleString("en-US")} / ${items.length.toLocaleString("en-US")}`, tone: this.coverageTone(coverage) },
        { label: "缺值", value: missingCount.toLocaleString("en-US"), tone: missingCount > 0 ? "amber" : "positive" },
        { label: "筛选总数", value: totalCount.toLocaleString("en-US"), tone: "neutral" },
        { label: "中位数", value: this.formatMetricValue(median, metric.unit, hasValidSamples ? "暂无" : "无样本"), tone: "neutral" },
        { label: "页内极差", value: this.formatMetricValue(spread, metric.unit, hasValidSamples ? "暂无" : "无样本"), tone: spread !== null && spread > 0 ? "blue" : "neutral" }
      ]
    };
  };

  private buildNumericSortDescription = (validCount: number, missingCount: number, metricLabel: string): string => {
    if (validCount === 0) {
      return `本页没有可用于${metricLabel}排序的数值；这些资产会保留在列表中，但当前名次只代表缺值后的稳定顺序。`;
    }

    return missingCount > 0 ? `本页 ${missingCount.toLocaleString("en-US")} 个资产缺少${metricLabel}，缺值已排在有值资产之后。` : `本页资产都有${metricLabel}，当前排序可直接横向比较。`;
  };

  private coverageTone = (coverage: number): DirectoryRankingSummaryTone => {
    if (coverage >= 1) {
      return "positive";
    }

    if (coverage >= 0.8) {
      return "blue";
    }

    return "amber";
  };

  private formatMetricValue = (value: number | null, unit: DirectorySortMetricDefinition<unknown>["unit"], emptyLabel = "暂无"): string => {
    if (value === null) {
      return emptyLabel;
    }

    if (unit === "percent") {
      return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
    }

    if (unit === "money") {
      return formatLargeMoney(value, "USD");
    }

    if (unit === "price") {
      return value.toLocaleString("en-US", { maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2 });
    }

    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  };
}
