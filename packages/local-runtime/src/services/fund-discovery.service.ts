import { EastmoneyFundCatalogProvider, EastmoneyFundDataProvider, EastmoneyFundRankProvider, EastmoneyFundSearchProvider } from "@gold-insights/data-adapters";
import type { FundCatalogPageRecord, LocalRawFileRepository, SqliteAssetRepository, SqliteFundCatalogRepository, SqliteIngestionJobRepository, SqliteMarketDataRepository, SqliteScannerEventRepository } from "@gold-insights/data-storage";
import { calculateIndicators } from "@gold-insights/indicator-engine";
import type { AssetSummary, FundCatalogEntry, FundCatalogImportStatus, FundCatalogPageItem, FundCatalogPageResponse, FundCatalogSortKey, FundCatalogSummaryResponse, FundCatalogSyncResponse, FundImportResponse, FundSearchResponse, FundSearchResult, OhlcvBar, SortOrder } from "@gold-insights/market-domain";
import { dayMs, toIsoDateTime } from "@gold-insights/market-domain";
import { ScannerEngineManager } from "@gold-insights/scanner-engine";

type ImportedFundCatalogMetrics = Omit<FundCatalogPageItem, keyof FundCatalogEntry | "assetId" | "isImported" | "metricSource">;

export class FundDiscoveryService {
  private metricSyncPromise: Promise<number> | null = null;

  public constructor(
    private readonly historyLimit: number,
    private readonly assetRepository: SqliteAssetRepository,
    private readonly marketDataRepository: SqliteMarketDataRepository,
    private readonly scannerEventRepository: SqliteScannerEventRepository,
    private readonly fundCatalogRepository: SqliteFundCatalogRepository,
    private readonly ingestionJobRepository: SqliteIngestionJobRepository,
    private readonly rawFileRepository: LocalRawFileRepository,
    private readonly catalogProvider = new EastmoneyFundCatalogProvider(),
    private readonly rankProvider = new EastmoneyFundRankProvider(),
    private readonly searchProvider = new EastmoneyFundSearchProvider(),
    private readonly dataProvider = new EastmoneyFundDataProvider(),
    private readonly scannerEngine = new ScannerEngineManager()
  ) {}

  public searchFunds = async (keyword: string, limit = 20): Promise<FundSearchResponse> => {
    const normalizedKeyword = keyword.trim();
    const catalogSummary = this.fundCatalogRepository.getSummary();

    if (normalizedKeyword.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        keyword: normalizedKeyword,
        catalog: catalogSummary,
        matchedCount: 0,
        source: "local-catalog",
        results: []
      };
    }

    if (catalogSummary.totalCount === 0) {
      await this.syncCatalog();
    }

    const catalogResults = this.fundCatalogRepository.search(normalizedKeyword, limit);

    if (catalogResults.length > 0) {
      const nextSummary = this.fundCatalogRepository.getSummary();
      return {
        generatedAt: new Date().toISOString(),
        keyword: normalizedKeyword,
        catalog: nextSummary,
        matchedCount: catalogResults.length,
        source: "local-catalog",
        results: catalogResults.map(this.catalogEntryToSearchResult)
      };
    }

