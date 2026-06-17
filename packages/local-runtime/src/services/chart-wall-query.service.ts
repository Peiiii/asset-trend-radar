import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SqliteAssetRepository, SqliteIngestionJobRepository, SqliteMarketDataRepository, SqliteScannerEventRepository, SqliteWatchlistRepository } from "@gold-insights/data-storage";
import { calculateIndicators } from "@gold-insights/indicator-engine";
import type {
  AssetBarsResponse,
  AssetDetailResponse,
  AssetSummary,
  ChartWallFundScope,
  ChartWallFacets,
  ChartWallItem,
  ChartWallResponse,
  ChartWallSummary,
  CompareResponse,
  DataHealthResponse,
  IndicatorPoint,
  OhlcvBar,
  ScannerEventsResponse,
  SparklinePoint,
  Timeframe,
  UniverseTreeNode,
  UniverseTreeResponse,
  WatchlistsResponse
} from "@gold-insights/market-domain";
import { filterByCalendarRange, getRangeFetchLimit, toIsoDateTime } from "@gold-insights/market-domain";
import { getBreakoutState, getMacdState, getReturnPct, getTrendScore } from "@gold-insights/scanner-engine";
import type { AssetBarsQuery, ChartWallQuery, CompareQuery, ScannerEventsQuery } from "../types/chart-wall-query.types";
import type { LocalRuntimeOptions } from "../types/local-runtime-options.types";
import { ChartWallFacetBuilderService } from "./chart-wall-facet-builder.service";
import { ChartWallItemFilterService } from "./chart-wall/chart-wall-item-filter.service";
import { ChartWallItemSorter } from "./chart-wall-item-sorter.service";
import type { ChartWallValuationService } from "./chart-wall-valuation.service";

type RangedSeries = {
  bars: OhlcvBar[];
  indicators: IndicatorPoint[];
  workingBars: OhlcvBar[];
};

export class ChartWallQueryService {
  private readonly itemSorter = new ChartWallItemSorter();
  private readonly facetBuilder = new ChartWallFacetBuilderService();
  private readonly itemFilter = new ChartWallItemFilterService();

  public constructor(
    private readonly options: LocalRuntimeOptions,
    private readonly assetRepository: SqliteAssetRepository,
    private readonly marketDataRepository: SqliteMarketDataRepository,
    private readonly scannerEventRepository: SqliteScannerEventRepository,
    private readonly ingestionJobRepository: SqliteIngestionJobRepository,
    private readonly watchlistRepository: SqliteWatchlistRepository,
    private readonly valuationService: ChartWallValuationService
  ) {}

  public getChartWall = async (query: ChartWallQuery): Promise<ChartWallResponse> => {
    const marketDataAssets = this.assetRepository.listAssets().filter((asset) => this.isMarketDataAsset(asset));
    const watchlistAssetIds = new Set(this.watchlistRepository.listWatchlists().flatMap((watchlist) => watchlist.assets.map((asset) => asset.id)));
    const comparedAssetIds = new Set<string>();
    const itemByAssetId = new Map<string, ChartWallItem>();
    const toChartWallItem = (asset: AssetSummary): ChartWallItem => {
      const cachedItem = itemByAssetId.get(asset.id);

      if (cachedItem) {
        return cachedItem;
      }

      const item = this.getChartWallItem(asset, query, watchlistAssetIds, comparedAssetIds);
      itemByAssetId.set(asset.id, item);
      return item;
    };
    const toPricedItems = (assets: AssetSummary[]): ChartWallItem[] => assets.map(toChartWallItem).filter((item) => item.lastPrice !== null);
    const matchedAssets = marketDataAssets.filter((asset) => this.matchesChartWallQuery(asset, query));
    const matchedItems = toPricedItems(matchedAssets);
    const signalFilteredItems = this.facetBuilder.applySignalFilter(matchedItems, query.signal);
    const dataQualityFilteredItems = this.itemFilter.filterByDataQuality(signalFilteredItems, query.dataQuality);
    const valuationEnrichedItems = await this.valuationService.enrichForSort(dataQualityFilteredItems, query.sort, query.includeValuations || query.valuationStatus !== "all");
    const valuationFilteredItems = this.itemFilter.filterByValuationStatus(valuationEnrichedItems, query.valuationStatus);
    const items = this.itemSorter.sort(valuationFilteredItems, query.sort, query.order);

    return {
      universe: query.universe,
      level: query.level,
      timeframe: query.timeframe,
      range: query.range,
      sort: query.sort,
      order: query.order,
      signal: query.signal,
      tag: query.tag,
      dataQuality: query.dataQuality,
      valuationStatus: query.valuationStatus,
      generatedAt: new Date().toISOString(),
      sources: [...new Set(items.map((item) => item.source))],
      summary: this.getChartWallSummary(items, marketDataAssets.length),
      facets: this.getContextualFacets(marketDataAssets, query, toPricedItems, {
        matchedItems,
        signalFilteredItems,
        dataQualityFilteredItems: valuationEnrichedItems
      }),
      fundScope: this.getFundScope(query, items, marketDataAssets),
      items
    };
  };

