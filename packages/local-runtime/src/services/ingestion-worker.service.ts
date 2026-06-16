import { BinanceMarketDataProvider, EastmoneyFundDataProvider, YahooMarketDataProvider, type MarketDataProvider } from "@gold-insights/data-adapters";
import { calculateIndicators } from "@gold-insights/indicator-engine";
import type { AssetSummary, RuntimeTaskStartResponse, Timeframe } from "@gold-insights/market-domain";
import type { LocalRawFileRepository, SqliteAssetRepository, SqliteIngestionJobRepository, SqliteMarketDataRepository, SqliteScannerEventRepository } from "@gold-insights/data-storage";
import { ScannerEngineManager } from "@gold-insights/scanner-engine";

type AssetIngestionResult = {
  successCount: number;
  failures: string[];
};

export class IngestionWorkerService {
  private readonly providers = new Map<string, MarketDataProvider>([
    ["binance", new BinanceMarketDataProvider()],
    ["eastmoney", new EastmoneyFundDataProvider()],
    ["yahoo", new YahooMarketDataProvider()]
  ]);
  private readonly timeframes: Timeframe[] = ["1d", "15m", "1h", "4h"];
  private readonly assetConcurrency = 4;
  private currentRun: Promise<void> | null = null;
  private currentRunTaskId: string | null = null;

  public constructor(
    private readonly assets: AssetSummary[],
    private readonly marketDataAssets: AssetSummary[],
    private readonly historyLimit: number,
    private readonly assetRepository: SqliteAssetRepository,
    private readonly marketDataRepository: SqliteMarketDataRepository,
    private readonly scannerEventRepository: SqliteScannerEventRepository,
    private readonly ingestionJobRepository: SqliteIngestionJobRepository,
    private readonly rawFileRepository: LocalRawFileRepository,
    private readonly scannerEngine = new ScannerEngineManager()
  ) {}

  public runOnce = async (): Promise<void> => {
    if (this.currentRun) {
      return this.currentRun;
    }

    await this.startRun(this.createGlobalJobId());
  };

  public startInBackground = (): RuntimeTaskStartResponse => {
    if (this.currentRun && this.currentRunTaskId) {
      return this.toTaskStartResponse(this.currentRunTaskId, "already_running");
    }

    const jobId = this.createGlobalJobId();
    void this.startRun(jobId).catch((error) => {
      console.error(error);
    });

    return this.toTaskStartResponse(jobId, "accepted");
  };

  private startRun = async (jobId: string): Promise<void> => {
    const run = this.runIngestion(jobId);
    this.currentRun = run;
    this.currentRunTaskId = jobId;

    try {
      await run;
    } finally {
      if (this.currentRun === run) {
        this.currentRun = null;
        this.currentRunTaskId = null;
      }
    }
  };

  private runIngestion = async (jobId: string): Promise<void> => {
    this.ingestionJobRepository.startJob(jobId, "multi-source", "global-bars-1d", {
      assetCount: this.assets.length,
      marketDataAssetCount: this.marketDataAssets.length,
      historyLimit: this.historyLimit
    });

    try {
      this.assetRepository.upsertAssets(this.assets);
      const results = await this.mapWithConcurrency(this.marketDataAssets, this.assetConcurrency, this.ingestAsset);
      const failures = results.flatMap((result) => result.failures);
      const successCount = results.reduce((sum, result) => sum + result.successCount, 0);

      if (successCount === 0) {
        throw new Error(`all market data fetches failed: ${failures.join("; ")}`);
      }

      this.ingestionJobRepository.finishJob(jobId, "success", failures.length > 0 ? `partial failures: ${failures.slice(0, 10).join("; ")}` : null);
    } catch (error) {
      this.ingestionJobRepository.finishJob(jobId, "failed", error instanceof Error ? error.message : "unknown ingestion error");
      throw error;
    }
  };

  private ingestAsset = async (asset: AssetSummary): Promise<AssetIngestionResult> => {
    const provider = this.providers.get(asset.dataSource ?? "yahoo");
    const failures: string[] = [];
    let successCount = 0;

    if (!provider) {
      return {
        successCount,
        failures: [`${asset.id}: provider not configured`]
      };
    }

    for (const timeframe of this.getTimeframesForAsset(asset)) {
      try {
        const response = await provider.fetchBars({
          asset,
          timeframe,
          limit: timeframe === "1d" ? this.historyLimit : Math.min(220, this.historyLimit)
        });

        if (response.bars.length < 20 && timeframe === "1d") {
          failures.push(`${asset.id}/${timeframe}: insufficient bars ${response.bars.length}`);
          continue;
        }

        const indicators = calculateIndicators(response.bars);
        const events = timeframe === "1d" ? this.scannerEngine.createEvents(asset.id, response.bars, indicators) : [];

        this.rawFileRepository.appendRecords(response.source, `bars-${timeframe}`, asset.id, response.rawRecords);
        this.marketDataRepository.upsertBars(response.bars);
        this.marketDataRepository.upsertIndicators(indicators);
        if (timeframe === "1d") {
          this.scannerEventRepository.replaceEventsForAsset(asset.id, events);
          successCount += 1;
        }
      } catch (error) {
        failures.push(`${asset.id}/${timeframe}: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }

    return {
      successCount,
      failures
    };
  };

  private mapWithConcurrency = async <Item, Result>(
    items: Item[],
    concurrency: number,
    handler: (item: Item) => Promise<Result>
  ): Promise<Result[]> => {
    const results: Result[] = [];
    let nextIndex = 0;

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await handler(items[currentIndex]);
      }
    });

    await Promise.all(workers);
    return results;
  };

  private getTimeframesForAsset = (asset: AssetSummary): Timeframe[] => (asset.dataSource === "eastmoney" ? ["1d"] : this.timeframes);

  private createGlobalJobId = (): string => `global-daily-${Date.now()}`;

  private toTaskStartResponse = (taskId: string, status: RuntimeTaskStartResponse["status"]): RuntimeTaskStartResponse => ({
    generatedAt: new Date().toISOString(),
    taskId,
    status,
    label: "全市场行情同步",
    message: status === "accepted" ? "全市场行情同步已在后台启动" : "全市场行情同步已在后台运行"
  });
}
