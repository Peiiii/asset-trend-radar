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
    const localAssets = this.listLocalUsAssets();
    const loadResult = await this.loadCatalog(localAssets);
    const items = this.listDirectoryItems(loadResult, localAssets);
    return this.buildCategory(loadResult, items);
  };

  public listItems = async (query: AssetDirectoryQuery): Promise<AssetDirectoryPageResponse> => {
    const localAssets = this.listLocalUsAssets();
    const loadResult = await this.loadCatalog(localAssets);
    const items = this.listDirectoryItems(loadResult, localAssets);

    return this.pageBuilderService.buildPage({
      category: this.buildCategory(loadResult, items),
      items,
      query,
      getSearchText: this.getSearchText
    });
  };

  public importItem = async (itemId: string) =>
    this.importService.importItem(itemId);

  private loadCatalog = async (localAssets: AssetSummary[]): Promise<NasdaqCatalogLoadResult> => {
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

    const valuationsBySymbol = valuationResult.status === "fulfilled" ? await this.withLocalAssetValuations(valuationResult.value, localAssets) : new Map<string, NasdaqUsEquityValuationItem>();

    return {
      catalogItems: catalogResult.status === "fulfilled" ? catalogResult.value : [],
      valuationsBySymbol,
      isCatalogAvailable: catalogResult.status === "fulfilled",
      isValuationAvailable: valuationResult.status === "fulfilled"
    };
  };

  private buildCategory = (loadResult: NasdaqCatalogLoadResult, items: AssetDirectoryItem[]): AssetDirectoryCategory => ({
    id: this.categoryId,
    label: "美股目录",
    description: loadResult.isCatalogAvailable
      ? `NASDAQ Trader 官方美股/ETF 符号目录；${loadResult.isValuationAvailable ? "NASDAQ 股票市值快照，ETF/AUM 规模源未完整接入" : "市值源暂不可用"}，加入后拉取完整 Yahoo 走势。`
      : "NASDAQ Trader 候选目录暂不可用，当前回退展示本地走势池里的美股资产。",
    assetTypes: ["index", "fund", "equity"],
    markets: ["美股"],
    coverage: loadResult.isCatalogAvailable ? "full" : "trend_pool_only",
    capabilities: ["search", "facets", "snapshot_metrics", "import_to_pool", "compare", "open_detail"],
    itemCount: items.length,
    inPoolCount: items.filter((item) => item.poolState === "in_pool").length,
    lastSyncedAt: this.getLatestSyncedAt(items)
  });

  private listDirectoryItems = (loadResult: NasdaqCatalogLoadResult, localAssets: AssetSummary[]): AssetDirectoryItem[] => {
    const localAssetsBySymbol = new Map(localAssets.flatMap((asset) => this.getAssetSymbolKeys(asset).map((key) => [key, asset])));
    const usedLocalAssetIds = new Set<string>();
    const catalogItems = loadResult.catalogItems.map((catalogItem) => {
      const localAsset = localAssetsBySymbol.get(this.normalizeSymbol(catalogItem.yahooSymbol));
      const valuationItem = this.getValuationItem(loadResult.valuationsBySymbol, catalogItem.yahooSymbol);
      const valuation = this.toValuation(valuationItem);

      if (localAsset) {
        usedLocalAssetIds.add(localAsset.id);
        return this.withValuation(this.itemMetricsService.toInPoolItem(this.categoryId, localAsset), valuation);
      }

      return this.toCatalogItem(catalogItem, valuationItem, valuation);
    });
    const localOnlyItems = localAssets
      .filter((asset) => !usedLocalAssetIds.has(asset.id))
      .map((asset) => this.withValuation(this.itemMetricsService.toInPoolItem(this.categoryId, asset), this.toValuation(this.getAssetValuationItem(loadResult.valuationsBySymbol, asset))));

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

  private withLocalAssetValuations = async (stockValuationsBySymbol: Map<string, NasdaqUsEquityValuationItem>, localAssets: AssetSummary[]): Promise<Map<string, NasdaqUsEquityValuationItem>> => {
    const mergedValuations = new Map(stockValuationsBySymbol);
    const missingSymbols = this.getLocalValuationSymbols(localAssets).filter((symbol) => !this.getValuationItem(mergedValuations, symbol)?.marketCap);

    if (missingSymbols.length === 0) {
      return mergedValuations;
    }

    try {
      const localValuationsBySymbol = await this.valuationProvider.listValuationsForSymbols(missingSymbols);

      for (const [symbol, item] of localValuationsBySymbol) {
        mergedValuations.set(this.normalizeSymbol(symbol), item);
      }
    } catch (error) {
      console.warn(error);
    }

    return mergedValuations;
  };

  private getLocalValuationSymbols = (assets: AssetSummary[]): string[] =>
    [...new Set(assets.filter(this.isValuationCandidate).flatMap(this.getAssetSymbolKeys))];

  private isValuationCandidate = (asset: AssetSummary): boolean =>
    asset.assetType === "equity" || asset.assetType === "fund";

  private getAssetValuationItem = (valuationsBySymbol: Map<string, NasdaqUsEquityValuationItem>, asset: AssetSummary): NasdaqUsEquityValuationItem | null => {
    for (const symbol of this.getAssetSymbolKeys(asset)) {
      const valuationItem = this.getValuationItem(valuationsBySymbol, symbol);

      if (valuationItem) {
        return valuationItem;
      }
    }

    return null;
  };

  private getValuationItem = (valuationsBySymbol: Map<string, NasdaqUsEquityValuationItem>, symbol: string): NasdaqUsEquityValuationItem | null =>
    valuationsBySymbol.get(this.normalizeSymbol(symbol)) ?? null;

  private normalizeSymbol = (value: string): string =>
    value.toUpperCase().replace(/[./]/g, "-").replace(/[^A-Z0-9-]/g, "");

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