  public getAssetBars = (query: AssetBarsQuery): AssetBarsResponse | null => {
    const asset = this.assetRepository.listAssets().find((candidate) => candidate.id === query.assetId);

    if (!asset) {
      return null;
    }

    const series = this.getRangedSeries(asset.id, query.timeframe, query.range);

    return {
      asset,
      timeframe: query.timeframe,
      range: query.range,
      generatedAt: new Date().toISOString(),
      source: asset.dataSource ?? "unknown",
      bars: series.bars,
      indicators: series.indicators,
      events: this.scannerEventRepository.listEventsForAsset(asset.id)
    };
  };

  public getAssetDetail = async (query: AssetBarsQuery): Promise<AssetDetailResponse | null> => {
    const asset = this.assetRepository.getAsset(query.assetId);

    if (!asset) {
      return null;
    }

    const pinnedIds = new Set(this.watchlistRepository.listWatchlists().flatMap((watchlist) => watchlist.assets.map((watchlistAsset) => watchlistAsset.id)));
    const detailQuery = {
      range: query.range,
      timeframe: query.timeframe,
      universe: "global",
      level: "all",
      market: "all",
      assetType: "all",
      sort: "trend_score",
      order: "desc" as const,
      signal: "all",
      tag: "all",
      dataQuality: "all" as const,
      valuationStatus: "all" as const,
      includeValuations: true
    };
    const item = this.getChartWallItem(asset, detailQuery, pinnedIds, new Set());
    const [valuationEnrichedItem] = await this.valuationService.enrichForSort([item], "trend_score", true);

    return {
      generatedAt: new Date().toISOString(),
      timeframe: query.timeframe,
      range: query.range,
      item: valuationEnrichedItem ?? item
    };
  };

  public getDataHealth = (): DataHealthResponse => {
    const latestJob = this.ingestionJobRepository.getLatestJobForDataset("multi-source", "global-bars-1d");
    const latestFinishedJob = this.ingestionJobRepository.getLatestFinishedJobForDataset("multi-source", "global-bars-1d");

    return {
      databasePath: this.options.databasePath,
      rawDataPath: this.options.rawDataPath,
      assetCount: this.assetRepository.listAssets().length,
      barCount: this.marketDataRepository.countBars(),
      rawFileCount: this.countRawFiles(),
      databaseSizeBytes: this.getFileSize(this.options.databasePath),
      latestBarAt: toIsoDateTime(this.marketDataRepository.latestBarTimestamp()),
      lastIngestionAt: toIsoDateTime(latestFinishedJob?.finishedAt ?? null),
      barsByTimeframe: this.marketDataRepository.countBarsByTimeframe(),
      barsBySource: this.marketDataRepository.countBarsBySource(),
      latestJob: latestJob
        ? {
            id: latestJob.id,
            vendor: latestJob.vendor,
            dataset: latestJob.dataset,
            status: latestJob.status,
            startedAt: toIsoDateTime(latestJob.startedAt),
            finishedAt: toIsoDateTime(latestJob.finishedAt),
            errorMessage: latestJob.errorMessage
          }
        : null,
      providers: this.getProviderHealth()
    };
  };

