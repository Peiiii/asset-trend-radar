import { LocalRawFileRepository, SqliteAssetRepository, SqliteDatabaseService, SqliteFundCatalogRepository, SqliteIngestionJobRepository, SqliteMarketDataRepository, SqliteScannerEventRepository, SqliteWatchlistRepository } from "@gold-insights/data-storage";
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
import { ChartWallQueryService } from "./chart-wall-query.service";
import { FundDiscoveryService } from "./fund-discovery.service";
import { IngestionWorkerService } from "./ingestion-worker.service";
import { LocalApiServerService } from "./local-api-server.service";
import { TaskCenterService } from "./task-center.service";

export class LocalRuntimeService {
  private readonly databaseService: SqliteDatabaseService;
  private readonly ingestionWorkerService: IngestionWorkerService;
  private readonly fundDiscoveryService: FundDiscoveryService;
  private readonly apiServerService: LocalApiServerService;

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
      new FundDiscoveryController(this.fundDiscoveryService),
      new RefreshController(this.ingestionWorkerService)
    );
  }

  public start = async (): Promise<LocalRuntimeStartResult> => {
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
