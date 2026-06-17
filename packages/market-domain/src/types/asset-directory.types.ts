import type { AssetType } from "./asset.types";

export type AssetDirectoryCategoryId = "funds" | "crypto" | "commodities" | "us-equity" | "a-share" | "hk-equity" | "macro";
export type AssetDirectoryCoverage = "full" | "partial" | "trend_pool_only";
export type AssetDirectoryCapability = "search" | "facets" | "snapshot_metrics" | "import_to_pool" | "refresh_snapshot" | "compare" | "open_detail";
export type AssetDirectoryPoolState = "in_pool" | "not_in_pool" | "syncing" | "failed";
export type AssetDirectoryDataState = "snapshot" | "full_history" | "missing" | "stale";
export type AssetDirectoryStatusFilter = "all" | "in_pool" | "not_in_pool";
export type AssetDirectorySortKey = "relevance" | "label" | "latest_value" | "return_1d" | "return_1m" | "return_3m" | "return_6m" | "return_1y" | "data_point_count";
export type AssetDirectorySortOrder = "asc" | "desc";

export type AssetDirectoryCategory = {
  id: AssetDirectoryCategoryId;
  label: string;
  description: string;
  assetTypes: AssetType[];
  markets: string[];
  coverage: AssetDirectoryCoverage;
  capabilities: AssetDirectoryCapability[];
  itemCount: number;
  inPoolCount: number;
  lastSyncedAt: string | null;
};

export type AssetDirectoryReturns = {
  return1d: number | null;
  return1m: number | null;
  return3m: number | null;
  return6m: number | null;
  return1y: number | null;
};

export type AssetDirectoryItem = {
  id: string;
  categoryId: AssetDirectoryCategoryId;
  label: string;
  symbol: string;
  market: string;
  assetType: AssetType;
  provider: string;
  exchange: string;
  currency: string;
  latestValue: number | null;
  latestValueLabel: "最新价" | "最新净值" | "最新点位";
  latestValueAt: string | null;
  returns: AssetDirectoryReturns;
  poolState: AssetDirectoryPoolState;
  dataState: AssetDirectoryDataState;
  dataPointCount: number;
  assetId: string | null;
  tags: string[];
};

export type AssetDirectoryFacet = {
  value: string;
  label: string;
  count: number;
};

export type AssetDirectoryCategoriesResponse = {
  generatedAt: string;
  categories: AssetDirectoryCategory[];
};

export type AssetDirectoryPageResponse = {
  generatedAt: string;
  category: AssetDirectoryCategory;
  keyword: string;
  status: AssetDirectoryStatusFilter;
  sort: AssetDirectorySortKey;
  order: AssetDirectorySortOrder;
  limit: number;
  offset: number;
  totalCount: number;
  items: AssetDirectoryItem[];
  facets: {
    markets: AssetDirectoryFacet[];
    assetTypes: AssetDirectoryFacet[];
    statuses: Array<AssetDirectoryFacet & { value: AssetDirectoryStatusFilter }>;
  };
};
