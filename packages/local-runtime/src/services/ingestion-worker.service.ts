import { BinanceMarketDataProvider, EastmoneyFundDataProvider, YahooMarketDataProvider, type MarketDataProvider } from "@gold-insights/data-adapters";
import { calculateIndicators } from "@gold-insights/indicator-engine";
import type { AssetSummary, Timeframe } from "@gold-insights/market-domain";
import type { LocalRawFileRepository, SqliteAssetRepository, SqliteIngestionJobRepository, SqliteMarketDataRepository, SqliteScannerEventRepository } from "@gold-insights/data-storage";
import { ScannerEngineManager } from "@gold-insights/scanner-engine";

export class IngestionWorkerService {
  private readonly providers = new Map<string, MarketDataProvider>([
    ["binance", new BinanceMarketDataProvider()],
    ["eastmoney", new EastmoneyFundDataProvider()],
    ["yahoo", new YahooMarketDataProvider()]
  ]);
  private readonly timeframes: Timeframe[] = ["1d", "15m", "1h", "4h"];
  private currentRun: Promise<void> | null = null;

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

    this.currentRun = this.runIngestion();

    try {
      await this.currentRun;
    } finally {
      this.currentRun = null;
    }
  };

  private runIngestion = async (): Promise<void> => {
    const jobId = `global-daily-${Date.now()}`;
    this.ingestionJobRepository.startJob(jobId, "multi-source", "global-bars-1d", {
      assetCount: this.assets.length,
      marketDataAssetCount: this.marketDataAssets.length,
      historyLimit: this.historyLimit
    });

    try {
      this.assetRepository.upsertAssets(this.assets);
      const failures: string[] = [];
      let successCount = 0;

      for (const asset of this.marketDataAssets) {
        const provider = this.providers.get(asset.dataSource ?? "yahoo");

        if (!provider) {
          failures.push(`${asset.id}: provider not configured`);
          continue;
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
      }

      if (successCount === 0) {
        throw new Error(`all market data fetches failed: ${failures.join("; ")}`);
      }

      this.ingestionJobRepository.finishJob(jobId, "success", failures.length > 0 ? `partial failures: ${failures.slice(0, 10).join("; ")}` : null);
    } catch (error) {
      this.ingestionJobRepository.finishJob(jobId, "failed", error instanceof Error ? error.message : "unknown ingestion error");
      throw error;
    }
  };

  private getTimeframesForAsset = (asset: AssetSummary): Timeframe[] => (asset.dataSource === "eastmoney" ? ["1d"] : this.timeframes);
}
