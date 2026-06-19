import type { AssetDetailResponse, AssetDirectoryAssetTypeFilter, AssetDirectoryCategoryId, AssetDirectoryDataStateFilter, AssetDirectoryPageResponse, AssetDirectorySortKey, AssetDirectorySortOrder, AssetDirectoryStatusFilter, AssetDirectoryValuationStatusFilter, ChartWallDataQualityFilter, ChartWallResponse, ChartWallValuationStatusFilter, CompareResponse, DataHealthResponse, FundCatalogDataStateFilter, FundCatalogImportStatus, FundCatalogPageResponse, FundCatalogSortKey, FundCatalogSummaryResponse, FundImportResponse, FundSearchResponse, ScannerEventsResponse, SortOrder, TaskCenterResponse, UniverseTreeResponse, WatchlistsResponse } from "@gold-insights/market-domain";
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
  keyword: string;
  universe: string;
  level: string;
  market: string;
  assetType: string;
  sort: string;
  order: ChartWallSortOrder;
  signal: string;
  tag: string;
  dataQuality: ChartWallDataQualityFilter;
  valuationStatus: ChartWallValuationStatusFilter;
  includeValuations?: boolean;
  limit: number;
  offset: number;
};

export type CompareData = CompareResponse;
export type AssetDetailData = AssetDetailResponse;
export type FundSearchData = FundSearchResponse;
export type FundImportData = FundImportResponse;
export type FundCatalogPageData = FundCatalogPageResponse;
export type AssetDirectoryPageData = AssetDirectoryPageResponse;
export type TaskCenterData = TaskCenterResponse;
export type FundCatalogPageFilters = {
  keyword: string;
  fundType: string;
  status: FundCatalogImportStatus;
  dataState: FundCatalogDataStateFilter;
  sort: FundCatalogSortKey;
  order: SortOrder;
  limit: number;
  offset: number;
};

export type AssetDirectoryPageFilters = {
  categoryId: AssetDirectoryCategoryId;
  keyword: string;
  market: string;
  assetType: AssetDirectoryAssetTypeFilter;
  dataState: AssetDirectoryDataStateFilter;
  valuationStatus: AssetDirectoryValuationStatusFilter;
  status: AssetDirectoryStatusFilter;
  sort: AssetDirectorySortKey;
  order: AssetDirectorySortOrder;
  limit: number;
  offset: number;
};