  public getUniverseTree = (): UniverseTreeResponse => {
    const assets = this.assetRepository.listAssets();
    const nodeAssets = assets.filter((asset) => asset.level === "asset-class" || asset.level === "market");
    return {
      generatedAt: new Date().toISOString(),
      nodes: nodeAssets.filter((asset) => asset.parentId === null).map((asset) => this.toUniverseTreeNode(asset, assets))
    };
  };

  public getScannerEvents = (query: ScannerEventsQuery): ScannerEventsResponse => {
    const assets = this.assetRepository.listAssets();
    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
    const events = this.scannerEventRepository
      .listEvents()
      .filter((event) => query.eventType === "all" || event.eventType === query.eventType)
      .filter((event) => {
        const asset = assetMap.get(event.assetId);
        return query.universe === "global" || asset?.market === query.universe || asset?.parentId === query.universe;
      })
      .map((event) => ({
        ...event,
        asset: assetMap.get(event.assetId) ?? null
      }));

    return {
      generatedAt: new Date().toISOString(),
      events
    };
  };

  public getCompare = (query: CompareQuery): CompareResponse => {
    const assets = query.assetIds
      .map((assetId) => this.assetRepository.getAsset(assetId))
      .filter((asset): asset is AssetSummary => Boolean(asset))
      .map((asset) => {
        const series = this.getRangedSeries(asset.id, query.timeframe, query.range);
        return {
          asset,
          bars: series.bars,
          indicators: series.indicators
        };
      });

    return {
      generatedAt: new Date().toISOString(),
      timeframe: query.timeframe,
      range: query.range,
      assets
    };
  };

  public getWatchlists = (): WatchlistsResponse => ({
    generatedAt: new Date().toISOString(),
    watchlists: this.watchlistRepository.listWatchlists()
  });

  public createWatchlist = (name: string): WatchlistsResponse => {
    this.watchlistRepository.createWatchlist(name);
    return this.getWatchlists();
  };

  public addWatchlistAsset = (watchlistId: string, assetId: string): WatchlistsResponse => {
    this.watchlistRepository.addAsset(watchlistId, assetId);
    return this.getWatchlists();
  };

  public removeWatchlistAsset = (watchlistId: string, assetId: string): WatchlistsResponse => {
    this.watchlistRepository.removeAsset(watchlistId, assetId);
    return this.getWatchlists();
  };

  private getChartWallItem = (asset: AssetSummary, query: ChartWallQuery, pinnedIds: Set<string>, comparedIds: Set<string>): ChartWallItem => {
    const series = this.getRangedSeries(asset.id, query.timeframe, query.range);
    const bars = series.bars;
    const indicators = series.indicators;
    const dailyBars = this.marketDataRepository.listBars(asset.id, "1d", 1300);
    const signalBars = dailyBars.length > 0 ? dailyBars : series.workingBars;
    const latest = bars.at(-1);
    const latestIndicator = indicators.at(-1);
    const trendScore = getTrendScore(signalBars);
    const volumeStats = this.getVolumeStats(signalBars);

    return {
      ...asset,
      lastPrice: latest?.close ?? null,
      returnPct: this.getVisibleRangeReturnPct(bars),
      return1d: getReturnPct(dailyBars, 1),
      return1w: this.getCalendarRangeReturnPct(dailyBars, "1w"),
      return1m: this.getCalendarRangeReturnPct(dailyBars, "1m"),
      return3m: this.getCalendarRangeReturnPct(dailyBars, "3m"),
      return6m: this.getCalendarRangeReturnPct(dailyBars, "6m"),
      return1y: this.getCalendarRangeReturnPct(dailyBars, "1y"),
      trendScore,
      trendLabel: this.getTrendLabel(trendScore),
      macdState: getMacdState(indicators),
      breakoutState: getBreakoutState(signalBars),
      source: latest?.source ?? asset.dataSource ?? "unknown",
      latestVolume: volumeStats.latestVolume,
      averageVolume20: volumeStats.averageVolume20,
      volumeRatio: volumeStats.volumeRatio,
      drawdownPct: this.getDrawdownPct(bars),
      ma20: latestIndicator?.ma20 ?? null,
      ma50: latestIndicator?.ma50 ?? null,
      ma200: latestIndicator?.ma200 ?? null,
      macdDif: latestIndicator?.macdDif ?? null,
      macdDea: latestIndicator?.macdDea ?? null,
      macdHist: latestIndicator?.macdHist ?? null,
      rsi14: latestIndicator?.rsi14 ?? null,
      dataPointCount: bars.length,
      firstBarAt: toIsoDateTime(bars[0]?.ts ?? null),
      latestBarAt: toIsoDateTime(latest?.ts ?? null),
      valuation: this.valuationService.empty(),
      sparkline: this.toSparkline(bars),
      indicators,
      events: this.scannerEventRepository.listEventsForAsset(asset.id),
      isPinned: pinnedIds.has(asset.id),
      isCompared: comparedIds.has(asset.id)
    };
  };

