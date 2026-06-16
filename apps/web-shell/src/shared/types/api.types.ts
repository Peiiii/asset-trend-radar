import type { ChartWallResponse, CompareResponse, DataHealthResponse, ScannerEventsResponse, UniverseTreeResponse, WatchlistsResponse } from "@gold-insights/market-domain";

export type ChartWallPageData = {
  chartWall: ChartWallResponse;
  dataHealth: DataHealthResponse;
  universeTree: UniverseTreeResponse;
  scannerEvents: ScannerEventsResponse;
  watchlists: WatchlistsResponse;
};

export type ChartWallFilters = {
  range: string;
  timeframe: string;
  universe: string;
  level: string;
  market: string;
  assetType: string;
  sort: string;
  signal: string;
};

export type CompareData = CompareResponse;
