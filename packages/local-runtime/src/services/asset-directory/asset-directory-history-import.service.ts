import type { MarketDataProvider } from "@gold-insights/data-adapters";
import type { LocalRawFileRepository, SqliteAssetRepository, SqliteMarketDataRepository, SqliteScannerEventRepository } from "@gold-insights/data-storage";
import { calculateIndicators } from "@gold-insights/indicator-engine";
import type { AssetSummary, Timeframe } from "@gold-insights/market-domain";
import { toIsoDateTime } from "@gold-insights/market-domain";
import { ScannerEngineManager } from "@gold-insights/scanner-engine";

export type AssetDirectoryHistoryImportResult = {
  barsImported: number;
  firstBarAt: string | null;
  latestBarAt: string | null;
  failures: string[];
};

type AssetDirectoryHistoryImportRequest = {
  asset: AssetSummary;
  provider: MarketDataProvider;
  timeframes: Timeframe[];
  historyLimit: number;
};

export class AssetDirectoryHistoryImportService {
  public constructor(
    private readonly assetRepository: SqliteAssetRepository,
    private readonly marketDataRepository: SqliteMarketDataRepository,
    private readonly scannerEventRepository: SqliteScannerEventRepository,
    private readonly rawFileRepository: LocalRawFileRepository,
    private readonly scannerEngine = new ScannerEngineManager()
  ) {}

  public importAssetHistory = async ({ asset, provider, timeframes, historyLimit }: AssetDirectoryHistoryImportRequest): Promise<AssetDirectoryHistoryImportResult> => {
    const failures: string[] = [];
    let barsImported = 0;
    let firstBarAt: string | null = null;
    let latestBarAt: string | null = null;

    this.assetRepository.upsertAssets([asset]);

    for (const timeframe of timeframes) {
      try {
        const response = await provider.fetchBars({
          asset,
          timeframe,
          limit: timeframe === "1d" ? historyLimit : Math.min(220, historyLimit)
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
}
