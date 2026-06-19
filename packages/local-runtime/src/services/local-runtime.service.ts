import { BinanceCryptoCatalogProvider, CoinGeckoCryptoMarketsProvider, EastmoneyAshareCatalogProvider, NasdaqUsEquityCatalogProvider, NasdaqUsEquityValuationProvider, OpenExchangeRateProvider } from "@gold-insights/data-adapters";
import { LocalRawFileRepository, SqliteAssetRepository, SqliteDatabaseService, SqliteFundCatalogRepository, SqliteIngestionJobRepository, SqliteMarketDataRepository, SqliteProviderSnapshotRepository, SqliteScannerEventRepository, SqliteWatchlistRepository } from "@gold-insights/data-storage";
import { AssetDirectoryController } from "../controllers/asset-directory.controller";
import { AssetsController } from "../controllers/assets.controller";
import { ChartWallController } from "../controllers/chart-wall.controller";
import { CompareController } from "../controllers/compare.controller";
import { DataHealthController } from "../controllers/data-health.controller";
import { FundDiscoveryController } from "../controllers/fund-discovery.controller";
import { RefreshController } from "../controllers/refresh.controller";
import { ScannerController } from "../controllers/scanner.controller";
import { TasksController } from "../controllers/tasks.controller";
import { UniverseController } from "../controllers/universe.controller";
import { WatchlistsController } from "../controllers/watchlists.controller";
import { assetUniverse, tradableAssetUniverse } from "../configs/asset-universe.config";
import type { LocalRuntimeOptions, LocalRuntimeStartResult } from "../types/local-runtime-options.types";
import { AssetDirectoryService } from "./asset-directory.service";
import { AssetValuationNormalizationService } from "./asset-valuation-normalization.service";
import { AssetDirectoryHistoryImportService } from "./asset-directory/asset-directory-history-import.service";
import { CryptoAssetDirectoryProvider } from "./asset-directory/crypto-asset-directory.provider";
import { CryptoAssetDirectorySnapshotService } from "./asset-directory/crypto/crypto-asset-directory-snapshot.service";
import { CryptoAssetImportService } from "./asset-directory/crypto-asset-import.service";
import { EastmoneyAshareDirectoryProvider } from "./asset-directory/a-share/eastmoney-a-share-directory.provider";
import { EastmoneyAshareDirectorySnapshotService } from "./asset-directory/a-share/eastmoney-a-share-directory-snapshot.service";
import { EastmoneyAshareImportService } from "./asset-directory/a-share/eastmoney-a-share-import.service";
import { FundAssetDirectoryProvider } from "./asset-directory/fund-asset-directory.provider";
import { NasdaqUsEquityDirectoryProvider } from "./asset-directory/nasdaq-us-equity-directory.provider";
import { NasdaqUsEquityDirectorySnapshotService } from "./asset-directory/nasdaq/nasdaq-us-equity-directory-snapshot.service";
import { NasdaqUsEquityImportService } from "./asset-directory/nasdaq-us-equity-import.service";
import { TrendPoolAssetDirectoryProvider } from "./asset-directory/trend-pool-asset-directory.provider";
import { TrendPoolAssetValuationService } from "./asset-directory/valuation/trend-pool-asset-valuation.service";
import { ChartWallQueryService } from "./chart-wall-query.service";
import { ChartWallValuationService } from "./chart-wall-valuation.service";
import { FundDiscoveryService } from "./fund-discovery.service";
import { IngestionWorkerService } from "./ingestion-worker.service";
import { LocalApiServerService } from "./local-api-server.service";
import { RuntimeTaskRecoveryService } from "./runtime-task-recovery.service";
import { TaskCenterService } from "./task-center.service";
import { NasdaqAssetValuationService } from "./valuation/nasdaq-asset-valuation.service";