    const results = await this.searchProvider.searchFunds(normalizedKeyword, limit);
    return {
      generatedAt: new Date().toISOString(),
      keyword: normalizedKeyword,
      catalog: this.fundCatalogRepository.getSummary(),
      matchedCount: results.length,
      source: "remote-suggest",
      results
    };
  };

  public getCatalogSummary = (): FundCatalogSummaryResponse => ({
    generatedAt: new Date().toISOString(),
    summary: this.fundCatalogRepository.getSummary()
  });

  public listCatalogPage = async ({
    keyword,
    fundType,
    status,
    sort,
    order,
    limit,
    offset
  }: {
    keyword: string;
    fundType: string;
    status: FundCatalogImportStatus;
    sort: FundCatalogSortKey;
    order: SortOrder;
    limit: number;
    offset: number;
  }): Promise<FundCatalogPageResponse> => {
    await this.syncCatalogIfEmpty();
    await this.syncCatalogMetricsIfStale();

    const page = this.fundCatalogRepository.listPage({
      keyword,
      fundType,
      status,
      sort,
      order,
      limit,
      offset
    });
    const metricsByAssetId = this.getImportedMetrics(page.items.filter((item) => item.assetId).map((item) => String(item.assetId)));

    return {
      generatedAt: new Date().toISOString(),
      catalog: this.fundCatalogRepository.getSummary(),
      keyword,
      fundType,
      status,
      sort,
      order,
      limit,
      offset,
      totalCount: page.totalCount,
      importedTotalCount: page.importedTotalCount,
      items: page.items.map((item) => this.toCatalogPageItem(item, metricsByAssetId.get(item.assetId ?? ""))),
      fundTypes: this.fundCatalogRepository.listFundTypeFacets(keyword, status),
      statusFacets: this.fundCatalogRepository.listStatusFacets(keyword, fundType)
    };
  };

  public syncCatalog = async (): Promise<FundCatalogSyncResponse> => {
    const jobId = `fund-catalog-${Date.now()}`;
    return this.runTrackedTask(jobId, "eastmoney", "fund-catalog", { source: "eastmoney" }, async () => {
      const entries = await this.catalogProvider.fetchCatalog();
      const insertedOrUpdated = this.fundCatalogRepository.upsertEntries(entries);
      const metricSnapshotsUpdated = await this.syncCatalogMetrics();

      return {
        generatedAt: new Date().toISOString(),
        summary: this.fundCatalogRepository.getSummary(),
        insertedOrUpdated,
        metricSnapshotsUpdated
      };
    });
  };

  public syncCatalogIfEmpty = async (): Promise<void> => {
    if (this.fundCatalogRepository.getSummary().totalCount > 0) {
      return;
    }

    await this.syncCatalog();
  };

  private syncCatalogMetricsIfStale = async (): Promise<void> => {
    const metricSyncedAt = this.fundCatalogRepository.getSummary().metricSyncedAt;

    if (metricSyncedAt && Date.now() - Date.parse(metricSyncedAt) < 6 * 60 * 60 * 1000) {
      return;
    }

    try {
      await this.syncCatalogMetrics();
    } catch {
      // Keep the directory usable when the lightweight rank snapshot is temporarily unavailable.
    }
  };

  private syncCatalogMetrics = async (): Promise<number> => {
    if (this.metricSyncPromise) {
      return this.metricSyncPromise;
    }

    this.metricSyncPromise = this.rankProvider
      .fetchSnapshots()
      .then((snapshots) => this.fundCatalogRepository.upsertMetricSnapshots(snapshots))
      .finally(() => {
        this.metricSyncPromise = null;
      });

    return this.metricSyncPromise;
  };

  public importEastmoneyFund = async (code: string): Promise<FundImportResponse> => {
    const normalizedCode = this.normalizeCode(code);
    const jobId = `fund-import-${normalizedCode}-${Date.now()}`;

    return this.runTrackedTask(jobId, "eastmoney", `fund-import:${normalizedCode}`, { code: normalizedCode }, async () => {
      const searchResult = await this.findFundByCode(normalizedCode);
      const asset = this.toAsset(searchResult ?? {
        code: normalizedCode,
        name: normalizedCode,
        fundType: null,
        company: null,
        managers: [],
        latestNav: null,
        latestNavDate: null,
        themes: [],
        canBuy: false
      });
      const response = await this.dataProvider.fetchBars({
        asset,
        timeframe: "1d",
        limit: this.historyLimit
      });
      const indicators = calculateIndicators(response.bars);
      const events = this.scannerEngine.createEvents(asset.id, response.bars, indicators);

      this.assetRepository.upsertAssets([asset]);
      this.rawFileRepository.appendRecords(response.source, "bars-1d", asset.id, response.rawRecords);
      this.marketDataRepository.upsertBars(response.bars);
      this.marketDataRepository.upsertIndicators(indicators);
      this.scannerEventRepository.replaceEventsForAsset(asset.id, events);

      return {
        generatedAt: new Date().toISOString(),
        asset,
        barsImported: response.bars.length,
        firstBarAt: toIsoDateTime(response.bars[0]?.ts ?? null),
        latestBarAt: toIsoDateTime(response.bars.at(-1)?.ts ?? null),
        source: response.source,
        searchResult
      };
    });
  };

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

  private findFundByCode = async (code: string): Promise<FundSearchResult | null> => {
    const remoteResults = await this.searchProvider.searchFunds(code, 10);
    const remoteResult = remoteResults.find((result) => result.code === code) ?? remoteResults[0] ?? null;

    if (remoteResult) {
      return remoteResult;
    }

    const catalogEntry = this.fundCatalogRepository.getByCode(code);
    return catalogEntry ? this.catalogEntryToSearchResult(catalogEntry) : null;
  };

  private normalizeCode = (code: string): string => {
    const normalizedCode = code.trim();

    if (!/^\d{6}$/.test(normalizedCode)) {
      throw new Error("基金代码必须是 6 位数字");
    }

    return normalizedCode;
  };

  private toAsset = (result: FundSearchResult): AssetSummary => ({
    id: `fund-cn-${result.code}`,
    symbol: result.code,
    name: result.name,
    assetType: "fund",
    market: "基金",
    exchange: "东方财富基金",
    currency: "CNY",
    universe: "global",
    level: "instrument",
    parentId: "market-cn-mutual-fund",
    dataSource: "eastmoney",
    vendorSymbol: result.code,
    tags: [
      "场外基金",
      "用户导入",
      ...this.optionalTag(result.fundType),
      ...this.optionalTag(result.company),
      ...result.managers.map((manager) => `基金经理:${manager}`),
      ...result.themes
    ]
  });

  private optionalTag = (value: string | null): string[] => (value ? [value] : []);

  private catalogEntryToSearchResult = (entry: FundCatalogEntry): FundSearchResult => ({
    code: entry.code,
    name: entry.name,
    fundType: entry.fundType,
    company: null,
    managers: [],
    latestNav: null,
    latestNavDate: null,
    themes: [],
    canBuy: false
  });

  private getImportedMetrics = (assetIds: string[]): Map<string, ImportedFundCatalogMetrics> => {
    const metricsByAssetId = new Map<string, ImportedFundCatalogMetrics>();

    for (const assetId of assetIds) {
      const bars = this.marketDataRepository.listBars(assetId, "1d", this.historyLimit);
      const latestBar = bars.at(-1) ?? null;

      metricsByAssetId.set(assetId, {
        dataPointCount: bars.length,
        latestNav: latestBar?.close ?? null,
        latestNavDate: latestBar ? new Date(latestBar.ts).toISOString().slice(0, 10) : null,
        latestBarAt: toIsoDateTime(latestBar?.ts ?? null),
        return1d: this.getPreviousBarReturn(bars),
        return1m: this.getCalendarReturn(bars, 30),
        return3m: this.getCalendarReturn(bars, 90),
        return6m: this.getCalendarReturn(bars, 180),
        return1y: this.getCalendarReturn(bars, 365)
      });
    }

    return metricsByAssetId;
  };

  private toCatalogPageItem = (entry: FundCatalogPageRecord, metrics?: ImportedFundCatalogMetrics): FundCatalogPageItem => ({
    ...entry,
    isImported: Boolean(entry.assetId),
    metricSource: metrics ? "local_bars" : entry.metricUpdatedAt ? "catalog_snapshot" : null,
    dataPointCount: metrics?.dataPointCount ?? 0,
    latestNav: metrics?.latestNav ?? entry.latestNav ?? null,
    latestNavDate: metrics?.latestNavDate ?? entry.latestNavDate ?? null,
    latestBarAt: metrics?.latestBarAt ?? null,
    return1d: metrics?.return1d ?? entry.return1d ?? null,
    return1m: metrics?.return1m ?? entry.return1m ?? null,
    return3m: metrics?.return3m ?? entry.return3m ?? null,
    return6m: metrics?.return6m ?? entry.return6m ?? null,
    return1y: metrics?.return1y ?? entry.return1y ?? null
  });

  private getPreviousBarReturn = (bars: OhlcvBar[]): number | null => {
    const latestBar = bars.at(-1);
    const previousBar = bars.at(-2);

    if (!latestBar || !previousBar || previousBar.close === 0) {
      return null;
    }

    return ((latestBar.close - previousBar.close) / previousBar.close) * 100;
  };

  private getCalendarReturn = (bars: OhlcvBar[], days: number): number | null => {
    const latestBar = bars.at(-1);

    if (!latestBar) {
      return null;
    }

    const targetTs = latestBar.ts - days * dayMs;
    const baseBar = bars.find((bar) => bar.ts >= targetTs) ?? null;

    if (!baseBar || baseBar.ts === latestBar.ts || baseBar.close === 0) {
      return null;
    }

    return ((latestBar.close - baseBar.close) / baseBar.close) * 100;
  };
}