  private toSparkline = (bars: OhlcvBar[]): SparklinePoint[] =>
    bars.map((bar) => ({
      t: bar.ts,
      o: bar.open,
      h: bar.high,
      l: bar.low,
      c: bar.close,
      v: bar.volume
    }));

  private getVolumeStats = (bars: OhlcvBar[]): { latestVolume: number | null; averageVolume20: number | null; volumeRatio: number | null } => {
    const latestVolume = bars.at(-1)?.volume ?? null;
    const previousVolumes = bars
      .slice(-21, -1)
      .map((bar) => bar.volume)
      .filter((volume) => volume > 0);
    const averageVolume20 = previousVolumes.length > 0 ? previousVolumes.reduce((sum, volume) => sum + volume, 0) / previousVolumes.length : null;

    return {
      latestVolume,
      averageVolume20,
      volumeRatio: latestVolume !== null && averageVolume20 !== null && averageVolume20 > 0 ? latestVolume / averageVolume20 : null
    };
  };

  private getDrawdownPct = (bars: OhlcvBar[]): number | null => {
    const latest = bars.at(-1);

    if (!latest) {
      return null;
    }

    const highestHigh = Math.max(...bars.map((bar) => bar.high));

    if (!Number.isFinite(highestHigh) || highestHigh === 0) {
      return null;
    }

    return ((latest.close - highestHigh) / highestHigh) * 100;
  };

  private getVisibleRangeReturnPct = (bars: OhlcvBar[]): number | null => {
    const first = bars[0];
    const latest = bars.at(-1);

    if (!first || !latest || first.close === 0 || first.ts === latest.ts) {
      return null;
    }

    return ((latest.close - first.close) / first.close) * 100;
  };

  private getCalendarRangeReturnPct = (bars: OhlcvBar[], range: string): number | null => this.getVisibleRangeReturnPct(filterByCalendarRange(bars, range));

  private getChartWallSummary = (items: ChartWallItem[], totalUniverseAssets: number): ChartWallSummary => {
    const latestTs = Math.max(
      ...items
        .map((item) => (item.latestBarAt ? new Date(item.latestBarAt).getTime() : NaN))
        .filter((timestamp) => Number.isFinite(timestamp))
    );

    return {
      totalUniverseAssets,
      visibleItems: items.length,
      positiveItems: items.filter((item) => (item.returnPct ?? 0) > 0).length,
      negativeItems: items.filter((item) => (item.returnPct ?? 0) < 0).length,
      strongTrendItems: items.filter((item) => item.trendScore >= 30).length,
      weakTrendItems: items.filter((item) => item.trendScore <= -10).length,
      eventfulItems: items.filter((item) => item.events.length > 0).length,
      pinnedItems: items.filter((item) => item.isPinned).length,
      comparedItems: items.filter((item) => item.isCompared).length,
      averageReturnPct: this.average(items.map((item) => item.returnPct)),
      averageTrendScore: this.average(items.map((item) => item.trendScore)),
      averageVolumeRatio: this.average(items.map((item) => item.volumeRatio)),
      latestBarAt: Number.isFinite(latestTs) ? new Date(latestTs).toISOString() : null
    };
  };

