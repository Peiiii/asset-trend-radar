import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SqliteAssetRepository, SqliteIngestionJobRepository, SqliteMarketDataRepository, SqliteScannerEventRepository, SqliteWatchlistRepository } from "@gold-insights/data-storage";
import { calculateIndicators } from "@gold-insights/indicator-engine";
import type {
  AssetBarsResponse,
  AssetSummary,
  ChartWallFacets,
  ChartWallItem,
  ChartWallResponse,
  ChartWallSummary,
  CompareResponse,
  DataHealthResponse,
  OhlcvBar,
  ScannerEventsResponse,
  SparklinePoint,
  Timeframe,
  UniverseTreeNode,
  UniverseTreeResponse,
  WatchlistsResponse
} from "@gold-insights/market-domain";
import { getRangePointLimit, toIsoDateTime } from "@gold-insights/market-domain";
import { getBreakoutState, getMacdState, getReturnPct, getTrendScore } from "@gold-insights/scanner-engine";
import type { AssetBarsQuery, ChartWallQuery, CompareQuery, ScannerEventsQuery } from "../types/chart-wall-query.types";
import type { LocalRuntimeOptions } from "../types/local-runtime-options.types";

export class ChartWallQueryService {
  public constructor(
    private readonly options: LocalRuntimeOptions,
    private readonly assetRepository: SqliteAssetRepository,
    private readonly marketDataRepository: SqliteMarketDataRepository,
    private readonly scannerEventRepository: SqliteScannerEventRepository,
    private readonly ingestionJobRepository: SqliteIngestionJobRepository,
    private readonly watchlistRepository: SqliteWatchlistRepository
  ) {}

  public getChartWall = (query: ChartWallQuery): ChartWallResponse => {
    const limit = getRangePointLimit(query.range);
    const marketDataAssets = this.assetRepository.listAssets().filter((asset) => this.isMarketDataAsset(asset));
    const watchlistAssetIds = new Set(this.watchlistRepository.listWatchlists().flatMap((watchlist) => watchlist.assets.map((asset) => asset.id)));
    const comparedAssetIds = new Set<string>();
    const matchedItems = marketDataAssets
      .filter((asset) => this.matchesChartWallQuery(asset, query))
      .map((asset) => this.getChartWallItem(asset, query, limit, watchlistAssetIds, comparedAssetIds))
      .filter((item) => item.lastPrice !== null);
    const signalFilteredItems = this.applySignalFilter(matchedItems, query.signal);
    const items = this.sortItems(signalFilteredItems, query.sort);

    return {
      universe: query.universe,
      level: query.level,
      timeframe: query.timeframe,
      range: query.range,
      sort: query.sort,
      signal: query.signal,
      generatedAt: new Date().toISOString(),
      sources: [...new Set(items.map((item) => item.source))],
      summary: this.getChartWallSummary(items, marketDataAssets.length),
      facets: this.getChartWallFacets(matchedItems),
      items
    };
  };

  public getAssetBars = (query: AssetBarsQuery): AssetBarsResponse | null => {
    const asset = this.assetRepository.listAssets().find((candidate) => candidate.id === query.assetId);

    if (!asset) {
      return null;
    }

    const limit = getRangePointLimit(query.range);
    const bars = this.listBarsForTimeframe(asset.id, query.timeframe, limit);
    const indicators = query.timeframe === "1d" ? this.marketDataRepository.listIndicators(asset.id, query.timeframe, limit) : calculateIndicators(bars);

    return {
      asset,
      timeframe: query.timeframe,
      range: query.range,
      generatedAt: new Date().toISOString(),
      source: asset.dataSource ?? "unknown",
      bars,
      indicators,
      events: this.scannerEventRepository.listEventsForAsset(asset.id)
    };
  };

