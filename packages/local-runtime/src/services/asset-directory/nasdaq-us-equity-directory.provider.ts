import type { NasdaqUsEquityCatalogItem, NasdaqUsEquityCatalogProvider, NasdaqUsEquityValuationItem, NasdaqUsEquityValuationProvider } from "@gold-insights/data-adapters";
import type { SqliteAssetRepository, SqliteMarketDataRepository } from "@gold-insights/data-storage";
import type { AssetDirectoryCategory, AssetDirectoryItem, AssetDirectoryPageResponse, AssetDirectoryValuation, AssetSummary } from "@gold-insights/market-domain";
import type { NasdaqUsEquityImportService } from "./nasdaq-us-equity-import.service";
import { AssetDirectoryItemMetricsService } from "./asset-directory-item-metrics.service";
import { AssetDirectoryPageBuilderService } from "./asset-directory-page-builder.service";
import type { AssetDirectoryProvider, AssetDirectoryQuery } from "./asset-directory-provider.types";
import { AssetDirectoryValuationFactory } from "./shared/asset-directory-valuation.factory";

type NasdaqCatalogLoadResult = {
  catalogItems: NasdaqUsEquityCatalogItem[];
  valuationsBySymbol: Map<string, NasdaqUsEquityValuationItem>;
  isCatalogAvailable: boolean;
  isValuationAvailable: boolean;
};

export class NasdaqUsEquityDirectoryProvider implements AssetDirectoryProvider {
  public readonly categoryId = "us-equity";
  private readonly pageBuilderService = new AssetDirectoryPageBuilderService();
  private readonly itemMetricsService: AssetDirectoryItemMetricsService;
  private readonly valuationFactory = new AssetDirectoryValuationFactory();

  public constructor(
    private readonly catalogProvider: NasdaqUsEquityCatalogProvider,
    private readonly valuationProvider: NasdaqUsEquityValuationProvider,
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
    const [catalogResult, valuationResult] = await Promise.allSettled([
      this.catalogProvider.listCatalog(),
      this.valuationProvider.listStockValuationsBySymbol()
    ]);

    if (catalogResult.status === "rejected") {
      console.warn(catalogResult.reason);
    }

    if (valuationResult.status === "rejected") {
      console.warn(valuationResult.reason);
    }

    return {
      catalogItems: catalogResult.status === "fulfilled" ? catalogResult.value : [],
      valuationsBySymbol: valuationResult.status === "fulfilled" ? valuationResult.value : new Map(),
      isCatalogAvailable: catalogResult.status === "fulfilled",
      isValuationAvailable: valuationResult.status === "fulfilled"
    };
  };

  private buildCategory = (loadResult: NasdaqCatalogLoadResult, items: AssetDirectoryItem[]): AssetDirectoryCategory => ({
    id: this.categoryId,
    label: "美股目录",
    description: loadResult.isCatalogAvailable
      ? `NASDAQ Trader 官方美股/ETF 符号目录；${loadResult.isValuationAvailable ? "NASDAQ 股票市值快照" : "市值源暂不可用"}，加入后拉取完整 Yahoo 走势。`
      : "NASDAQ Trader 候选目录暂不可用，当前回退展示本地走势池里的美股资产。",
    assetTypes: ["index", "fund", "equity"],
    markets: ["美股"],
    coverage: loadResult.isCatalogAvailable ? "full" : "trend_pool_only",
    capabilities: ["search", "facets", "snapshot_metrics", "import_to_pool", "compare", "open_detail"],
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
      const valuationItem = loadResult.valuationsBySymbol.get(this.normalizeSymbol(catalogItem.yahooSymbol)) ?? null;
      const valuation = this.toValuation(valuationItem);

      if (localAsset) {
        usedLocalAssetIds.add(localAsset.id);
        return this.withValuation(this.itemMetricsService.toInPoolItem(this.categoryId, localAsset), valuation);
      }

      return this.toCatalogItem(catalogItem, valuationItem, valuation);
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

  private toCatalogItem = (item: NasdaqUsEquityCatalogItem, valuationItem: NasdaqUsEquityValuationItem | null, valuation: AssetDirectoryValuation): AssetDirectoryItem => ({
    id: item.id,
    categoryId: this.categoryId,
    label: item.label,
    symbol: item.yahooSymbol,
    market: "美股",
    assetType: item.assetType,
    provider: valuationItem?.source ?? item.source,
    exchange: item.exchange,
    currency: item.currency,
    latestValue: valuationItem?.latestPrice ?? null,
    latestValueLabel: "最新价",
    latestValueAt: valuationItem?.latestAt ?? null,
    returns: {
      return1d: valuationItem?.return1d ?? null,
      return1m: null,
      return3m: null,
      return6m: null,
      return1y: null
    },
    valuation,
    poolState: "not_in_pool",
    dataState: valuationItem ? "snapshot" : "missing",
    dataPointCount: 0,
    assetId: null,
    tags: [...item.tags, ...[valuationItem?.sector, valuationItem?.industry].filter((tag): tag is string => Boolean(tag))]
  });

  private getAssetSymbolKeys = (asset: AssetSummary): string[] =>
    [asset.symbol, asset.vendorSymbol ?? ""]
      .map(this.normalizeSymbol)
      .filter((value) => value.length > 0);

  private normalizeSymbol = (value: string): string => value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  private toValuation = (item: NasdaqUsEquityValuationItem | null): AssetDirectoryValuation => ({
    ...this.valuationFactory.empty(),
    marketCap: item?.marketCap ?? null,
    currency: item?.currency ?? null,
    source: item?.source ?? null,
    updatedAt: item?.latestAt ?? null
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
