import type { ChartWallItem } from "@gold-insights/market-domain";
import { getValuationDisplay } from "../../utils/valuation-format.utils";

type MetricTone = "positive" | "negative" | "neutral";
type PerformanceMetricKey = "return" | "return_1d" | "return_1w" | "return_1m" | "return_3m" | "return_6m" | "return_1y";

type ReturnMetric = {
  key: PerformanceMetricKey;
  label: string;
  value: number | null | undefined;
};

export type AssetChartCardPrimaryMetric = {
  key: PerformanceMetricKey;
  label: string;
  valueLabel: string;
  tone: MetricTone;
  isSortMetric: boolean;
};

export type AssetChartCardSortMetric = {
  label: string;
  value: string;
  tone: MetricTone;
} | null;

export class AssetChartCardMetricsBuilder {
  public buildPrimaryMetric = (item: ChartWallItem, sort: string | undefined): AssetChartCardPrimaryMetric => {
    const metric = this.getReturnMetric(item, sort);
    const value = metric?.value ?? item.returnPct;

    return {
      key: metric?.key ?? "return",
      label: metric?.label ?? "区间涨幅",
      valueLabel: this.formatPercentWithSign(value),
      tone: this.getPercentTone(value),
      isSortMetric: Boolean(metric)
    };
  };

  public buildSortMetric = (item: ChartWallItem, sort: string | undefined): AssetChartCardSortMetric => {
    switch (sort) {
      case "return":
        return this.percentSortMetric("区间涨幅", item.returnPct);
      case "return_1d":
        return this.percentSortMetric("1D 涨幅", item.return1d);
      case "return_1w":
        return this.percentSortMetric("1W 涨幅", item.return1w);
      case "return_1m":
        return this.percentSortMetric("1M 涨幅", item.return1m);
      case "return_3m":
        return this.percentSortMetric("3M 涨幅", item.return3m);
      case "return_6m":
        return this.percentSortMetric("6M 涨幅", item.return6m);
      case "return_1y":
        return this.percentSortMetric("1Y 涨幅", item.return1y);
      case "market_cap":
        return this.valuationSortMetric(item);
      case "volume_ratio":
        return { label: "量比", value: item.volumeRatio === null ? "暂无" : `${item.volumeRatio.toFixed(2)}x`, tone: "neutral" };
      case "drawdown":
        return this.percentSortMetric("回撤", item.drawdownPct);
      case "event_count":
      case "macd":
        return { label: "事件", value: String(item.events.length), tone: "neutral" };
      case "data_point_count":
        return { label: "数据点", value: item.dataPointCount.toLocaleString("en-US"), tone: item.dataPointCount >= 120 ? "positive" : item.dataPointCount >= 20 ? "neutral" : "negative" };
      case "trend_score":
        return { label: "趋势分", value: String(item.trendScore), tone: item.trendScore > 0 ? "positive" : item.trendScore < 0 ? "negative" : "neutral" };
      default:
        return null;
    }
  };

  private getReturnMetric = (item: ChartWallItem, sort: string | undefined): ReturnMetric | null => {
    switch (sort) {
      case "return":
        return { key: "return", label: "区间涨幅", value: item.returnPct };
      case "return_1d":
        return { key: "return_1d", label: "1D 涨幅", value: item.return1d };
      case "return_1w":
        return { key: "return_1w", label: "1W 涨幅", value: item.return1w };
      case "return_1m":
        return { key: "return_1m", label: "1M 涨幅", value: item.return1m };
      case "return_3m":
        return { key: "return_3m", label: "3M 涨幅", value: item.return3m };
      case "return_6m":
        return { key: "return_6m", label: "6M 涨幅", value: item.return6m };
      case "return_1y":
        return { key: "return_1y", label: "1Y 涨幅", value: item.return1y };
      default:
        return null;
    }
  };

  private valuationSortMetric = (item: ChartWallItem): NonNullable<AssetChartCardSortMetric> => {
    const display = getValuationDisplay(item.valuation, item.currency, { assetType: item.assetType });
    return {
      label: "市值",
      value: display.label,
      tone: "neutral"
    };
  };

  private percentSortMetric = (label: string, value: number | null | undefined): NonNullable<AssetChartCardSortMetric> => ({
    label,
    value: this.formatPercent(value),
    tone: this.getPercentTone(value)
  });

  private getPercentTone = (value: number | null | undefined): MetricTone =>
    value === null || value === undefined ? "neutral" : value >= 0 ? "positive" : "negative";

  private formatPercent = (value: number | null | undefined): string =>
    value === null || value === undefined ? "暂无" : `${value.toFixed(2)}%`;

  private formatPercentWithSign = (value: number | null | undefined): string =>
    value === null || value === undefined ? "暂无" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
