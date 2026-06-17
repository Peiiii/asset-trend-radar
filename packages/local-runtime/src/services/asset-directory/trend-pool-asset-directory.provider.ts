import type { SqliteAssetRepository, SqliteMarketDataRepository } from "@gold-insights/data-storage";
import type { AssetDirectoryCategory, AssetDirectoryCategoryId, AssetDirectoryItem, AssetDirectoryPageResponse, AssetSummary, AssetType } from "@gold-insights/market-domain";
import { toIsoDateTime } from "@gold-insights/market-domain";
import { AssetDirectoryItemListService } from "./asset-directory-item-list.service";
import { AssetDirectoryItemMetricsService } from "./asset-directory-item-metrics.service";
import type { AssetDirectoryProvider, AssetDirectoryQuery } from "./asset-directory-provider.types";

type TrendPoolAssetDirectoryConfig = {
  categoryId: AssetDirectoryCategoryId;
  label: string;
  description: string;
  assetTypes: AssetType[];
  markets: string[];
  marketFilters?: string[];
  assetTypeFilters?: AssetType[];
};

export class TrendPoolAssetDirectoryProvider implements AssetDirectoryProvider {
  public readonly categoryId: AssetDirectoryCategoryId;
  private readonly itemListService = new AssetDirectoryItemListService();
  private readonly itemMetricsService: AssetDirectoryItemMetricsService;

  public constructor(
    private readonly config: TrendPoolAssetDirectoryConfig,
    private readonly assetRepository: SqliteAssetRepository,
    private readonly marketDataRepository: SqliteMarketDataRepository
  ) {
    this.categoryId = this.config.categoryId;
    this.itemMetricsService = new AssetDirectoryItemMetricsService(this.marketDataRepository);
  }

  public getCategory = (): AssetDirectoryCategory => {
    const assets = this.listDirectoryAssets();
    const markets = this.getFacetValues(assets, (asset) => asset.market, this.config.markets);
    const assetTypes = this.getFacetValues(assets, (asset) => asset.assetType, this.config.assetTypes);

    return {
      id: this.categoryId,
      label: this.config.label,
      description: this.config.description,
      assetTypes,
      markets,
      coverage: "trend_pool_only",
      capabilities: ["search", "snapshot_metrics", "compare", "open_detail"],
      itemCount: assets.length,
      inPoolCount: assets.length,
      lastSyncedAt: assets.length > 0 ? toIsoDateTime(this.marketDataRepository.latestBarTimestamp()) : null
    };
  };

  public listItems = (query: AssetDirectoryQuery): AssetDirectoryPageResponse => {
    const category = this.getCategory();
    const keyword = query.keyword.trim().toLowerCase();
    const matchedItems = (query.status === "not_in_pool" ? [] : this.listDirectoryItems())
      .filter((item) => (query.status === "all" ? true : item.poolState === query.status))
      .filter((item) => {
        if (keyword.length === 0) {
          return true;
        }

        return `${item.label} ${item.symbol} ${item.market} ${item.exchange} ${item.assetType} ${item.tags.join(" ")}`.toLowerCase().includes(keyword);
      });
    const sortedItems = this.itemListService.sortItems(matchedItems, query.sort, query.order);

    return {
      generatedAt: new Date().toISOString(),
      category,
      keyword: query.keyword,
      status: query.status,
      sort: query.sort,
      order: query.order,
      limit: query.limit,
      offset: query.offset,
      totalCount: matchedItems.length,
      items: sortedItems.slice(query.offset, query.offset + query.limit),
      facets: {
        markets: this.itemListService.toFacets(matchedItems, (item) => item.market),
        assetTypes: this.itemListService.toFacets(matchedItems, (item) => item.assetType),
        statuses: [
          { value: "all", label: "全部状态", count: matchedItems.length },
          { value: "in_pool", label: "已加入走势池", count: matchedItems.filter((item) => item.poolState === "in_pool").length },
          { value: "not_in_pool", label: "待加入走势池", count: 0 }
        ]
      }
    };
  };

  private listDirectoryAssets = (): AssetSummary[] => {
    const marketFilters = new Set(this.config.marketFilters ?? []);
    const assetTypeFilters = new Set(this.config.assetTypeFilters ?? []);

    return this.assetRepository
      .listAssets()
      .filter((asset) => this.isMarketDataAsset(asset))
      .filter((asset) => marketFilters.size === 0 || marketFilters.has(asset.market))
      .filter((asset) => assetTypeFilters.size === 0 || assetTypeFilters.has(asset.assetType));
  };

  private listDirectoryItems = (): AssetDirectoryItem[] =>
    this.listDirectoryAssets().map((asset) => this.itemMetricsService.toInPoolItem(this.categoryId, asset));

  private isMarketDataAsset = (asset: AssetSummary): boolean => asset.level !== "asset-class" && asset.level !== "market";

  private getFacetValues = <TItem, TValue extends string>(items: TItem[], getValue: (item: TItem) => TValue, fallbackValues: TValue[]): TValue[] => {
    const values = [...new Set(items.map(getValue))].sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
    return values.length > 0 ? values : fallbackValues;
  };
}