  public getDataHealth = (): DataHealthResponse => {
    const latestFinishedJob = this.ingestionJobRepository.getLatestFinishedJob();

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
      latestJob: latestFinishedJob
        ? {
            id: latestFinishedJob.id,
            vendor: latestFinishedJob.vendor,
            dataset: latestFinishedJob.dataset,
            status: latestFinishedJob.status,
            startedAt: toIsoDateTime(latestFinishedJob.startedAt),
            finishedAt: toIsoDateTime(latestFinishedJob.finishedAt),
            errorMessage: latestFinishedJob.errorMessage
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
    const limit = getRangePointLimit(query.range);
    const assets = query.assetIds
      .map((assetId) => this.assetRepository.getAsset(assetId))
      .filter((asset): asset is AssetSummary => Boolean(asset))
      .map((asset) => {
        const bars = this.listBarsForTimeframe(asset.id, query.timeframe, limit);
        return {
          asset,
          bars,
          indicators: query.timeframe === "1d" ? this.marketDataRepository.listIndicators(asset.id, query.timeframe, limit) : calculateIndicators(bars)
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

  private getChartWallItem = (asset: AssetSummary, query: ChartWallQuery, limit: number, pinnedIds: Set<string>, comparedIds: Set<string>): ChartWallItem => {
    const bars = this.listBarsForTimeframe(asset.id, query.timeframe, limit);
    const indicators = query.timeframe === "1d" ? this.marketDataRepository.listIndicators(asset.id, query.timeframe, limit) : calculateIndicators(bars);
    const dailyBars = query.timeframe === "1d" ? bars : this.marketDataRepository.listBars(asset.id, "1d", 1300);
    const latest = bars.at(-1);
    const latestIndicator = indicators.at(-1);
    const lookback = Math.max(Math.min(limit - 1, bars.length - 1), 1);
    const trendScore = getTrendScore(bars);
    const volumeStats = this.getVolumeStats(bars);

    return {
      ...asset,
      lastPrice: latest?.close ?? null,
      returnPct: getReturnPct(bars, lookback),
      return1d: getReturnPct(dailyBars, 1),
      return1w: getReturnPct(dailyBars, 5),
      return1m: getReturnPct(dailyBars, 21),
      return3m: getReturnPct(dailyBars, 63),
      return6m: getReturnPct(dailyBars, 126),
      return1y: getReturnPct(dailyBars, 252),
      trendScore,
      trendLabel: this.getTrendLabel(trendScore),
      macdState: getMacdState(indicators),
      breakoutState: getBreakoutState(bars),
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

  private getChartWallFacets = (items: ChartWallItem[]): ChartWallFacets => ({
    markets: this.toFacetCounts(items, (item) => item.market),
    assetTypes: this.toFacetCounts(items, (item) => item.assetType, (value) => this.getAssetTypeLabel(value)),
    levels: this.toFacetCounts(items, (item) => item.level ?? "instrument", (value) => this.getLevelLabel(value)),
    sources: this.toFacetCounts(items, (item) => item.source),
    signals: [
      { value: "all", label: "全部信号", count: items.length },
      { value: "strong", label: "强趋势", count: this.applySignalFilter(items, "strong").length },
      { value: "weak", label: "偏弱", count: this.applySignalFilter(items, "weak").length },
      { value: "positive", label: "区间上涨", count: this.applySignalFilter(items, "positive").length },
      { value: "negative", label: "区间下跌", count: this.applySignalFilter(items, "negative").length },
      { value: "macd_golden_cross", label: "MACD 金叉", count: this.applySignalFilter(items, "macd_golden_cross").length },
      { value: "macd_dead_cross", label: "MACD 死叉", count: this.applySignalFilter(items, "macd_dead_cross").length },
      { value: "breakout", label: "价格突破", count: this.applySignalFilter(items, "breakout").length },
      { value: "volume_breakout", label: "量能放大", count: this.applySignalFilter(items, "volume_breakout").length },
      { value: "eventful", label: "有扫描事件", count: this.applySignalFilter(items, "eventful").length },
      { value: "pinned", label: "已自选", count: this.applySignalFilter(items, "pinned").length }
    ]
  });

  private toFacetCounts = (items: ChartWallItem[], getValue: (item: ChartWallItem) => string, getLabel: (value: string) => string = (value) => value): ChartWallFacets["markets"] => {
    const counts = new Map<string, number>();

    for (const item of items) {
      const value = getValue(item);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([value, count]) => ({
        value,
        label: getLabel(value),
        count
      }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-Hans-CN"));
  };

  private applySignalFilter = (items: ChartWallItem[], signal: string): ChartWallItem[] => {
    switch (signal) {
      case "strong":
        return items.filter((item) => item.trendScore >= 30);
      case "weak":
        return items.filter((item) => item.trendScore <= -10);
      case "positive":
        return items.filter((item) => (item.returnPct ?? 0) > 0);
      case "negative":
        return items.filter((item) => (item.returnPct ?? 0) < 0);
      case "macd_golden_cross":
        return items.filter((item) => item.macdState === "bullish-cross");
      case "macd_dead_cross":
        return items.filter((item) => item.macdState === "bearish-cross");
      case "breakout":
        return items.filter((item) => item.breakoutState.startsWith("breakout"));
      case "volume_breakout":
        return items.filter((item) => (item.volumeRatio ?? 0) >= 1.5);
      case "eventful":
        return items.filter((item) => item.events.length > 0);
      case "pinned":
        return items.filter((item) => item.isPinned);
      case "all":
      default:
        return items;
    }
  };

  private average = (values: Array<number | null | undefined>): number | null => {
    const finiteValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return finiteValues.length > 0 ? finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length : null;
  };

  private getAssetTypeLabel = (assetType: string): string => {
    switch (assetType) {
      case "index":
        return "指数";
      case "fund":
        return "基金/ETF";
      case "equity":
        return "公司";
      case "commodity":
        return "商品";
      case "macro":
        return "宏观/外汇/债券";
      case "crypto":
        return "加密";
      default:
        return assetType;
    }
  };

  private getLevelLabel = (level: string): string => {
    switch (level) {
      case "broad-index":
        return "宽基";
      case "sector-index":
        return "行业";
      case "theme-basket":
        return "主题";
      case "company":
        return "公司";
      case "instrument":
        return "工具/合约";
      case "macro-indicator":
        return "宏观";
      default:
        return level;
    }
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

  private listBarsForTimeframe = (assetId: string, timeframe: Timeframe, limit: number): OhlcvBar[] => {
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
      }).slice(-limit);
    }

    if (timeframe === "1mo") {
      return this.resampleBars(dailyBars, "1mo", (bar) => {
        const date = new Date(bar.ts);
        return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
      }).slice(-limit);
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

  private matchesChartWallQuery = (asset: AssetSummary, query: ChartWallQuery): boolean => {
    if (query.universe !== "global" && asset.market !== query.universe && asset.parentId !== query.universe) {
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

    return true;
  };

  private sortItems = (items: ChartWallItem[], sort: string): ChartWallItem[] => {
    switch (sort) {
      case "return_1d":
        return this.sortByNullableNumber(items, (item) => item.return1d);
      case "return_1w":
        return this.sortByNullableNumber(items, (item) => item.return1w);
      case "return_1m":
        return this.sortByNullableNumber(items, (item) => item.return1m);
      case "return_3m":
        return this.sortByNullableNumber(items, (item) => item.return3m);
      case "return_6m":
        return this.sortByNullableNumber(items, (item) => item.return6m);
      case "return_1y":
        return this.sortByNullableNumber(items, (item) => item.return1y);
      case "return":
        return this.sortByNullableNumber(items, (item) => item.returnPct);
      case "volume_ratio":
        return this.sortByNullableNumber(items, (item) => item.volumeRatio);
      case "drawdown":
        return this.sortByNullableNumber(items, (item) => item.drawdownPct);
      case "event_count":
        return [...items].sort((left, right) => right.events.length - left.events.length || right.trendScore - left.trendScore);
      case "market":
        return [...items].sort((left, right) => left.market.localeCompare(right.market, "zh-Hans-CN") || right.trendScore - left.trendScore);
      case "asset_type":
        return [...items].sort((left, right) => left.assetType.localeCompare(right.assetType) || right.trendScore - left.trendScore);
      case "macd":
        return [...items].sort((left, right) => right.events.length - left.events.length || right.trendScore - left.trendScore);
      case "symbol":
        return [...items].sort((left, right) => left.symbol.localeCompare(right.symbol));
      case "trend_score":
      default:
        return [...items].sort((left, right) => right.trendScore - left.trendScore);
    }
  };

  private sortByNullableNumber = (items: ChartWallItem[], getValue: (item: ChartWallItem) => number | null): ChartWallItem[] =>
    [...items].sort((left, right) => (getValue(right) ?? -Infinity) - (getValue(left) ?? -Infinity) || right.trendScore - left.trendScore);

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
