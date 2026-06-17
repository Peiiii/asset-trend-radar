import { BinanceCryptoCatalogProvider } from "@gold-insights/data-adapters";
import { LocalRawFileRepository, SqliteAssetRepository, SqliteDatabaseService, SqliteFundCatalogRepository, SqliteIngestionJobRepository, SqliteMarketDataRepository, SqliteScannerEventRepository, SqliteWatchlistRepository } from "@gold-insights/data-storage";
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
import { CryptoAssetDirectoryProvider } from "./asset-directory/crypto-asset-directory.provider";
import { CryptoAssetImportService } from "./asset-directory/crypto-asset-import.service";
import { FundAssetDirectoryProvider } from "./asset-directory/fund-asset-directory.provider";
import { TrendPoolAssetDirectoryProvider } from "./asset-directory/trend-pool-asset-directory.provider";
import { ChartWallQueryService } from "./chart-wall-query.service";
import { FundDiscoveryService } from "./fund-discovery.service";
import { IngestionWorkerService } from "./ingestion-worker.service";
import { LocalApiServerService } from "./local-api-server.service";
import { RuntimeTaskRecoveryService } from "./runtime-task-recovery.service";
import { TaskCenterService } from "./task-center.service";

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

    const queryService = new ChartWallQueryService(
      this.options,
      assetRepository,
      marketDataRepository,
      scannerEventRepository,
      ingestionJobRepository,
      watchlistRepository
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
    const cryptoCatalogProvider = new BinanceCryptoCatalogProvider();
    const cryptoAssetImportService = new CryptoAssetImportService(
      this.options.historyLimit,
      cryptoCatalogProvider,
      assetRepository,
      marketDataRepository,
      scannerEventRepository,
      ingestionJobRepository,
      rawFileRepository
    );
    const assetDirectoryService = new AssetDirectoryService([
      new FundAssetDirectoryProvider(this.fundDiscoveryService),
      new CryptoAssetDirectoryProvider(cryptoCatalogProvider, assetRepository, marketDataRepository, cryptoAssetImportService),
      new TrendPoolAssetDirectoryProvider({
        categoryId: "commodities",
        label: "商品目录",
        description: "真实已入库商品期货与商品 ETF 目录，先覆盖本地走势池。",
        assetTypes: ["commodity", "fund"],
        markets: ["商品"],
        marketFilters: ["商品"]
      }, assetRepository, marketDataRepository),
      new TrendPoolAssetDirectoryProvider({
        categoryId: "us-equity",
        label: "美股目录",
        description: "真实已入库美股指数、ETF 与重点公司目录。",
        assetTypes: ["index", "fund", "equity"],
        markets: ["美股"],
        marketFilters: ["美股"]
      }, assetRepository, marketDataRepository),
      new TrendPoolAssetDirectoryProvider({
        categoryId: "a-share",
        label: "A 股目录",
        description: "真实已入库 A 股指数、ETF 与重点公司目录。",
        assetTypes: ["index", "fund", "equity"],
        markets: ["A 股"],
        marketFilters: ["A 股"]
      }, assetRepository, marketDataRepository),
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
        description: "真实已入库宏观、外汇与债券代理指标目录。",
        assetTypes: ["macro", "fund"],
        markets: ["宏观", "外汇", "债券"],
        marketFilters: ["宏观", "外汇", "债券"]
      }, assetRepository, marketDataRepository)
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
