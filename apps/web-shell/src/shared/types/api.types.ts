import type { ChartWallResponse, CompareResponse, DataHealthResponse, FundCatalogSummaryResponse, FundImportResponse, FundSearchResponse, ScannerEventsResponse, UniverseTreeResponse, WatchlistsResponse } from "@gold-insights/market-domain";
import type { ChartWallSortOrder } from "@gold-insights/market-domain";

export type ChartWallPageData = {
  chartWall: ChartWallResponse;
  dataHealth: DataHealthResponse;
  universeTree: UniverseTreeResponse;
  scannerEvents: ScannerEventsResponse;
  watchlists: WatchlistsResponse;
  fundCatalog: FundCatalogSummaryResponse;
};

export type ChartWallFilters = {
  range: string;
  timeframe: string;
  universe: string;
  level: string;
  market: string;
  assetType: string;
  sort: string;
  order: ChartWallSortOrder;
  signal: string;
};

export type CompareData = CompareResponse;
export type FundSearchData = FundSearchResponse;
export type FundImportData = FundImportResponse;
