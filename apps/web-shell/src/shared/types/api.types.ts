import type { AssetDetailResponse, ChartWallResponse, CompareResponse, DataHealthResponse, FundCatalogImportStatus, FundCatalogPageResponse, FundCatalogSummaryResponse, FundImportResponse, FundSearchResponse, ScannerEventsResponse, UniverseTreeResponse, WatchlistsResponse } from "@gold-insights/market-domain";
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
export type AssetDetailData = AssetDetailResponse;
export type FundSearchData = FundSearchResponse;
export type FundImportData = FundImportResponse;
export type FundCatalogPageData = FundCatalogPageResponse;
export type FundCatalogPageFilters = {
  keyword: string;
  fundType: string;
  status: FundCatalogImportStatus;
  limit: number;
  offset: number;
};
