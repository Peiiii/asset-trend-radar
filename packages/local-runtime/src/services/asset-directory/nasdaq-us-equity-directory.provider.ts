import type { NasdaqUsEquityCatalogItem, NasdaqUsEquityCatalogProvider } from "@gold-insights/data-adapters";
import type { SqliteAssetRepository, SqliteMarketDataRepository } from "@gold-insights/data-storage";
import type { AssetDirectoryCategory, AssetDirectoryItem, AssetDirectoryPageResponse, AssetSummary } from "@gold-insights/market-domain";
import type { NasdaqUsEquityImportService } from "./nasdaq-us-equity-import.service";
import { AssetDirectoryItemMetricsService } from "./asset-directory-item-metrics.service";
import { AssetDirectoryPageBuilderService } from "./asset-directory-page-builder.service";
import type { AssetDirectoryProvider, AssetDirectoryQuery } from "./asset-directory-provider.types";
import { AssetDirectoryValuationFactory } from "./shared/asset-directory-valuation.factory";

type NasdaqCatalogLoadResult = {
  catalogItems: NasdaqUsEquityCatalogItem[];
  isCatalogAvailable: boolean;
};

export class NasdaqUsEquityDirectoryProvider implements AssetDirectoryProvider {
  public readonly categoryId = "us-equity";
  private readonly pageBuilderService = new AssetDirectoryPageBuilderService();
  private readonly itemMetricsService: AssetDirectoryItemMetricsService;
  private readonly valuationFactory = new AssetDirectoryValuationFactory();

  public constructor(
    private readonly catalogProvider: NasdaqUsEquityCatalogProvider,
    private readonly assetRepository: SqliteAssetRepository,
    marketDataRepository: SqliteMarketDataRepository,
    private readonly importService: NasdaqUsEquityImportService
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

  private loadCatalog = async (): Promise<NasdaqCatalogLoadResult> => {
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

  private buildCategory = (loadResult: NasdaqCatalogLoadResult, items: AssetDirectoryItem[]): AssetDirectoryCategory => ({
    id: this.categoryId,
    label: "美股目录",
    description: loadResult.isCatalogAvailable
      ? "NASDAQ Trader 官方美股/ETF 符号目录；未入池资产先展示目录身份，加入后拉取完整 Yahoo 走势。"
      : "NASDAQ Trader 候选目录暂不可用，当前回退展示本地走势池里的美股资产。",
    assetTypes: ["index", "fund", "equity"],
    markets: ["美股"],
    coverage: loadResult.isCatalogAvailable ? "full" : "trend_pool_only",
    capabilities: ["search", "facets", "import_to_pool", "compare", "open_detail"],
    itemCount: items.length,
    inPoolCount: items.filter((item) => item.poolState === "in_pool").length,
    lastSyncedAt: this.getLatestSyncedAt(items)
  });

  private listDirectoryItems = (loadResult: NasdaqCatalogLoadResult): AssetDirectoryItem[] => {
    const localAssets = this.listLocalUsAssets();
    const localAssetsBySymbol = new Map(localAssets.flatMap((asset) => this.getAssetSymbolKeys(asset).map((key) => [key, asset])));
    const usedLocalAssetIds = new Set<string>();
    const catalogItems = loadResult.catalogItems.map((catalogItem) => {
      const localAsset = localAssetsBySymbol.get(this.normalizeSymbol(catalogItem.yahooSymbol));

      if (localAsset) {
        usedLocalAssetIds.add(localAsset.id);
        return this.itemMetricsService.toInPoolItem(this.categoryId, localAsset);
      }

      return this.toCatalogItem(catalogItem);
    });
    const localOnlyItems = localAssets
      .filter((asset) => !usedLocalAssetIds.has(asset.id))
      .map((asset) => this.itemMetricsService.toInPoolItem(this.categoryId, asset));

    return [...catalogItems, ...localOnlyItems];
  };

  private listLocalUsAssets = (): AssetSummary[] =>
    this.assetRepository
      .listAssets()
      .filter((asset) => asset.market === "美股")
      .filter((asset) => asset.level !== "asset-class" && asset.level !== "market");

  private toCatalogItem = (item: NasdaqUsEquityCatalogItem): AssetDirectoryItem => ({
    id: item.id,
    categoryId: this.categoryId,
    label: item.label,
    symbol: item.yahooSymbol,
    market: "美股",
    assetType: item.assetType,
    provider: item.source,
    exchange: item.exchange,
    currency: item.currency,
    latestValue: null,
    latestValueLabel: "最新价",
    latestValueAt: null,
    returns: {
      return1d: null,
      return1m: null,
      return3m: null,
      return6m: null,
      return1y: null
    },
    valuation: this.valuationFactory.empty(),
    poolState: "not_in_pool",
    dataState: "missing",
    dataPointCount: 0,
    assetId: null,
    tags: item.tags
  });

  private getAssetSymbolKeys = (asset: AssetSummary): string[] =>
    [asset.symbol, asset.vendorSymbol ?? ""]
      .map(this.normalizeSymbol)
      .filter((value) => value.length > 0);

  private normalizeSymbol = (value: string): string => value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  private getSearchText = (item: AssetDirectoryItem): string =>
    `${item.label} ${item.symbol} ${item.market} ${item.exchange} ${item.provider} ${item.tags.join(" ")}`;

  private getLatestSyncedAt = (items: AssetDirectoryItem[]): string | null => {
    const latestTs = Math.max(...items.map((item) => (item.latestValueAt ? Date.parse(item.latestValueAt) : NaN)).filter((value) => Number.isFinite(value)));
    return Number.isFinite(latestTs) ? new Date(latestTs).toISOString() : null;
  };
}
