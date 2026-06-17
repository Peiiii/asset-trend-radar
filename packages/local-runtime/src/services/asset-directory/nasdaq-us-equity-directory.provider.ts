import type { NasdaqUsEquityCatalogItem, NasdaqUsEquityCatalogProvider } from "@gold-insights/data-adapters";
import type { SqliteAssetRepository, SqliteMarketDataRepository } from "@gold-insights/data-storage";
import type { AssetDirectoryCategory, AssetDirectoryItem, AssetDirectoryPageResponse, AssetSummary } from "@gold-insights/market-domain";
import type { NasdaqUsEquityImportService } from "./nasdaq-us-equity-import.service";
import { AssetDirectoryItemListService } from "./asset-directory-item-list.service";
import { AssetDirectoryItemMetricsService } from "./asset-directory-item-metrics.service";
import type { AssetDirectoryProvider, AssetDirectoryQuery } from "./asset-directory-provider.types";

type NasdaqCatalogLoadResult = {
  catalogItems: NasdaqUsEquityCatalogItem[];
  isCatalogAvailable: boolean;
};

export class NasdaqUsEquityDirectoryProvider implements AssetDirectoryProvider {
  public readonly categoryId = "us-equity";
  private readonly itemListService = new AssetDirectoryItemListService();
  private readonly itemMetricsService: AssetDirectoryItemMetricsService;

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

    return {
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
    };
  };

  public listItems = async (query: AssetDirectoryQuery): Promise<AssetDirectoryPageResponse> => {
    const loadResult = await this.loadCatalog();
    const category = await this.getCategory();
    const keyword = query.keyword.trim().toLowerCase();
    const matchedItems = this.listDirectoryItems(loadResult)
      .filter((item) => (query.status === "all" ? true : item.poolState === query.status))
      .filter((item) => {
        if (keyword.length === 0) {
          return true;
        }

        return `${item.label} ${item.symbol} ${item.market} ${item.exchange} ${item.provider} ${item.tags.join(" ")}`.toLowerCase().includes(keyword);
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
          { value: "not_in_pool", label: "待加入走势池", count: matchedItems.filter((item) => item.poolState === "not_in_pool").length }
        ]
      }
    };
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

  private getLatestSyncedAt = (items: AssetDirectoryItem[]): string | null => {
    const latestTs = Math.max(...items.map((item) => (item.latestValueAt ? Date.parse(item.latestValueAt) : NaN)).filter((value) => Number.isFinite(value)));
    return Number.isFinite(latestTs) ? new Date(latestTs).toISOString() : null;
  };
}
