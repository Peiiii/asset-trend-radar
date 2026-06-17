import type { AssetDirectoryFacet, AssetDirectoryItem, AssetDirectorySortKey, AssetDirectorySortOrder } from "@gold-insights/market-domain";

export class AssetDirectoryItemListService {
  public sortItems = (items: AssetDirectoryItem[], sort: AssetDirectorySortKey, order: AssetDirectorySortOrder): AssetDirectoryItem[] => {
    if (sort === "label" || sort === "relevance") {
      return this.sortByText(items, (item) => item.label, order);
    }

    const canUseRawMarketCap = sort === "market_cap" ? this.canUseRawMarketCap(items) : true;
    return this.sortByNullableNumber(items, (item) => this.getSortValue(item, sort, canUseRawMarketCap), order);
  };

  public toFacets = (items: AssetDirectoryItem[], getValue: (item: AssetDirectoryItem) => string): AssetDirectoryFacet[] =>
    [...items.reduce((facets, item) => {
      const value = getValue(item);
      facets.set(value, (facets.get(value) ?? 0) + 1);
      return facets;
    }, new Map<string, number>())]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-Hans-CN"));

  private getSortValue = (item: AssetDirectoryItem, sort: AssetDirectorySortKey, canUseRawMarketCap: boolean): number | null => {
    switch (sort) {
      case "latest_value":
        return item.latestValue;
      case "market_cap":
        return this.getComparableMarketCap(item, canUseRawMarketCap);
      case "return_1d":
        return item.returns.return1d;
      case "return_1m":
        return item.returns.return1m;
      case "return_3m":
        return item.returns.return3m;
      case "return_6m":
        return item.returns.return6m;
      case "return_1y":
        return item.returns.return1y;
      case "data_point_count":
        return item.dataPointCount;
      case "label":
      case "relevance":
      default:
        return null;
    }
  };

  private sortByNullableNumber = (items: AssetDirectoryItem[], getValue: (item: AssetDirectoryItem) => number | null, order: AssetDirectorySortOrder): AssetDirectoryItem[] =>
    [...items].sort((left, right) => {
      const leftValue = getValue(left);
      const rightValue = getValue(right);

      if (leftValue === null && rightValue === null) {
        return left.label.localeCompare(right.label, "zh-Hans-CN");
      }

      if (leftValue === null) {
        return 1;
      }

      if (rightValue === null) {
        return -1;
      }

      return order === "asc" ? leftValue - rightValue : rightValue - leftValue;
    });

  private sortByText = (items: AssetDirectoryItem[], getValue: (item: AssetDirectoryItem) => string, order: AssetDirectorySortOrder): AssetDirectoryItem[] =>
    [...items].sort((left, right) => {
      const primary = getValue(left).localeCompare(getValue(right), "zh-Hans-CN");
      return order === "asc" ? primary : -primary;
    });

  private getComparableMarketCap = (item: AssetDirectoryItem, canUseRawMarketCap: boolean): number | null => {
    const normalizedValue = item.valuation.normalized?.marketCap ?? item.valuation.normalized?.floatMarketCap ?? item.valuation.normalized?.fullyDilutedValuation ?? null;

    if (normalizedValue !== null) {
      return normalizedValue;
    }

    const rawValue = item.valuation.marketCap ?? item.valuation.floatMarketCap ?? item.valuation.fullyDilutedValuation ?? null;

    if (canUseRawMarketCap || this.isUsdLikeCurrency(item.valuation.currency)) {
      return rawValue;
    }

    return null;
  };

  private canUseRawMarketCap = (items: AssetDirectoryItem[]): boolean => {
    const currencies = new Set(
      items
        .filter((item) => (item.valuation.marketCap ?? item.valuation.floatMarketCap ?? item.valuation.fullyDilutedValuation) !== null)
        .map((item) => this.normalizeCurrency(item.valuation.currency))
        .filter((currency): currency is string => currency !== null)
    );

    return currencies.size <= 1;
  };

  private normalizeCurrency = (value: string | null): string | null => {
    const currency = value?.trim().toUpperCase() ?? "";
    return currency.length > 0 ? currency : null;
  };

  private isUsdLikeCurrency = (value: string | null): boolean => {
    const currency = this.normalizeCurrency(value);
    return currency === "USD" || currency === "USDT" || currency === "USDC";
  };
}
