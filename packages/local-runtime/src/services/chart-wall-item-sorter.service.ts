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
      case "market_cap":
        return this.sortByNullableNumber(items, (item) => this.getComparableMarketCap(item, this.canUseRawMarketCap(items)), order);
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

  private getComparableMarketCap = (item: ChartWallItem, canUseRawMarketCap: boolean): number | null => {
    const normalizedValue = item.valuation.normalized?.marketCap ?? item.valuation.normalized?.floatMarketCap ?? item.valuation.normalized?.fullyDilutedValuation ?? null;

    if (normalizedValue !== null) {
      return normalizedValue;
    }

    const rawValue = this.getRawMarketCap(item);

    if (canUseRawMarketCap || this.isUsdLikeCurrency(item.valuation.currency)) {
      return rawValue;
    }

    return null;
  };

  private canUseRawMarketCap = (items: ChartWallItem[]): boolean => {
    const currencies = new Set(
      items
        .filter((item) => this.getRawMarketCap(item) !== null)
        .map((item) => this.normalizeCurrency(item.valuation.currency))
        .filter((currency): currency is string => currency !== null)
    );

    return currencies.size <= 1;
  };

  private getRawMarketCap = (item: ChartWallItem): number | null =>
    item.valuation.marketCap ?? item.valuation.floatMarketCap ?? item.valuation.fullyDilutedValuation ?? null;

  private normalizeCurrency = (value: string | null): string | null => {
    const currency = value?.trim().toUpperCase() ?? "";
    return currency.length > 0 ? currency : null;
  };

  private isUsdLikeCurrency = (value: string | null): boolean => {
    const currency = this.normalizeCurrency(value);
    return currency === "USD" || currency === "USDT" || currency === "USDC";
  };
}