export class LocalRuntimeService {
  private readonly databaseService: SqliteDatabaseService;
  private readonly ingestionWorkerService: IngestionWorkerService;
  private readonly fundDiscoveryService: FundDiscoveryService;
  private readonly apiServerService: LocalApiServerService;
  private readonly taskRecoveryService: RuntimeTaskRecoveryService;

  public constructor(private readonly options: LocalRuntimeOptions) {
    this.databaseService = new SqliteDatabaseService(this.options.databasePath);
    const connection = this.databaseService.getConnection();
    const assetRepository = new SqliteAssetRepository(connection);
    const marketDataRepository = new SqliteMarketDataRepository(connection);
    const scannerEventRepository = new SqliteScannerEventRepository(connection);
    const ingestionJobRepository = new SqliteIngestionJobRepository(connection);
    const watchlistRepository = new SqliteWatchlistRepository(connection);
    const fundCatalogRepository = new SqliteFundCatalogRepository(connection);
    const providerSnapshotRepository = new SqliteProviderSnapshotRepository(connection);
    const rawFileRepository = new LocalRawFileRepository(this.options.rawDataPath);
    this.taskRecoveryService = new RuntimeTaskRecoveryService(ingestionJobRepository);

    this.ingestionWorkerService = new IngestionWorkerService(
      assetUniverse,
      tradableAssetUniverse,
      this.options.historyLimit,
      assetRepository,
      marketDataRepository,
      scannerEventRepository,
      ingestionJobRepository,
      rawFileRepository
    );

    const cryptoCatalogProvider = new BinanceCryptoCatalogProvider();
    const cryptoMarketsProvider = new CoinGeckoCryptoMarketsProvider();
    const cryptoAssetDirectorySnapshotService = new CryptoAssetDirectorySnapshotService(providerSnapshotRepository);
    const nasdaqUsEquityCatalogProvider = new NasdaqUsEquityCatalogProvider();
    const nasdaqUsEquityValuationProvider = new NasdaqUsEquityValuationProvider();
    const nasdaqUsEquityDirectorySnapshotService = new NasdaqUsEquityDirectorySnapshotService(providerSnapshotRepository);
    const eastmoneyAshareCatalogProvider = new EastmoneyAshareCatalogProvider();
    const eastmoneyAshareDirectorySnapshotService = new EastmoneyAshareDirectorySnapshotService(providerSnapshotRepository);
    const exchangeRateProvider = new OpenExchangeRateProvider();
    const valuationNormalizationService = new AssetValuationNormalizationService(exchangeRateProvider);
    const nasdaqAssetValuationService = new NasdaqAssetValuationService(nasdaqUsEquityValuationProvider, providerSnapshotRepository);
    const trendPoolAssetValuationService = new TrendPoolAssetValuationService(nasdaqAssetValuationService, valuationNormalizationService);
    const chartWallValuationService = new ChartWallValuationService(cryptoMarketsProvider, eastmoneyAshareCatalogProvider, nasdaqAssetValuationService, valuationNormalizationService);
    const queryService = new ChartWallQueryService(
      this.options,
      assetRepository,
      marketDataRepository,
      scannerEventRepository,
      ingestionJobRepository,
      watchlistRepository,
      chartWallValuationService
    );
    this.fundDiscoveryService = new FundDiscoveryService(
      this.options.historyLimit,
      assetRepository,
      marketDataRepository,
      scannerEventRepository,
      fundCatalogRepository,
      ingestionJobRepository,
      rawFileRepository
    );
    const assetDirectoryHistoryImportService = new AssetDirectoryHistoryImportService(
      assetRepository,
      marketDataRepository,
      scannerEventRepository,
      rawFileRepository
    );
    const cryptoAssetImportService = new CryptoAssetImportService(
      this.options.historyLimit,
      cryptoCatalogProvider,
      ingestionJobRepository,
      assetDirectoryHistoryImportService
    );
    const nasdaqUsEquityImportService = new NasdaqUsEquityImportService(
      this.options.historyLimit,
      nasdaqUsEquityCatalogProvider,
      ingestionJobRepository,
      assetDirectoryHistoryImportService
    );
    const eastmoneyAshareImportService = new EastmoneyAshareImportService(
      this.options.historyLimit,
      eastmoneyAshareCatalogProvider,
      ingestionJobRepository,
      assetDirectoryHistoryImportService
    );
    const assetDirectoryService = new AssetDirectoryService([
      new FundAssetDirectoryProvider(this.fundDiscoveryService),
      new CryptoAssetDirectoryProvider(cryptoCatalogProvider, cryptoMarketsProvider, cryptoAssetDirectorySnapshotService, assetRepository, marketDataRepository, cryptoAssetImportService),
      new TrendPoolAssetDirectoryProvider({
        categoryId: "commodities",
        label: "商品目录",
        description: "真实已入库商品期货与商品 ETF 目录；ETF 规模来自 Nasdaq 快照，期货只展示走势。",
        assetTypes: ["commodity", "fund"],
        markets: ["商品"],
        marketFilters: ["商品"]
      }, assetRepository, marketDataRepository, trendPoolAssetValuationService),
      new NasdaqUsEquityDirectoryProvider(nasdaqUsEquityCatalogProvider, nasdaqUsEquityValuationProvider, nasdaqUsEquityDirectorySnapshotService, assetRepository, marketDataRepository, nasdaqUsEquityImportService),
      new EastmoneyAshareDirectoryProvider(eastmoneyAshareCatalogProvider, eastmoneyAshareDirectorySnapshotService, assetRepository, marketDataRepository, eastmoneyAshareImportService),
      new TrendPoolAssetDirectoryProvider({
        categoryId: "hk-equity",
        label: "港股目录",
        description: "真实已入库港股指数、ETF 与重点公司目录。",
        assetTypes: ["index", "fund", "equity"],
        markets: ["港股"],
        marketFilters: ["港股"]
      }, assetRepository, marketDataRepository),
      new TrendPoolAssetDirectoryProvider({
        categoryId: "macro",
        label: "宏观目录",
        description: "真实已入库宏观、外汇与债券代理指标目录；USD 债券 ETF 规模来自 Nasdaq 快照。",
        assetTypes: ["macro", "fund"],
        markets: ["宏观", "外汇", "债券"],
        marketFilters: ["宏观", "外汇", "债券"]
      }, assetRepository, marketDataRepository, trendPoolAssetValuationService)
    ]);
    const taskCenterService = new TaskCenterService(ingestionJobRepository);

    this.apiServerService = new LocalApiServerService(
      this.options,
      new ChartWallController(queryService),
      new AssetsController(queryService, assetRepository),
      new DataHealthController(queryService),
      new UniverseController(queryService),
      new ScannerController(queryService),
      new TasksController(taskCenterService),
      new CompareController(queryService),
      new WatchlistsController(queryService),
      new AssetDirectoryController(assetDirectoryService),
      new FundDiscoveryController(this.fundDiscoveryService),
      new RefreshController(this.ingestionWorkerService)
    );
  }

  public start = async (): Promise<LocalRuntimeStartResult> => {
    const recoveredTaskCount = this.taskRecoveryService.recoverInterruptedTasks();
    if (recoveredTaskCount > 0) {
      console.warn(`Recovered ${recoveredTaskCount} interrupted runtime task(s).`);
    }

    const url = await this.apiServerService.start();

    if (this.options.refreshOnStart) {
      void this.ingestionWorkerService.runOnce().catch((error) => {
        console.error(error);
      });
    }

    void this.fundDiscoveryService.syncCatalogIfEmpty().catch((error) => {
      console.error(error);
    });

    return {
      url,
      databasePath: this.options.databasePath,
      rawDataPath: this.options.rawDataPath
    };
  };

  public stop = async (): Promise<void> => {
    await this.apiServerService.stop();
    this.databaseService.close();
  };
}
