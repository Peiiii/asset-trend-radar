import type { EastmoneyAshareCatalogItem, EastmoneyAshareCatalogProvider } from "@gold-insights/data-adapters";
import type { SqliteAssetRepository, SqliteMarketDataRepository } from "@gold-insights/data-storage";
import type { AssetDirectoryCategory, AssetDirectoryItem, AssetDirectoryPageResponse, AssetDirectoryValuation, AssetSummary } from "@gold-insights/market-domain";
import { AssetDirectoryItemMetricsService } from "../asset-directory-item-metrics.service";
import { AssetDirectoryPageBuilderService } from "../asset-directory-page-builder.service";
import type { AssetDirectoryProvider, AssetDirectoryQuery } from "../asset-directory-provider.types";
import { AssetDirectoryValuationFactory } from "../shared/asset-directory-valuation.factory";
import type { EastmoneyAshareImportService } from "./eastmoney-a-share-import.service";

type EastmoneyAshareCatalogLoadResult = {
  catalogItems: EastmoneyAshareCatalogItem[];
  isCatalogAvailable: boolean;
};

export class EastmoneyAshareDirectoryProvider implements AssetDirectoryProvider {
  public readonly categoryId = "a-share";
  private readonly pageBuilderService = new AssetDirectoryPageBuilderService();
  private readonly itemMetricsService: AssetDirectoryItemMetricsService;
  private readonly valuationFactory = new AssetDirectoryValuationFactory();

  public constructor(
    private readonly catalogProvider: EastmoneyAshareCatalogProvider,
    private readonly assetRepository: SqliteAssetRepository,
    marketDataRepository: SqliteMarketDataRepository,
    private readonly importService: EastmoneyAshareImportService
  ) {
    this.itemMetricsService = new AssetDirectoryItemMetricsService(marketDataRepository);
  }

  public getCategory = async (): Promise<AssetDirectoryCategory> => {
    const loadResult = await this.loadCatalog();
    const items = this.listDirectoryItems(loadResult);
    return this.buildCategory(loadResult, items);
  };

  public listItems = async (query: AssetDirectoryQuery): Promise<AssetDirectoryPageResponse> => {
    const loadResult = await this.loadCatalog();
    const items = this.listDirectoryItems(loadResult);

    return this.pageBuilderService.buildPage({
      category: this.buildCategory(loadResult, items),
      items,
      query,
      getSearchText: this.getSearchText
    });
  };

  public importItem = async (itemId: string) =>
    this.importService.importItem(itemId);

  private loadCatalog = async (): Promise<EastmoneyAshareCatalogLoadResult> => {
    try {
      return {
        catalogItems: await this.catalogProvider.listCatalog(),
        isCatalogAvailable: true
      };
    } catch (error) {
      console.warn(error);
      return {
        catalogItems: [],
        isCatalogAvailable: false
      };
    }
  };

  private buildCategory = (loadResult: EastmoneyAshareCatalogLoadResult, items: AssetDirectoryItem[]): AssetDirectoryCategory => ({
    id: this.categoryId,
    label: "A 股目录",
    description: loadResult.isCatalogAvailable
      ? "东方财富 A 股股票轻量候选目录；已入池资产展示完整走势，未入池资产展示实时快照并可按需拉取走势。"
      : "东方财富 A 股候选目录暂不可用，当前回退展示本地走势池里的 A 股资产。",
    assetTypes: ["index", "fund", "equity"],
    markets: ["A 股"],
    coverage: loadResult.isCatalogAvailable ? "partial" : "trend_pool_only",
    capabilities: ["search", "facets", "snapshot_metrics", "import_to_pool", "compare", "open_detail"],
    itemCount: items.length,
    inPoolCount: items.filter((item) => item.poolState === "in_pool").length,
    lastSyncedAt: this.getLatestSyncedAt(items)
  });

  private listDirectoryItems = (loadResult: EastmoneyAshareCatalogLoadResult): AssetDirectoryItem[] => {
    const localAssets = this.listLocalAshareAssets();
    const localAssetsBySymbol = new Map(localAssets.flatMap((asset) => this.getAssetSymbolKeys(asset).map((key) => [key, asset])));
    const usedLocalAssetIds = new Set<string>();
    const catalogItems = loadResult.catalogItems.map((catalogItem) => {
      const localAsset = localAssetsBySymbol.get(this.normalizeSymbol(catalogItem.yahooSymbol));

      if (localAsset) {
        usedLocalAssetIds.add(localAsset.id);
        return this.withValuation(this.itemMetricsService.toInPoolItem(this.categoryId, localAsset), this.toValuation(catalogItem));
      }

      return this.toSnapshotItem(catalogItem);
    });
    const localOnlyItems = localAssets
      .filter((asset) => !usedLocalAssetIds.has(asset.id))
      .map((asset) => this.itemMetricsService.toInPoolItem(this.categoryId, asset));

    return [...catalogItems, ...localOnlyItems];
  };

  private listLocalAshareAssets = (): AssetSummary[] =>
    this.assetRepository
      .listAssets()
      .filter((asset) => asset.market === "A 股")
      .filter((asset) => asset.level !== "asset-class" && asset.level !== "market");

  private toSnapshotItem = (item: EastmoneyAshareCatalogItem): AssetDirectoryItem => ({
    id: item.id,
    categoryId: this.categoryId,
    label: item.label,
    symbol: item.yahooSymbol,
    market: "A 股",
    assetType: item.assetType,
    provider: item.source,
    exchange: item.exchange,
    currency: item.currency,
    latestValue: item.latestPrice,
    latestValueLabel: "最新价",
    latestValueAt: item.latestAt,
    returns: {
      return1d: item.return1d,
      return1m: null,
      return3m: null,
      return6m: null,
      return1y: null
    },
    valuation: this.toValuation(item),
    poolState: "not_in_pool",
    dataState: "snapshot",
    dataPointCount: 0,
    assetId: null,
    tags: item.tags
  });

  private getAssetSymbolKeys = (asset: AssetSummary): string[] =>
    [asset.symbol, asset.vendorSymbol ?? ""]
      .map(this.normalizeSymbol)
      .filter((value) => value.length > 0);

  private normalizeSymbol = (value: string): string => value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  private toValuation = (item: EastmoneyAshareCatalogItem): AssetDirectoryValuation => ({
    ...this.valuationFactory.empty(),
    marketCap: item.marketCap,
    floatMarketCap: item.floatMarketCap,
    currency: item.currency,
    source: item.source,
    updatedAt: item.latestAt
  });

  private withValuation = (item: AssetDirectoryItem, valuation: AssetDirectoryValuation): AssetDirectoryItem => ({
    ...item,
    valuation
  });

  private getSearchText = (item: AssetDirectoryItem): string =>
    `${item.label} ${item.symbol} ${item.market} ${item.exchange} ${item.provider} ${item.tags.join(" ")}`;

  private getLatestSyncedAt = (items: AssetDirectoryItem[]): string | null => {
    const latestTs = Math.max(...items.map((item) => (item.latestValueAt ? Date.parse(item.latestValueAt) : NaN)).filter((value) => Number.isFinite(value)));
    return Number.isFinite(latestTs) ? new Date(latestTs).toISOString() : null;
  };
}
