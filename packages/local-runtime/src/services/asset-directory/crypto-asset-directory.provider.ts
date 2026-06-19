import type { BinanceCryptoCatalogItem, BinanceCryptoCatalogProvider, CoinGeckoCryptoMarketItem } from "@gold-insights/data-adapters";
import type { SqliteAssetRepository, SqliteMarketDataRepository } from "@gold-insights/data-storage";
import type { AssetDirectoryCategory, AssetDirectoryItem, AssetDirectoryPageResponse, AssetDirectoryValuation, AssetSummary } from "@gold-insights/market-domain";
import type { CryptoMarketValuationService } from "../valuation/crypto-market-valuation.service";
import type { CryptoAssetImportService } from "./crypto-asset-import.service";
import { AssetDirectoryItemMetricsService } from "./asset-directory-item-metrics.service";
import { AssetDirectoryPageBuilderService } from "./asset-directory-page-builder.service";
import type { AssetDirectoryProvider, AssetDirectoryQuery } from "./asset-directory-provider.types";
import type { CryptoAssetDirectoryLoadResult, CryptoAssetDirectorySnapshotService } from "./crypto/crypto-asset-directory-snapshot.service";
import { getCryptoAssetLabel } from "./crypto-asset-labels.config";
import { AssetDirectoryValuationFactory } from "./shared/asset-directory-valuation.factory";

export class CryptoAssetDirectoryProvider implements AssetDirectoryProvider {
  public readonly categoryId = "crypto";
  private readonly pageBuilderService = new AssetDirectoryPageBuilderService();
  private readonly itemMetricsService: AssetDirectoryItemMetricsService;
  private readonly valuationFactory = new AssetDirectoryValuationFactory();

  public constructor(
    private readonly catalogProvider: BinanceCryptoCatalogProvider,
    private readonly valuationService: CryptoMarketValuationService,
    private readonly snapshotService: CryptoAssetDirectorySnapshotService,
    private readonly assetRepository: SqliteAssetRepository,
    marketDataRepository: SqliteMarketDataRepository,
    private readonly importService: CryptoAssetImportService
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

  private loadCatalog = async (): Promise<CryptoAssetDirectoryLoadResult> =>
    this.snapshotService.load(this.loadFreshCatalog);

  private loadFreshCatalog = async (): Promise<CryptoAssetDirectoryLoadResult> => {
    const [catalogResult, valuationResult] = await Promise.allSettled([
      this.catalogProvider.listUsdtSpotCatalog(),
      this.valuationService.listMarketsBySymbol()
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

  private buildCategory = (loadResult: CryptoAssetDirectoryLoadResult, items: AssetDirectoryItem[]): AssetDirectoryCategory => ({
    id: this.categoryId,
    label: "加密目录",
    description: loadResult.isCatalogAvailable
      ? `Binance USDT 现货候选目录；${loadResult.isValuationAvailable ? "CoinGecko 市值" : "市值源暂不可用"}，已入池资产展示完整走势。`
      : "Binance 候选目录暂不可用，当前回退展示本地走势池里的加密资产。",
    assetTypes: ["crypto"],
    markets: ["加密"],
    coverage: loadResult.isCatalogAvailable ? "partial" : "trend_pool_only",
    capabilities: ["search", "facets", "snapshot_metrics", "import_to_pool", "compare", "open_detail"],
    itemCount: items.length,
    inPoolCount: items.filter((item) => item.poolState === "in_pool").length,
    lastSyncedAt: this.getLatestSyncedAt(items)
  });

  private listDirectoryItems = (loadResult: CryptoAssetDirectoryLoadResult): AssetDirectoryItem[] => {
    const localAssets = this.listLocalCryptoAssets();
    const localAssetsBySymbol = new Map(localAssets.flatMap((asset) => this.getAssetSymbolKeys(asset).map((key) => [key, asset])));
    const usedLocalAssetIds = new Set<string>();
    const catalogItems = loadResult.catalogItems.map((catalogItem) => {
      const localAsset = localAssetsBySymbol.get(this.normalizeSymbol(catalogItem.symbol));
      const valuation = this.toCryptoValuation(catalogItem, loadResult.valuationsBySymbol.get(this.normalizeSymbol(catalogItem.baseAsset)) ?? null);

      if (localAsset) {
        usedLocalAssetIds.add(localAsset.id);
        return this.withValuation(this.itemMetricsService.toInPoolItem(this.categoryId, localAsset), valuation);
      }

      return this.toSnapshotItem(catalogItem, valuation);
    });
    const localOnlyItems = localAssets
      .filter((asset) => !usedLocalAssetIds.has(asset.id))
      .map((asset) => this.itemMetricsService.toInPoolItem(this.categoryId, asset));

    return [...catalogItems, ...localOnlyItems];
  };

  private listLocalCryptoAssets = (): AssetSummary[] =>
    this.assetRepository
      .listAssets()
      .filter((asset) => asset.assetType === "crypto")
      .filter((asset) => asset.level !== "asset-class" && asset.level !== "market");

  private toSnapshotItem = (item: BinanceCryptoCatalogItem, valuation: AssetDirectoryValuation): AssetDirectoryItem => ({
    id: `${this.categoryId}:binance:${item.symbol}`,
    categoryId: this.categoryId,
    label: getCryptoAssetLabel(item.baseAsset),
    symbol: item.displaySymbol,
    market: "加密",
    assetType: "crypto",
    provider: item.source,
    exchange: item.exchange,
    currency: item.quoteAsset,
    latestValue: item.latestPrice,
    latestValueLabel: "最新价",
    latestValueAt: item.latestAt,
    returns: {
      return1d: item.return1d,
      return1w: null,
      return1m: null,
      return3m: null,
      return6m: null,
      return1y: null
    },
    valuation,
    poolState: "not_in_pool",
    dataState: "snapshot",
    dataPointCount: 0,
    assetId: null,
    tags: [item.baseAsset, item.quoteAsset, "Binance", `24h成交额:${Math.round(item.quoteVolume ?? 0)}`]
  });

  private getAssetSymbolKeys = (asset: AssetSummary): string[] =>
    [asset.symbol, asset.vendorSymbol ?? ""]
      .map(this.normalizeSymbol)
      .filter((value) => value.length > 0);

  private normalizeSymbol = (value: string): string =>
    value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  private toCryptoValuation = (catalogItem: BinanceCryptoCatalogItem, marketItem: CoinGeckoCryptoMarketItem | null): AssetDirectoryValuation => ({
    ...this.valuationFactory.empty(),
    marketCap: marketItem?.marketCap ?? null,
    fullyDilutedValuation: marketItem?.fullyDilutedValuation ?? null,
    turnover24h: marketItem?.turnover24h ?? catalogItem.quoteVolume,
    marketCapRank: marketItem?.marketCapRank ?? null,
    currency: marketItem?.currency ?? catalogItem.quoteAsset,
    source: marketItem?.source ?? catalogItem.source,
    updatedAt: marketItem?.latestAt ?? catalogItem.latestAt
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
