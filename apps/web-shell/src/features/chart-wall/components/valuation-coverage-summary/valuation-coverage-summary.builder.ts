import type { ChartWallItem } from "@gold-insights/market-domain";
import { getValuationDisplay, type ValuationDisplayStatus } from "../../utils/valuation-format.utils";
import type { HealthTone } from "../data-health-section/data-health-section.utils";

export type ValuationCoverageStatusCard = {
  status: ValuationDisplayStatus;
  label: string;
  count: number;
  description: string;
  tone: HealthTone;
};

export type ValuationCoverageMarketRow = {
  market: string;
  totalCount: number;
  sortableCount: number;
  missingCount: number;
  notApplicableCount: number;
};

export type ValuationCoverageSourceRow = {
  label: string;
  count: number;
  description: string;
  tone: HealthTone;
  examples: string[];
};

export type ValuationCoverageSummary = {
  totalCount: number;
  sortableCount: number;
  coverageRatio: number;
  statusCards: ValuationCoverageStatusCard[];
  marketRows: ValuationCoverageMarketRow[];
  sourceRows: ValuationCoverageSourceRow[];
};

const statusDefinitions: Record<ValuationDisplayStatus, Omit<ValuationCoverageStatusCard, "count">> = {
  available: {
    status: "available",
    label: "可比市值",
    description: "可用于市值排序",
    tone: "positive"
  },
  turnover_only: {
    status: "turnover_only",
    label: "仅成交额",
    description: "有交易额但不是市值",
    tone: "amber"
  },
  source_missing_value: {
    status: "source_missing_value",
    label: "源未返回",
    description: "来源存在但无规模字段",
    tone: "amber"
  },
  source_unavailable: {
    status: "source_unavailable",
    label: "未接入源",
    description: "当前资产没有规模源",
    tone: "negative"
  },
  not_applicable: {
    status: "not_applicable",
    label: "不适用",
    description: "指数/商品/宏观无市值语义",
    tone: "neutral"
  }
};

const statusOrder: ValuationDisplayStatus[] = ["available", "turnover_only", "source_missing_value", "source_unavailable", "not_applicable"];

export class ValuationCoverageSummaryBuilder {
  public build = (items: ChartWallItem[]): ValuationCoverageSummary => {
    const statusCounts = this.createStatusCounts();
    const marketBuckets = new Map<string, ValuationCoverageMarketRow>();
    const sourceBuckets = new Map<string, ValuationCoverageSourceRow>();

    for (const item of items) {
      const display = getValuationDisplay(item.valuation, item.currency, { assetType: item.assetType });
      statusCounts.set(display.status, (statusCounts.get(display.status) ?? 0) + 1);
      this.addMarketRow(marketBuckets, item.market, display.status);
      this.addSourceRow(sourceBuckets, item, display.status);
    }

    const sortableCount = statusCounts.get("available") ?? 0;
    const totalCount = items.length;

    return {
      totalCount,
      sortableCount,
      coverageRatio: totalCount > 0 ? sortableCount / totalCount : 0,
      statusCards: this.buildStatusCards(statusCounts),
      marketRows: [...marketBuckets.values()]
        .sort((left, right) => right.totalCount - left.totalCount || left.market.localeCompare(right.market, "zh-Hans-CN"))
        .slice(0, 8),
      sourceRows: [...sourceBuckets.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-Hans-CN")).slice(0, 5)
    };
  };

  private createStatusCounts = (): Map<ValuationDisplayStatus, number> => new Map(statusOrder.map((status) => [status, 0]));

  private buildStatusCards = (statusCounts: Map<ValuationDisplayStatus, number>): ValuationCoverageStatusCard[] =>
    statusOrder.map((status) => ({
      ...statusDefinitions[status],
      count: statusCounts.get(status) ?? 0
    }));

  private addMarketRow = (marketBuckets: Map<string, ValuationCoverageMarketRow>, market: string, status: ValuationDisplayStatus): void => {
    const row = marketBuckets.get(market) ?? {
      market,
      totalCount: 0,
      sortableCount: 0,
      missingCount: 0,
      notApplicableCount: 0
    };

    row.totalCount += 1;

    if (status === "available") {
      row.sortableCount += 1;
    }

    if (status === "source_missing_value" || status === "source_unavailable") {
      row.missingCount += 1;
    }

    if (status === "not_applicable") {
      row.notApplicableCount += 1;
    }

    marketBuckets.set(market, row);
  };

  private addSourceRow = (sourceBuckets: Map<string, ValuationCoverageSourceRow>, item: ChartWallItem, status: ValuationDisplayStatus): void => {
    if (status === "available" || status === "turnover_only") {
      return;
    }

    const sourceLabel = this.sourceBucketLabel(item, status);
    const row = sourceBuckets.get(sourceLabel) ?? {
      label: sourceLabel,
      count: 0,
      description: this.sourceBucketDescription(status),
      tone: statusDefinitions[status].tone,
      examples: []
    };

    row.count += 1;

    if (row.examples.length < 3) {
      row.examples.push(item.name || item.symbol);
    }

    sourceBuckets.set(sourceLabel, row);
  };

  private sourceBucketLabel = (item: ChartWallItem, status: ValuationDisplayStatus): string => {
    if (status === "not_applicable") {
      return "资产类型不适用";
    }

    return item.valuation.source ?? "未接入规模源";
  };

  private sourceBucketDescription = (status: ValuationDisplayStatus): string => {
    if (status === "source_missing_value") {
      return "供应商返回快照，但没有给出市值/规模字段";
    }

    if (status === "source_unavailable") {
      return "当前资产类别还没有可用的规模供应商";
    }

    return "这类资产没有稳定的市值语义";
  };
}
