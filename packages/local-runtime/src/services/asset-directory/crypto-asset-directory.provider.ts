import type { BinanceCryptoCatalogItem, BinanceCryptoCatalogProvider } from "@gold-insights/data-adapters";
import type { SqliteAssetRepository, SqliteMarketDataRepository } from "@gold-insights/data-storage";
import type { AssetDirectoryCategory, AssetDirectoryItem, AssetDirectoryPageResponse, AssetSummary } from "@gold-insights/market-domain";
import type { CryptoAssetImportService } from "./crypto-asset-import.service";
import { AssetDirectoryItemMetricsService } from "./asset-directory-item-metrics.service";
import { AssetDirectoryPageBuilderService } from "./asset-directory-page-builder.service";
import type { AssetDirectoryProvider, AssetDirectoryQuery } from "./asset-directory-provider.types";
import { getCryptoAssetLabel } from "./crypto-asset-labels.config";

type CryptoCatalogLoadResult = {
  catalogItems: BinanceCryptoCatalogItem[];
  isCatalogAvailable: boolean;
};

export class CryptoAssetDirectoryProvider implements AssetDirectoryProvider {
  public readonly categoryId = "crypto";
  private readonly pageBuilderService = new AssetDirectoryPageBuilderService();
  private readonly itemMetricsService: AssetDirectoryItemMetricsService;

  public constructor(
    private readonly catalogProvider: BinanceCryptoCatalogProvider,
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

  private loadCatalog = async (): Promise<CryptoCatalogLoadResult> => {
    try {
      return {
        catalogItems: await this.catalogProvider.listUsdtSpotCatalog(),
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

  private buildCategory = (loadResult: CryptoCatalogLoadResult, items: AssetDirectoryItem[]): AssetDirectoryCategory => ({
    id: this.categoryId,
    label: "加密目录",
    description: loadResult.isCatalogAvailable
      ? "Binance USDT 现货轻量候选目录；已入池资产展示完整走势，未入池资产展示 24h 快照。"
      : "Binance 候选目录暂不可用，当前回退展示本地走势池里的加密资产。",
    assetTypes: ["crypto"],
    markets: ["加密"],
    coverage: loadResult.isCatalogAvailable ? "partial" : "trend_pool_only",
    capabilities: ["search", "facets", "snapshot_metrics", "import_to_pool", "compare", "open_detail"],
    itemCount: items.length,
    inPoolCount: items.filter((item) => item.poolState === "in_pool").length,
    lastSyncedAt: this.getLatestSyncedAt(items)
  });

  private listDirectoryItems = (loadResult: CryptoCatalogLoadResult): AssetDirectoryItem[] => {
    const localAssets = this.listLocalCryptoAssets();
    const localAssetsBySymbol = new Map(localAssets.flatMap((asset) => this.getAssetSymbolKeys(asset).map((key) => [key, asset])));
    const usedLocalAssetIds = new Set<string>();
    const catalogItems = loadResult.catalogItems.map((catalogItem) => {
      const localAsset = localAssetsBySymbol.get(this.normalizeSymbol(catalogItem.symbol));

      if (localAsset) {
        usedLocalAssetIds.add(localAsset.id);
        return this.itemMetricsService.toInPoolItem(this.categoryId, localAsset);
      }

      return this.toSnapshotItem(catalogItem);
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

  private toSnapshotItem = (item: BinanceCryptoCatalogItem): AssetDirectoryItem => ({
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
      return1m: null,
      return3m: null,
      return6m: null,
      return1y: null
    },
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

  private getSearchText = (item: AssetDirectoryItem): string =>
    `${item.label} ${item.symbol} ${item.market} ${item.exchange} ${item.provider} ${item.tags.join(" ")}`;

  private getLatestSyncedAt = (items: AssetDirectoryItem[]): string | null => {
    const latestTs = Math.max(...items.map((item) => (item.latestValueAt ? Date.parse(item.latestValueAt) : NaN)).filter((value) => Number.isFinite(value)));
    return Number.isFinite(latestTs) ? new Date(latestTs).toISOString() : null;
  };
}
