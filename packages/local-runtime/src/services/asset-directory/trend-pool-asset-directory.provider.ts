import type { SqliteAssetRepository, SqliteMarketDataRepository } from "@gold-insights/data-storage";
import type { AssetDirectoryCategory, AssetDirectoryCategoryId, AssetDirectoryItem, AssetDirectoryPageResponse, AssetSummary, AssetType } from "@gold-insights/market-domain";
import { toIsoDateTime } from "@gold-insights/market-domain";
import { AssetDirectoryItemMetricsService } from "./asset-directory-item-metrics.service";
import { AssetDirectoryPageBuilderService } from "./asset-directory-page-builder.service";
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
  private readonly pageBuilderService = new AssetDirectoryPageBuilderService();
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
    return this.buildCategory(assets);
  };

  public listItems = (query: AssetDirectoryQuery): AssetDirectoryPageResponse => {
    const assets = this.listDirectoryAssets();
    const items = this.toDirectoryItems(assets);

    return this.pageBuilderService.buildPage({
      category: this.buildCategory(assets),
      items,
      query,
      getSearchText: this.getSearchText
    });
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

  private toDirectoryItems = (assets: AssetSummary[]): AssetDirectoryItem[] =>
    assets.map((asset) => this.itemMetricsService.toInPoolItem(this.categoryId, asset));

  private buildCategory = (assets: AssetSummary[]): AssetDirectoryCategory => {
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

  private isMarketDataAsset = (asset: AssetSummary): boolean => asset.level !== "asset-class" && asset.level !== "market";

  private getSearchText = (item: AssetDirectoryItem): string =>
    `${item.label} ${item.symbol} ${item.market} ${item.exchange} ${item.assetType} ${item.tags.join(" ")}`;

  private getFacetValues = <TItem, TValue extends string>(items: TItem[], getValue: (item: TItem) => TValue, fallbackValues: TValue[]): TValue[] => {
    const values = [...new Set(items.map(getValue))].sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
    return values.length > 0 ? values : fallbackValues;
  };
}
