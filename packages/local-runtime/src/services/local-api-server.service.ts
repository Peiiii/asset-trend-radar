import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AssetsController } from "../controllers/assets.controller";
import type { ChartWallController } from "../controllers/chart-wall.controller";
import type { CompareController } from "../controllers/compare.controller";
import type { DataHealthController } from "../controllers/data-health.controller";
import type { FundDiscoveryController } from "../controllers/fund-discovery.controller";
import type { RefreshController } from "../controllers/refresh.controller";
import type { ScannerController } from "../controllers/scanner.controller";
import type { TasksController } from "../controllers/tasks.controller";
import type { UniverseController } from "../controllers/universe.controller";
import type { WatchlistsController } from "../controllers/watchlists.controller";
import { ErrorResponseProvider } from "../providers/error-response.provider";
import { JsonResponseProvider } from "../providers/json-response.provider";
import { RequestContextProvider } from "../providers/request-context.provider";
import type { LocalRuntimeOptions } from "../types/local-runtime-options.types";

export class LocalApiServerService {
  private readonly server: Server;

  public constructor(
    private readonly options: LocalRuntimeOptions,
    private readonly chartWallController: ChartWallController,
    private readonly assetsController: AssetsController,
    private readonly dataHealthController: DataHealthController,
    private readonly universeController: UniverseController,
    private readonly scannerController: ScannerController,
    private readonly tasksController: TasksController,
    private readonly compareController: CompareController,
    private readonly watchlistsController: WatchlistsController,
    private readonly fundDiscoveryController: FundDiscoveryController,
    private readonly refreshController: RefreshController,
    private readonly requestContextProvider = new RequestContextProvider(),
    private readonly jsonResponseProvider = new JsonResponseProvider(),
    private readonly errorResponseProvider = new ErrorResponseProvider()
  ) {
    this.server = createServer((request, response) => {
      void this.handleRequest(request, response);
    });
  }

  public start = async (): Promise<string> =>
    new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.options.port, this.options.host, () => {
        this.server.off("error", reject);
        resolve(`http://${this.options.host}:${this.options.port}`);
      });
    });

  public stop = async (): Promise<void> =>
    new Promise((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

  private handleRequest = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    try {
      const url = this.requestContextProvider.getUrl(request);

      if (request.method === "OPTIONS") {
        this.jsonResponseProvider.writeNoContent(response);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/chart-wall") {
        this.chartWallController.handleChartWall(url, response);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/data-health") {
        this.dataHealthController.handleDataHealth(response);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/universe/tree") {
        this.universeController.handleUniverseTree(response);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/assets") {
        this.assetsController.handleAssets(url, response);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/scanner/events") {
        this.scannerController.handleEvents(url, response);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/tasks") {
        this.tasksController.handleTasks(url, response);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/compare") {
        this.compareController.handleCompare(url, response);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/watchlists") {
        this.watchlistsController.handleList(response);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/watchlists") {
        await this.watchlistsController.handleCreate(request, response);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/refresh") {
        await this.refreshController.handleRefresh(response);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/refresh/start") {
        this.refreshController.handleStartRefresh(response);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/funds/eastmoney/search") {
        await this.fundDiscoveryController.handleSearch(url, response);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/funds/eastmoney/catalog/summary") {
        this.fundDiscoveryController.handleCatalogSummary(response);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/funds/eastmoney/catalog") {
        await this.fundDiscoveryController.handleCatalogPage(url, response);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/funds/eastmoney/catalog/sync") {
        await this.fundDiscoveryController.handleCatalogSync(response);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/funds/eastmoney/import") {
        await this.fundDiscoveryController.handleImport(request, response);
        return;
      }

      const watchlistAssetMatch = /^\/api\/watchlists\/([^/]+)\/assets$/.exec(url.pathname);
      if (request.method === "POST" && watchlistAssetMatch) {
        await this.watchlistsController.handleAddAsset(watchlistAssetMatch[1], request, response);
        return;
      }

      const watchlistAssetDeleteMatch = /^\/api\/watchlists\/([^/]+)\/assets\/([^/]+)$/.exec(url.pathname);
      if (request.method === "DELETE" && watchlistAssetDeleteMatch) {
        this.watchlistsController.handleRemoveAsset(watchlistAssetDeleteMatch[1], watchlistAssetDeleteMatch[2], response);
        return;
      }

      const assetBarsMatch = /^\/api\/assets\/([^/]+)\/bars$/.exec(url.pathname);
      if (request.method === "GET" && assetBarsMatch) {
        const handled = this.assetsController.handleBars(assetBarsMatch[1], url, response);

        if (!handled) {
          this.errorResponseProvider.writeNotFound(response);
        }

        return;
      }

      const assetDetailMatch = /^\/api\/assets\/([^/]+)\/detail$/.exec(url.pathname);
      if (request.method === "GET" && assetDetailMatch) {
        const handled = this.assetsController.handleDetail(assetDetailMatch[1], url, response);

        if (!handled) {
          this.errorResponseProvider.writeNotFound(response);
        }

        return;
      }

      const assetIndicatorsMatch = /^\/api\/assets\/([^/]+)\/indicators$/.exec(url.pathname);
      if (request.method === "GET" && assetIndicatorsMatch) {
        const handled = this.assetsController.handleIndicators(assetIndicatorsMatch[1], url, response);

        if (!handled) {
          this.errorResponseProvider.writeNotFound(response);
        }

        return;
      }

      const assetMatch = /^\/api\/assets\/([^/]+)$/.exec(url.pathname);
      if (request.method === "GET" && assetMatch) {
        const handled = this.assetsController.handleAsset(assetMatch[1], response);

        if (!handled) {
          this.errorResponseProvider.writeNotFound(response);
        }

        return;
      }

      if (url.pathname.startsWith("/api/")) {
        this.errorResponseProvider.writeNotFound(response);
        return;
      }

      this.errorResponseProvider.writeNotFound(response);
    } catch (error) {
      this.errorResponseProvider.writeInternalError(response, error);
    }
  };
}
