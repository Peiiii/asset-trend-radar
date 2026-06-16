import { EastmoneyFundCatalogProvider, EastmoneyFundDataProvider, EastmoneyFundSearchProvider } from "@gold-insights/data-adapters";
import type { LocalRawFileRepository, SqliteAssetRepository, SqliteFundCatalogRepository, SqliteMarketDataRepository, SqliteScannerEventRepository } from "@gold-insights/data-storage";
import { calculateIndicators } from "@gold-insights/indicator-engine";
import type { AssetSummary, FundCatalogEntry, FundCatalogSummaryResponse, FundCatalogSyncResponse, FundImportResponse, FundSearchResponse, FundSearchResult } from "@gold-insights/market-domain";
import { toIsoDateTime } from "@gold-insights/market-domain";
import { ScannerEngineManager } from "@gold-insights/scanner-engine";

export class FundDiscoveryService {
  public constructor(
    private readonly historyLimit: number,
    private readonly assetRepository: SqliteAssetRepository,
    private readonly marketDataRepository: SqliteMarketDataRepository,
    private readonly scannerEventRepository: SqliteScannerEventRepository,
    private readonly fundCatalogRepository: SqliteFundCatalogRepository,
    private readonly rawFileRepository: LocalRawFileRepository,
    private readonly catalogProvider = new EastmoneyFundCatalogProvider(),
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

  public syncCatalog = async (): Promise<FundCatalogSyncResponse> => {
    const entries = await this.catalogProvider.fetchCatalog();
    const insertedOrUpdated = this.fundCatalogRepository.upsertEntries(entries);

    return {
      generatedAt: new Date().toISOString(),
      summary: this.fundCatalogRepository.getSummary(),
      insertedOrUpdated
    };
  };

  public syncCatalogIfEmpty = async (): Promise<void> => {
    if (this.fundCatalogRepository.getSummary().totalCount > 0) {
      return;
    }

    await this.syncCatalog();
  };

  public importEastmoneyFund = async (code: string): Promise<FundImportResponse> => {
    const normalizedCode = this.normalizeCode(code);
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
}
