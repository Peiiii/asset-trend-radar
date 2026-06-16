import type { AssetSummary } from "./asset.types";
import type { MacdState } from "./indicator.types";
import type { ScannerEvent } from "./scanner-event.types";
import type { OhlcvBar, SparklinePoint } from "./bar.types";
import type { IndicatorPoint } from "./indicator.types";

export type ChartWallItem = AssetSummary & {
  lastPrice: number | null;
  returnPct: number | null;
  return1d: number | null;
  return1w: number | null;
  return1m: number | null;
  return3m: number | null;
  return6m: number | null;
  return1y: number | null;
  trendScore: number;
  trendLabel: string;
  macdState: MacdState;
  breakoutState: string;
  source: string;
  latestVolume: number | null;
  averageVolume20: number | null;
  volumeRatio: number | null;
  drawdownPct: number | null;
  ma20: number | null;
  ma50: number | null;
  ma200: number | null;
  macdDif: number | null;
  macdDea: number | null;
  macdHist: number | null;
  rsi14: number | null;
  dataPointCount: number;
  firstBarAt: string | null;
  latestBarAt: string | null;
  sparkline: SparklinePoint[];
  indicators: IndicatorPoint[];
  events: ScannerEvent[];
  isPinned?: boolean;
  isCompared?: boolean;
};

export type ChartWallSortOrder = "asc" | "desc";

export type ChartWallFacet = {
  value: string;
  label: string;
  count: number;
};

export type ChartWallSummary = {
  totalUniverseAssets: number;
  visibleItems: number;
  positiveItems: number;
  negativeItems: number;
  strongTrendItems: number;
  weakTrendItems: number;
  eventfulItems: number;
  pinnedItems: number;
  comparedItems: number;
  averageReturnPct: number | null;
  averageTrendScore: number | null;
  averageVolumeRatio: number | null;
  latestBarAt: string | null;
};

export type ChartWallFundScope = {
  currentCount: number;
  allFundCount: number;
  eastmoneyFundCount: number;
  isMutualFundMarket: boolean;
  seedAndImportedOnly: boolean;
};

export type ChartWallFacets = {
  markets: ChartWallFacet[];
  assetTypes: ChartWallFacet[];
  levels: ChartWallFacet[];
  sources: ChartWallFacet[];
  signals: ChartWallFacet[];
};

export type ChartWallResponse = {
  universe: string;
  level: string;
  timeframe: string;
  range: string;
  sort: string;
  order: ChartWallSortOrder;
  signal: string;
  generatedAt: string;
  sources: string[];
  summary: ChartWallSummary;
  facets: ChartWallFacets;
  fundScope: ChartWallFundScope | null;
  items: ChartWallItem[];
};

export type DataHealthResponse = {
  databasePath: string;
  rawDataPath: string;
  assetCount: number;
  barCount: number;
  rawFileCount: number;
  databaseSizeBytes: number;
  latestBarAt: string | null;
  lastIngestionAt: string | null;
  barsByTimeframe: Array<{
    timeframe: string;
    count: number;
  }>;
  barsBySource: Array<{
    source: string;
    count: number;
  }>;
  latestJob: {
    id: string;
    vendor: string;
    dataset: string;
    status: string;
    startedAt: string | null;
    finishedAt: string | null;
    errorMessage: string | null;
  } | null;
  providers: Array<{
    id: string;
    label: string;
    status: string;
    assetCount: number;
  }>;
};

export type AssetBarsResponse = {
  asset: AssetSummary;
  timeframe: string;
  range: string;
  generatedAt: string;
  source: string;
  bars: OhlcvBar[];
  indicators: IndicatorPoint[];
  events: ScannerEvent[];
};

export type UniverseTreeNode = {
  id: string;
  label: string;
  parentId: string | null;
  level: string;
  count: number;
  assets: AssetSummary[];
  children: UniverseTreeNode[];
};

export type UniverseTreeResponse = {
  generatedAt: string;
  nodes: UniverseTreeNode[];
};

export type ScannerEventsResponse = {
  generatedAt: string;
  events: Array<ScannerEvent & { asset: AssetSummary | null }>;
};

export type CompareResponse = {
  generatedAt: string;
  timeframe: string;
  range: string;
  assets: Array<{
    asset: AssetSummary;
    bars: OhlcvBar[];
    indicators: IndicatorPoint[];
  }>;
};

export type WatchlistSummary = {
  id: string;
  name: string;
  assets: AssetSummary[];
};

export type WatchlistsResponse = {
  generatedAt: string;
  watchlists: WatchlistSummary[];
};