  private getFundScope = (query: ChartWallQuery, items: ChartWallItem[], marketDataAssets: AssetSummary[]): ChartWallFundScope | null => {
    if (query.assetType !== "fund") {
      return null;
    }

    const allFundAssets = marketDataAssets.filter((asset) => asset.assetType === "fund");

    return {
      currentCount: items.filter((item) => item.assetType === "fund").length,
      allFundCount: allFundAssets.length,
      eastmoneyFundCount: allFundAssets.filter((asset) => asset.dataSource === "eastmoney").length,
      isMutualFundMarket: query.market === "基金",
      seedAndImportedOnly: true
    };
  };

  private average = (values: Array<number | null | undefined>): number | null => {
    const finiteValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return finiteValues.length > 0 ? finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length : null;
  };

  private getTrendLabel = (trendScore: number): string => {
    if (trendScore >= 30) {
      return "强趋势";
    }

    if (trendScore >= 10) {
      return "转强";
    }

    if (trendScore <= -30) {
      return "明显转弱";
    }

    if (trendScore <= -10) {
      return "偏弱";
    }

    return "震荡";
  };

  private getRangedSeries = (assetId: string, timeframe: Timeframe, range: string): RangedSeries => {
    const workingBars = this.listWorkingBarsForTimeframe(assetId, timeframe, range);
    const bars = filterByCalendarRange(workingBars, range);
    const visibleTimestamps = new Set(bars.map((bar) => bar.ts));
    const indicators =
      timeframe === "1d"
        ? this.marketDataRepository.listIndicators(assetId, timeframe, getRangeFetchLimit(range, timeframe)).filter((indicator) => visibleTimestamps.has(indicator.ts))
        : calculateIndicators(workingBars).filter((indicator) => visibleTimestamps.has(indicator.ts));

    return {
      bars,
      indicators,
      workingBars
    };
  };

