import type { AssetDirectoryAssetTypeFilter, AssetDirectoryCategory, AssetDirectoryCategoryId, AssetDirectoryDataStateFilter, AssetDirectoryImportResponse, AssetDirectoryPageResponse, AssetDirectorySortKey, AssetDirectorySortOrder, AssetDirectoryStatusFilter, AssetDirectoryValuationStatusFilter } from "@gold-insights/market-domain";

export type AssetDirectoryQuery = {
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

export type AssetDirectoryProvider = {
  readonly categoryId: AssetDirectoryCategoryId;
  getCategory(): Promise<AssetDirectoryCategory> | AssetDirectoryCategory;
  listItems(query: AssetDirectoryQuery): Promise<AssetDirectoryPageResponse> | AssetDirectoryPageResponse;
  importItem?(itemId: string): Promise<AssetDirectoryImportResponse> | AssetDirectoryImportResponse;
};
