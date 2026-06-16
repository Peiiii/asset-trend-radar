import type { AssetSummary } from "./asset.types";

export type FundSearchResult = {
  code: string;
  name: string;
  fundType: string | null;
  company: string | null;
  managers: string[];
  latestNav: number | null;
  latestNavDate: string | null;
  themes: string[];
  canBuy: boolean;
};

export type FundCatalogEntry = {
  code: string;
  name: string;
  fundType: string | null;
  pinyin: string | null;
  fullPinyin: string | null;
  source: "eastmoney";
  updatedAt: number;
};

export type FundCatalogMetricSnapshot = {
  code: string;
  latestNav: number | null;
  accumulatedNav: number | null;
  latestNavDate: string | null;
  return1d: number | null;
  return1w: number | null;
  return1m: number | null;
  return3m: number | null;
  return6m: number | null;
  return1y: number | null;
  returnYtd: number | null;
  metricUpdatedAt: number;
};

export type FundCatalogImportStatus = "all" | "imported" | "not_imported";

export type FundCatalogPageItem = FundCatalogEntry & {
  assetId: string | null;
  isImported: boolean;
  metricSource: "local_bars" | "catalog_snapshot" | null;
  dataPointCount: number;
  latestNav: number | null;
  latestNavDate: string | null;
  latestBarAt: string | null;
  return1d: number | null;
  return1m: number | null;
  return3m: number | null;
  return6m: number | null;
  return1y: number | null;
};

export type FundCatalogSummary = {
  totalCount: number;
  syncedAt: string | null;
  metricSyncedAt: string | null;
  source: "eastmoney";
};

export type FundSearchResponse = {
  generatedAt: string;
  keyword: string;
  catalog: FundCatalogSummary;
  matchedCount: number;
  source: "local-catalog" | "remote-suggest";
  results: FundSearchResult[];
};

export type FundCatalogSyncResponse = {
  generatedAt: string;
  summary: FundCatalogSummary;
  insertedOrUpdated: number;
  metricSnapshotsUpdated: number;
};

export type FundCatalogSummaryResponse = {
  generatedAt: string;
  summary: FundCatalogSummary;
};

export type FundCatalogPageResponse = {
  generatedAt: string;
  catalog: FundCatalogSummary;
  keyword: string;
  fundType: string;
  status: FundCatalogImportStatus;
  limit: number;
  offset: number;
  totalCount: number;
  importedTotalCount: number;
  items: FundCatalogPageItem[];
  fundTypes: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  statusFacets: Array<{
    value: FundCatalogImportStatus;
    label: string;
    count: number;
  }>;
};

export type FundImportResponse = {
  generatedAt: string;
  asset: AssetSummary;
  barsImported: number;
  firstBarAt: string | null;
  latestBarAt: string | null;
  source: string;
  searchResult: FundSearchResult | null;
};
