import { YahooMarketDataProvider, type EastmoneyAshareCatalogItem, type EastmoneyAshareCatalogProvider } from "@gold-insights/data-adapters";
import type { SqliteIngestionJobRepository } from "@gold-insights/data-storage";
import type { AssetDirectoryImportResponse, AssetSummary, Timeframe } from "@gold-insights/market-domain";
import type { AssetDirectoryHistoryImportService } from "../asset-directory-history-import.service";

export class EastmoneyAshareImportService {
  private readonly dataProvider = new YahooMarketDataProvider();
  private readonly timeframes: Timeframe[] = ["1d", "15m", "1h", "4h"];

  public constructor(
    private readonly historyLimit: number,
    private readonly catalogProvider: EastmoneyAshareCatalogProvider,
    private readonly ingestionJobRepository: SqliteIngestionJobRepository,
    private readonly historyImportService: AssetDirectoryHistoryImportService
  ) {}

  public importItem = async (itemId: string): Promise<AssetDirectoryImportResponse> => {
    const yahooSymbol = this.getCatalogSymbol(itemId);
    const jobId = `a-share-import-${this.toAssetIdToken(yahooSymbol)}-${Date.now()}`;

    return this.runTrackedTask(jobId, "eastmoney", `a-share-import:${yahooSymbol}`, { symbol: yahooSymbol, itemId }, async () => {
      const catalogItem = await this.findCatalogItem(yahooSymbol);
      const asset = this.toAsset(catalogItem);
      const result = await this.historyImportService.importAssetHistory({
        asset,
        provider: this.dataProvider,
        timeframes: this.timeframes,
        historyLimit: this.historyLimit
      });

      return {
        generatedAt: new Date().toISOString(),
        categoryId: "a-share",
        itemId,
        asset,
        barsImported: result.barsImported,
        firstBarAt: result.firstBarAt,
        latestBarAt: result.latestBarAt,
        source: "yahoo",
        failures: result.failures
      };
    });
  };

  private findCatalogItem = async (yahooSymbol: string): Promise<EastmoneyAshareCatalogItem> => {
    const catalogItem = (await this.catalogProvider.listCatalog()).find((item) => item.yahooSymbol === yahooSymbol);

    if (!catalogItem) {
      throw new Error(`未找到东方财富 A 股目录条目 ${yahooSymbol}`);
    }

    return catalogItem;
  };

  private getCatalogSymbol = (itemId: string): string => {
    const parts = itemId.split(":");
    const symbol = parts.at(-1)?.toUpperCase() ?? "";

    if (!/^\d{6}\.(SS|SZ)$/.test(symbol)) {
      throw new Error(`不支持的 A 股目录条目: ${itemId}`);
    }

    return symbol;
  };

  private toAsset = (item: EastmoneyAshareCatalogItem): AssetSummary => ({
    id: `cn-${this.toAssetIdToken(item.yahooSymbol)}`,
    symbol: item.yahooSymbol,
    name: item.label,
    assetType: item.assetType,
    market: "A 股",
    exchange: item.exchange,
    currency: item.currency,
    universe: "global",
    level: "company",
    parentId: "market-a-share",
    dataSource: "yahoo",
    vendorSymbol: item.yahooSymbol,
    tags: [...item.tags, "用户导入"]
  });

  private toAssetIdToken = (symbol: string): string => symbol.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  private runTrackedTask = async <Result,>(id: string, vendor: string, dataset: string, metadata: Record<string, unknown>, handler: () => Promise<Result>): Promise<Result> => {
    this.ingestionJobRepository.startJob(id, vendor, dataset, metadata);

    try {
      const result = await handler();
      this.ingestionJobRepository.finishJob(id, "success", null);
      return result;
    } catch (error) {
      this.ingestionJobRepository.finishJob(id, "failed", error instanceof Error ? error.message : "unknown task error");
      throw error;
    }
  };
}