  private listWorkingBarsForTimeframe = (assetId: string, timeframe: Timeframe, range: string): OhlcvBar[] => {
    const limit = getRangeFetchLimit(range, timeframe);

    if (timeframe === "1d") {
      return this.marketDataRepository.listBars(assetId, "1d", limit);
    }

    const dailyLimit = timeframe === "1w" ? limit * 8 : timeframe === "1mo" ? limit * 32 : limit;
    const dailyBars = this.marketDataRepository.listBars(assetId, "1d", dailyLimit);

    if (timeframe === "1w") {
      return this.resampleBars(dailyBars, "1w", (bar) => {
        const date = new Date(bar.ts);
        const firstDay = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        return `${date.getUTCFullYear()}-${Math.floor((bar.ts - firstDay.getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
      });
    }

    if (timeframe === "1mo") {
      return this.resampleBars(dailyBars, "1mo", (bar) => {
        const date = new Date(bar.ts);
        return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
      });
    }

    return this.marketDataRepository.listBars(assetId, timeframe, limit);
  };

  private resampleBars = (bars: OhlcvBar[], timeframe: Timeframe, getKey: (bar: OhlcvBar) => string): OhlcvBar[] => {
    const groups = new Map<string, OhlcvBar[]>();

    for (const bar of bars) {
      const key = getKey(bar);
      groups.set(key, [...(groups.get(key) ?? []), bar]);
    }

    return [...groups.values()]
      .map((group) => ({
        assetId: group[0].assetId,
        timeframe,
        ts: group[0].ts,
        open: group[0].open,
        high: Math.max(...group.map((bar) => bar.high)),
        low: Math.min(...group.map((bar) => bar.low)),
        close: group.at(-1)?.close ?? group[0].close,
        volume: group.reduce((sum, bar) => sum + bar.volume, 0),
        amount: group.reduce((sum, bar) => sum + bar.amount, 0),
        source: group[0].source
      }))
      .sort((left, right) => left.ts - right.ts);
  };

  private isMarketDataAsset = (asset: AssetSummary): boolean => asset.level !== "asset-class" && asset.level !== "market";

  private getContextualFacets = (marketDataAssets: AssetSummary[], query: ChartWallQuery, toPricedItems: (assets: AssetSummary[]) => ChartWallItem[], context: { matchedItems: ChartWallItem[]; signalFilteredItems: ChartWallItem[]; dataQualityFilteredItems: ChartWallItem[] }): ChartWallFacets => {
    const signalItems = context.matchedItems;
    const globalItems = this.facetBuilder.applySignalFilter(toPricedItems(marketDataAssets), query.signal);

    return {
      markets: this.facetBuilder.buildMarketFacets(globalItems),
      assetTypes: this.facetBuilder.buildAssetTypeFacets(globalItems),
      levels: this.facetBuilder.buildLevelFacets(globalItems),
      tags: this.facetBuilder.buildTagFacets(globalItems),
      sources: this.facetBuilder.buildSourceFacets(globalItems),
      signals: this.facetBuilder.buildSignalFacets(signalItems),
      dataQualities: this.facetBuilder.buildDataQualityFacets(context.signalFilteredItems),
      valuationStatuses: this.facetBuilder.buildValuationStatusFacets(context.dataQualityFilteredItems)
    };
  };

  private matchesChartWallUniverseQuery = (asset: AssetSummary, query: ChartWallQuery): boolean =>
    query.universe === "global" || asset.market === query.universe || asset.parentId === query.universe;

  private matchesChartWallQuery = (asset: AssetSummary, query: ChartWallQuery): boolean => {
    if (!this.matchesChartWallUniverseQuery(asset, query)) {
      return false;
    }

    if (query.level !== "all" && asset.level !== query.level) {
      return false;
    }

    if (query.market !== "all" && asset.market !== query.market) {
      return false;
    }

    if (query.assetType !== "all" && asset.assetType !== query.assetType) {
      return false;
    }

    if (query.tag !== "all" && !(asset.tags ?? []).includes(query.tag)) {
      return false;
    }

    return true;
  };

  private toUniverseTreeNode = (asset: AssetSummary, allAssets: AssetSummary[]): UniverseTreeNode => {
    const childrenAssets = allAssets.filter((candidate) => candidate.parentId === asset.id);
    const marketDataAssets = allAssets.filter((candidate) => this.isMarketDataAsset(candidate) && this.isDescendantOf(candidate, asset.id, allAssets));

    return {
      id: asset.id,
      label: asset.name,
      parentId: asset.parentId ?? null,
      level: asset.level ?? "instrument",
      count: marketDataAssets.length,
      assets: marketDataAssets,
      children: childrenAssets.filter((candidate) => candidate.level === "market" || candidate.level === "asset-class").map((child) => this.toUniverseTreeNode(child, allAssets))
    };
  };

  private isDescendantOf = (asset: AssetSummary, ancestorId: string, allAssets: AssetSummary[]): boolean => {
    let cursor = asset.parentId;

    while (cursor) {
      if (cursor === ancestorId) {
        return true;
      }

      cursor = allAssets.find((candidate) => candidate.id === cursor)?.parentId;
    }

    return false;
  };

  private countRawFiles = (): number => {
    if (!existsSync(this.options.rawDataPath)) {
      return 0;
    }

    const countFiles = (directory: string): number =>
      readdirSync(directory, { withFileTypes: true }).reduce((count, entry) => {
        const entryPath = join(directory, entry.name);
        return count + (entry.isDirectory() ? countFiles(entryPath) : 1);
      }, 0);

    return countFiles(this.options.rawDataPath);
  };

  private getFileSize = (filePath: string): number => (existsSync(filePath) ? statSync(filePath).size : 0);

  private getProviderHealth = (): DataHealthResponse["providers"] => {
    const assets = this.assetRepository.listAssets().filter((asset) => this.isMarketDataAsset(asset));
    return ["yahoo", "eastmoney", "binance", "fred"].map((id) => ({
      id,
      label: id === "yahoo" ? "Yahoo Finance" : id === "eastmoney" ? "东方财富基金" : id === "binance" ? "Binance" : "FRED",
      status: id === "fred" ? "reserved" : "active",
      assetCount: assets.filter((asset) => asset.dataSource === id).length
    }));
  };
}
