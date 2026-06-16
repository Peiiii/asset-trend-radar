import type { ChartWallItem, ChartWallSortOrder } from "@gold-insights/market-domain";

export class ChartWallItemSorter {
  public sort = (items: ChartWallItem[], sort: string, order: ChartWallSortOrder): ChartWallItem[] => {
    switch (sort) {
      case "return_1d":
        return this.sortByNullableNumber(items, (item) => item.return1d, order);
      case "return_1w":
        return this.sortByNullableNumber(items, (item) => item.return1w, order);
      case "return_1m":
        return this.sortByNullableNumber(items, (item) => item.return1m, order);
      case "return_3m":
        return this.sortByNullableNumber(items, (item) => item.return3m, order);
      case "return_6m":
        return this.sortByNullableNumber(items, (item) => item.return6m, order);
      case "return_1y":
        return this.sortByNullableNumber(items, (item) => item.return1y, order);
      case "return":
        return this.sortByNullableNumber(items, (item) => item.returnPct, order);
      case "volume_ratio":
        return this.sortByNullableNumber(items, (item) => item.volumeRatio, order);
      case "drawdown":
        return this.sortByNullableNumber(items, (item) => item.drawdownPct, order);
      case "event_count":
        return this.sortByNullableNumber(items, (item) => item.events.length, order);
      case "data_point_count":
        return this.sortByNullableNumber(items, (item) => item.dataPointCount, order);
      case "market":
        return this.sortByText(items, (item) => item.market, order);
      case "asset_type":
        return this.sortByText(items, (item) => item.assetType, order);
      case "macd":
        return this.sortByNullableNumber(items, (item) => item.events.length, order);
      case "symbol":
        return this.sortByText(items, (item) => item.symbol, order);
      case "trend_score":
      default:
        return this.sortByNullableNumber(items, (item) => item.trendScore, order);
    }
  };

  private sortByNullableNumber = (items: ChartWallItem[], getValue: (item: ChartWallItem) => number | null, order: ChartWallSortOrder): ChartWallItem[] =>
    [...items].sort((left, right) => {
      const leftValue = getValue(left);
      const rightValue = getValue(right);

      if (leftValue === null && rightValue === null) {
        return right.trendScore - left.trendScore;
      }

      if (leftValue === null) {
        return 1;
      }

      if (rightValue === null) {
        return -1;
      }

      const primary = order === "asc" ? leftValue - rightValue : rightValue - leftValue;
      return primary || right.trendScore - left.trendScore;
    });

  private sortByText = (items: ChartWallItem[], getValue: (item: ChartWallItem) => string, order: ChartWallSortOrder): ChartWallItem[] =>
    [...items].sort((left, right) => {
      const primary = getValue(left).localeCompare(getValue(right), "zh-Hans-CN");
      return (order === "asc" ? primary : -primary) || right.trendScore - left.trendScore;
    });
}
