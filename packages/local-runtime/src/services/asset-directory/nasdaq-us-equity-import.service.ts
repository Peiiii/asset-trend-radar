import { YahooMarketDataProvider, type NasdaqUsEquityCatalogItem, type NasdaqUsEquityCatalogProvider } from "@gold-insights/data-adapters";
import type { SqliteIngestionJobRepository } from "@gold-insights/data-storage";
import type { AssetDirectoryImportResponse, AssetSummary, Timeframe } from "@gold-insights/market-domain";
import type { AssetDirectoryHistoryImportService } from "./asset-directory-history-import.service";

export class NasdaqUsEquityImportService {
  private readonly dataProvider = new YahooMarketDataProvider();
  private readonly timeframes: Timeframe[] = ["1d", "15m", "1h", "4h"];

  public constructor(
    private readonly historyLimit: number,
    private readonly catalogProvider: NasdaqUsEquityCatalogProvider,
    private readonly ingestionJobRepository: SqliteIngestionJobRepository,
    private readonly historyImportService: AssetDirectoryHistoryImportService
  ) {}

  public importItem = async (itemId: string): Promise<AssetDirectoryImportResponse> => {
    const yahooSymbol = this.getCatalogSymbol(itemId);
    const jobId = `us-equity-import-${this.toAssetIdToken(yahooSymbol)}-${Date.now()}`;

    return this.runTrackedTask(jobId, "nasdaq-trader", `us-equity-import:${yahooSymbol}`, { symbol: yahooSymbol, itemId }, async () => {
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
        categoryId: "us-equity",
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

  private findCatalogItem = async (yahooSymbol: string): Promise<NasdaqUsEquityCatalogItem> => {
    const catalogItem = (await this.catalogProvider.listCatalog()).find((item) => item.yahooSymbol === yahooSymbol);

    if (!catalogItem) {
      throw new Error(`未找到 NASDAQ 美股目录条目 ${yahooSymbol}`);
    }

    return catalogItem;
  };

  private getCatalogSymbol = (itemId: string): string => {
    const parts = itemId.split(":");
    const symbol = parts.at(-1)?.toUpperCase() ?? "";

    if (!/^[A-Z0-9-]{1,16}$/.test(symbol)) {
      throw new Error(`不支持的美股目录条目: ${itemId}`);
    }

    return symbol;
  };

  private toAsset = (item: NasdaqUsEquityCatalogItem): AssetSummary => ({
    id: `us-${this.toAssetIdToken(item.yahooSymbol)}`,
    symbol: item.yahooSymbol,
    name: item.label,
    assetType: item.assetType,
    market: "美股",
    exchange: item.exchange,
    currency: item.currency,
    universe: "global",
    level: item.assetType === "fund" ? "instrument" : "company",
    parentId: item.assetType === "fund" ? "market-us-fund" : "market-us-equity",
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
