import { BinanceMarketDataProvider, type BinanceCryptoCatalogItem, type BinanceCryptoCatalogProvider } from "@gold-insights/data-adapters";
import type { LocalRawFileRepository, SqliteAssetRepository, SqliteIngestionJobRepository, SqliteMarketDataRepository, SqliteScannerEventRepository } from "@gold-insights/data-storage";
import { calculateIndicators } from "@gold-insights/indicator-engine";
import type { AssetDirectoryImportResponse, AssetSummary, Timeframe } from "@gold-insights/market-domain";
import { toIsoDateTime } from "@gold-insights/market-domain";
import { ScannerEngineManager } from "@gold-insights/scanner-engine";
import { getCryptoAssetLabel } from "./crypto-asset-labels.config";

export class CryptoAssetImportService {
  private readonly dataProvider = new BinanceMarketDataProvider();
  private readonly timeframes: Timeframe[] = ["1d", "15m", "1h", "4h"];

  public constructor(
    private readonly historyLimit: number,
    private readonly catalogProvider: BinanceCryptoCatalogProvider,
    private readonly assetRepository: SqliteAssetRepository,
    private readonly marketDataRepository: SqliteMarketDataRepository,
    private readonly scannerEventRepository: SqliteScannerEventRepository,
    private readonly ingestionJobRepository: SqliteIngestionJobRepository,
    private readonly rawFileRepository: LocalRawFileRepository,
    private readonly scannerEngine = new ScannerEngineManager()
  ) {}

  public importItem = async (itemId: string): Promise<AssetDirectoryImportResponse> => {
    const symbol = this.getCatalogSymbol(itemId);
    const jobId = `crypto-import-${symbol.toLowerCase()}-${Date.now()}`;

    return this.runTrackedTask(jobId, "binance", `crypto-import:${symbol}`, { symbol, itemId }, async () => {
      const catalogItem = await this.findCatalogItem(symbol);
      const asset = this.toAsset(catalogItem);
      const result = await this.importAssetHistory(asset);

      return {
        generatedAt: new Date().toISOString(),
        categoryId: "crypto",
        itemId,
        asset,
        barsImported: result.barsImported,
        firstBarAt: result.firstBarAt,
        latestBarAt: result.latestBarAt,
        source: "binance",
        failures: result.failures
      };
    });
  };

  private importAssetHistory = async (asset: AssetSummary): Promise<{ barsImported: number; firstBarAt: string | null; latestBarAt: string | null; failures: string[] }> => {
    const failures: string[] = [];
    let barsImported = 0;
    let firstBarAt: string | null = null;
    let latestBarAt: string | null = null;

    this.assetRepository.upsertAssets([asset]);

    for (const timeframe of this.timeframes) {
      try {
        const response = await this.dataProvider.fetchBars({
          asset,
          timeframe,
          limit: timeframe === "1d" ? this.historyLimit : Math.min(220, this.historyLimit)
        });

        if (response.bars.length === 0) {
          failures.push(`${asset.id}/${timeframe}: no bars returned`);
          continue;
        }

        const indicators = calculateIndicators(response.bars);
        const events = timeframe === "1d" ? this.scannerEngine.createEvents(asset.id, response.bars, indicators) : [];

        this.rawFileRepository.appendRecords(response.source, `bars-${timeframe}`, asset.id, response.rawRecords);
        this.marketDataRepository.upsertBars(response.bars);
        this.marketDataRepository.upsertIndicators(indicators);

        if (timeframe === "1d") {
          this.scannerEventRepository.replaceEventsForAsset(asset.id, events);
          barsImported = response.bars.length;
          firstBarAt = toIsoDateTime(response.bars[0]?.ts ?? null);
          latestBarAt = toIsoDateTime(response.bars.at(-1)?.ts ?? null);
        }
      } catch (error) {
        failures.push(`${asset.id}/${timeframe}: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }

    if (barsImported === 0) {
      throw new Error(`${asset.symbol} 没有成功导入日线数据: ${failures.join("; ")}`);
    }

    return {
      barsImported,
      firstBarAt,
      latestBarAt,
      failures
    };
  };

  private findCatalogItem = async (symbol: string): Promise<BinanceCryptoCatalogItem> => {
    const catalogItem = (await this.catalogProvider.listUsdtSpotCatalog()).find((item) => item.symbol === symbol);

    if (!catalogItem) {
      throw new Error(`未找到 Binance 交易对 ${symbol}`);
    }

    return catalogItem;
  };

  private getCatalogSymbol = (itemId: string): string => {
    const parts = itemId.split(":");
    const symbol = parts.at(-1)?.toUpperCase() ?? "";

    if (!/^[A-Z0-9]+USDT$/.test(symbol)) {
      throw new Error(`不支持的加密目录条目: ${itemId}`);
    }

    return symbol;
  };

  private toAsset = (item: BinanceCryptoCatalogItem): AssetSummary => ({
    id: `crypto-binance-${item.symbol.toLowerCase()}`,
    symbol: item.displaySymbol,
    name: getCryptoAssetLabel(item.baseAsset),
    assetType: "crypto",
    market: "加密",
    exchange: item.exchange,
    currency: item.quoteAsset,
    universe: "global",
    level: "instrument",
    parentId: "market-crypto",
    dataSource: "binance",
    vendorSymbol: item.symbol,
    tags: [item.baseAsset, item.quoteAsset, "Binance", "用户导入"]
  });

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
